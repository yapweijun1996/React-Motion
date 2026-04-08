/**
 * SVG Post-Generation — focused SVG markup generation as a separate pipeline stage.
 *
 * Problem: When AI generates SVG inline inside produce_script, it competes for
 * attention with JSON structure, narration, timing, and 6 other scene elements.
 * Result: bare SVG with 3-5 visual elements.
 *
 * Solution: AI outputs { type: "svg", svgPrompt: "description..." } during
 * produce_script, then this module generates high-quality SVG in a focused call.
 * Flash model + focused prompt = 40+ visual elements (tested).
 *
 * Runs after parse, before TTS in generateScript.ts pipeline.
 */

import { callGeminiRaw, type GeminiMessage } from "./gemini";
import type { VideoScript, VideoScene } from "../types";
import { loadSettings } from "./settingsStore";

// ═══════════════════════════════════════════════════════════════════
// System prompt — focused on SVG quality only, no JSON/scene concerns
// ═══════════════════════════════════════════════════════════════════

const SVG_SYSTEM_PROMPT = `You are an SVG diagram specialist for data presentation videos (1920×1080).

Your ONLY job: generate a single premium-quality SVG diagram based on the description provided.

## CRITICAL: This SVG is a VIDEO ELEMENT, not a standalone infographic
- NO background rectangle — the video scene provides its own background
- NO title text — the scene already has a title element above the SVG
- NO grid pattern or decorative background — keep it transparent
- ALL content must fit INSIDE the viewBox — no elements at edges that get clipped
- Keep margins: leave at least 40px padding from viewBox edges for all content
- The SVG should look like a DIAGRAM floating on the scene background, not a self-contained report

## Output
Return ONLY the raw SVG markup. No markdown fences, no explanation, no JSON wrapper.
Start with <svg and end with </svg>.

## Quality Rules (MANDATORY)
1. USE \`<defs>\` for gradients (linearGradient, radialGradient), arrow markers, glow filters.
2. Every shape: gradient fill + rounded corners (rx) + subtle stroke border. NEVER flat single-color rectangles.
3. ADD DETAIL: labels (font-size 16-22), data badges/pills (small rounded rects with text), metric callouts, dotted connector lines.
4. Visual hierarchy: primary elements larger+brighter, secondary smaller+muted.
5. Nodes: circles or rounded rects with icon-like symbols inside.
6. Connections: paths with arrowhead markers, varying stroke-width for emphasis.
7. Color depth: 3-4 opacity levels (full, 70%, 40%, 15%) for layered depth.
8. MINIMUM 15-20 visual elements. Aim for 30-50 for complex diagrams.
9. viewBox="0 0 800 500". All text uses fill attribute, not CSS color.
10. All badges and callouts must be INSIDE the viewBox bounds (x: 40-760, y: 40-460).

## Color Palette
Use the provided palette colors. Primary color for main elements, secondary for accents.
Use opacity variations (rgba or stop-opacity) for depth layers.

## What Makes Premium SVG
- Gradient-filled cards with rounded corners and subtle borders
- Data badges (small pills showing "99.2%", "$4.2M", "+15%") — positioned INSIDE diagram, not on edges
- Arrow connectors between nodes with <marker> arrowheads
- Glow effects via <filter> with feGaussianBlur
- Multiple opacity layers creating depth perception
- Clean transparent background — integrates with any scene color`;

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

type SvgTarget = {
  sceneIndex: number;
  elementIndex: number;
  svgPrompt: string;
  narration: string;
  palette: { primary: string; secondary: string; chartColors: string[] };
  dark: boolean;
};

export type SvgGenProgress = {
  generated: number;
  total: number;
};

// ═══════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════

/**
 * Scan script for SVG elements with svgPrompt but no markup,
 * generate focused SVG for each, and inject back into the script.
 *
 * Also handles SVG elements with existing markup that's too simple
 * (< 10 visual elements) — regenerates with focused call.
 */
export async function generateSvgElements(
  script: VideoScript,
  onProgress?: (p: SvgGenProgress) => void,
): Promise<VideoScript> {
  const targets = findSvgTargets(script);

  if (targets.length === 0) {
    console.log("[SvgGen] No SVG elements need generation");
    return script;
  }

  console.log(`[SvgGen] Generating ${targets.length} SVG element(s)`);

  let generated = 0;
  const concurrency = 2;

  const process = async (target: SvgTarget) => {
    try {
      const markup = await generateSvgMarkup(target);
      if (markup) {
        const el = script.scenes[target.sceneIndex].elements[target.elementIndex];
        (el as Record<string, unknown>).markup = markup;
        console.log(`[SvgGen] Scene ${target.sceneIndex + 1} done (${countVisualElements(markup)} visual elements)`);
      }
    } catch (err) {
      console.warn(`[SvgGen] Scene ${target.sceneIndex + 1} failed (non-fatal):`, err);
    }
    generated++;
    onProgress?.({ generated, total: targets.length });
  };

  // Concurrent pool
  await pool(targets, process, concurrency);

  return script;
}

// ═══════════════════════════════════════════════════════════════════
// Find SVG targets that need generation
// ═══════════════════════════════════════════════════════════════════

const MIN_VISUAL_ELEMENTS = 10;

function findSvgTargets(script: VideoScript): SvgTarget[] {
  const targets: SvgTarget[] = [];
  const theme = script.theme ?? {};
  const palette = {
    primary: (theme.primaryColor as string) ?? "#0F766E",
    secondary: (theme.secondaryColor as string) ?? "#4298d7",
    chartColors: (theme.chartColors as string[]) ?? [],
  };

  for (let si = 0; si < script.scenes.length; si++) {
    const scene = script.scenes[si];
    const dark = isDarkScene(scene);

    for (let ei = 0; ei < scene.elements.length; ei++) {
      const el = scene.elements[ei];
      if (el.type !== "svg" && el.type !== "svg-3d") continue;

      const svgPrompt = (el as Record<string, unknown>).svgPrompt as string | undefined;
      const markup = ((el as Record<string, unknown>).markup as string) ??
        ((el as Record<string, unknown>).props as Record<string, unknown>)?.markup as string | undefined;

      // Case 1: has svgPrompt, no markup → needs generation
      // Case 2: has markup but too simple → needs regeneration
      const needsGen = svgPrompt && (!markup || markup.trim() === "");
      const needsRegen = markup && countVisualElements(markup) < MIN_VISUAL_ELEMENTS;

      if (needsGen || needsRegen) {
        const prompt = svgPrompt ??
          `SVG diagram for: "${scene.narration ?? "data visualization"}"`;
        targets.push({
          sceneIndex: si,
          elementIndex: ei,
          svgPrompt: prompt,
          narration: scene.narration ?? "",
          palette,
          dark,
        });
      }
    }
  }

  return targets;
}

function isDarkScene(scene: VideoScene): boolean {
  if (scene.bgGradient) return true;
  const bg = scene.bgColor ?? "";
  if (!bg) return true;
  // Simple luminance check
  const hex = bg.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// ═══════════════════════════════════════════════════════════════════
// Generate SVG markup via focused Gemini call
// ═══════════════════════════════════════════════════════════════════

async function generateSvgMarkup(target: SvgTarget): Promise<string | null> {
  const { svgModel } = loadSettings();
  const model = svgModel ?? "gemini-2.5-flash-preview-05-20";

  const userMessage = buildSvgUserMessage(target);
  const messages: GeminiMessage[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const result = await callGeminiRaw(SVG_SYSTEM_PROMPT, messages, {
    modelOverride: model,
    temperature: 0.7,
    costCategory: "svgGen",
  });

  const raw = result.parts.find((p) => p.text)?.text ?? "";

  // Extract SVG from response (may have markdown fences)
  const svg = extractSvg(raw);
  if (!svg) {
    console.warn("[SvgGen] No valid SVG in response");
    return null;
  }

  const count = countVisualElements(svg);
  if (count < MIN_VISUAL_ELEMENTS) {
    console.warn(`[SvgGen] SVG only has ${count} elements (need ≥${MIN_VISUAL_ELEMENTS}), but accepting`);
  }

  return svg;
}

function buildSvgUserMessage(target: SvgTarget): string {
  const parts = [
    `## SVG Diagram Request`,
    `Description: ${target.svgPrompt}`,
    "",
    `## Scene Context`,
    `Narration: "${target.narration}"`,
    `Background: ${target.dark ? "dark" : "light"}`,
    "",
    `## Palette`,
    `Primary: ${target.palette.primary}`,
    `Secondary: ${target.palette.secondary}`,
  ];
  if (target.palette.chartColors.length > 0) {
    parts.push(`Chart colors: ${target.palette.chartColors.join(", ")}`);
  }
  parts.push(
    "",
    `## Requirements`,
    `- viewBox="0 0 800 500"`,
    `- Use gradient fills from palette colors`,
    `- Include <defs> with linearGradient and arrow markers`,
    `- Minimum 15 visual elements (shapes, text, paths)`,
    `- ${target.dark ? "Light text (#e2e8f0) on dark background" : "Dark text (#1e293b) on light background"}`,
    `- ONLY use numbers/data from the narration and description above — do NOT invent statistics, percentages, or dollar amounts`,
    `- Return ONLY the <svg>...</svg> markup, nothing else`,
  );
  return parts.join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function extractSvg(raw: string): string | null {
  // Try to find <svg>...</svg> in response
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

function countVisualElements(markup: string): number {
  const tags = markup.match(/<(rect|circle|ellipse|path|line|polyline|polygon|text|tspan)\b/g);
  return tags?.length ?? 0;
}

async function pool<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number,
): Promise<void> {
  let idx = 0;
  const next = async (): Promise<void> => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}
