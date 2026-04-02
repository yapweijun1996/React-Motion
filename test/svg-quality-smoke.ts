/**
 * SVG Quality Smoke Test — evaluate Gemini model SVG generation capability.
 *
 * Usage:  npx vite-node test/svg-quality-smoke.ts
 *
 * What it does:
 *   1. Reads API key + model from .env.local
 *   2. Sends 3 SVG generation prompts (flowchart, org chart, mind map)
 *   3. Evaluates each SVG against the project's quality gates:
 *      - Visual elements ≥ 10
 *      - Has <defs> with gradients
 *      - Has connectors (lines/paths/arrows)
 *      - Has text labels
 *      - Minimum complexity score
 *   4. Writes SVG output files to test/svg-output/ for visual review
 *   5. Prints a quality scorecard
 */

import { loadEnv } from "vite";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

// ── Environment ─────────────────────────────────────────────────────
const env = loadEnv("development", resolve(__dirname, ".."), [
  "DEVELOPMENT_",
  "VITE_",
]);

const API_KEY =
  env.DEVELOPMENT_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";
const MODEL =
  env.DEVELOPMENT_GEMINI_MODEL || env.VITE_GEMINI_MODEL || "gemini-3-flash-preview";

if (!API_KEY) {
  console.error("No API key found. Set DEVELOPMENT_GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const OUTPUT_DIR = resolve(__dirname, "svg-output");

// ── SVG Quality Rules (mirrors agentHooks.ts quality gate) ──────────
interface QualityReport {
  name: string;
  model: string;
  visualElements: number;
  hasDefs: boolean;
  hasGradient: boolean;
  connectorCount: number;
  textLabelCount: number;
  hasArrowMarker: boolean;
  totalSvgLength: number;
  passed: boolean;
  issues: string[];
  durationMs: number;
}

function evaluateSvgQuality(name: string, svg: string, model: string, durationMs: number): QualityReport {
  const issues: string[] = [];

  // Count visual elements (same regex as agentHooks.ts line 257)
  const visualMatches = svg.match(/<(rect|circle|ellipse|path|line|polyline|polygon|text|tspan)\b/g) || [];
  const visualElements = visualMatches.length;

  // Check <defs> presence
  const hasDefs = /<defs\b/.test(svg);

  // Check gradient presence
  const hasGradient = /Gradient\b/.test(svg);

  // Count connectors (lines, paths with markers, arrows)
  const connectorMatches = svg.match(/<(line|polyline)\b/g) || [];
  const arrowPaths = svg.match(/marker-end/g) || [];
  const connectorCount = connectorMatches.length + arrowPaths.length;

  // Count text labels
  const textMatches = svg.match(/<text\b/g) || [];
  const textLabelCount = textMatches.length;

  // Check for arrow markers
  const hasArrowMarker = /<marker\b/.test(svg);

  // Quality gate checks (aligned with agentHooks.ts)
  if (visualElements < 10) {
    issues.push(`Only ${visualElements} visual elements — need ≥10 for 1920×1080 canvas`);
  }
  if (!hasDefs) {
    issues.push("Missing <defs> — should contain gradients, markers, filters");
  }
  if (!hasGradient) {
    issues.push("No gradients found — flat single-color fills look unprofessional");
  }
  if (connectorCount === 0) {
    issues.push("No connectors (lines/arrows) — diagram looks disconnected");
  }
  if (textLabelCount < 3) {
    issues.push(`Only ${textLabelCount} text labels — diagrams need descriptive labels`);
  }
  if (!hasArrowMarker) {
    issues.push("No <marker> for arrows — flowcharts/org charts need directional arrows");
  }

  const passed = issues.length === 0;

  return {
    name,
    model,
    visualElements,
    hasDefs,
    hasGradient,
    connectorCount,
    textLabelCount,
    hasArrowMarker,
    totalSvgLength: svg.length,
    passed,
    issues,
    durationMs,
  };
}

// ── Test Prompts ────────────────────────────────────────────────────

const SVG_SYSTEM_PROMPT = `You are a premium SVG diagram generator for a 1920×1080 video presentation system.

CRITICAL RULES:
1. USE <defs> for gradients (linearGradient, radialGradient), markers, glow filters.
2. Every shape: gradient fill + rounded corners (rx) + subtle stroke border. Never flat single-color rectangles.
3. ADD DETAIL: labels font-size 16-22, data badges/pills (small rounded rects with text), metric callouts, dotted connector lines.
4. Visual hierarchy: primary elements larger+brighter, secondary smaller+muted.
5. Nodes: circles or rounded rects with icon-like symbols inside.
6. Connections: paths with arrowhead markers, varying stroke-width.
7. Context: axis labels, legend dots, scale indicators where appropriate.
8. Color depth: 3-4 opacity levels (full, 70%, 40%, 15%) for layered depth.
9. MINIMUM 15-20 SVG elements per diagram. Quality gate REJECTS SVGs with <10 visual elements.
10. viewBox 800x500 or wider. Text uses fill attribute not CSS color.
11. Use professional color palette: teals (#0f766e, #14b8a6), slates (#1e293b, #475569), with accent colors.

Return ONLY the raw SVG markup. No markdown, no code fences, no explanation. Just <svg>...</svg>.`;

interface TestCase {
  name: string;
  prompt: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: "flowchart",
    prompt: `Generate a premium SVG flowchart showing an e-commerce order processing pipeline:
Order Received → Payment Verification → Inventory Check → (Branch: In Stock → Pack & Ship → Delivery, Out of Stock → Backorder → Notify Customer)
Each node should have gradient fill, rounded corners, detail badges showing metrics (e.g. "~2.3s", "99.2%"), and arrow connectors between nodes.`,
  },
  {
    name: "org-chart",
    prompt: `Generate a premium SVG org chart for a tech startup:
CEO at top → CTO (Engineering: 45 people), CFO (Finance: 12 people), CMO (Marketing: 28 people)
Under CTO: Frontend Lead (15), Backend Lead (18), DevOps Lead (12)
Each node: gradient fill, role title, person count badge, connecting lines with arrows.`,
  },
  {
    name: "mind-map",
    prompt: `Generate a premium SVG mind map about "AI in Healthcare":
Center: "AI in Healthcare"
Branch 1: Diagnostics (Medical Imaging, Lab Analysis, Symptom Checker)
Branch 2: Treatment (Drug Discovery, Personalized Medicine, Robotic Surgery)
Branch 3: Operations (Scheduling, Claims Processing, Supply Chain)
Each branch: different gradient color, curved connector paths, detail badges with growth metrics.`,
  },
];

// ── Gemini API Call ─────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string): Promise<{ text: string; durationMs: number }> {
  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.8,
    },
  };

  const t0 = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const durationMs = Math.round(performance.now() - t0);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { text, durationMs };
}

// ── Extract SVG from response ───────────────────────────────────────

function extractSvg(raw: string): string {
  // Try to find <svg...>...</svg> in the response
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) return match[0];

  // If wrapped in code fences, strip them
  const fenced = raw.replace(/```(?:xml|svg|html)?\s*/g, "").replace(/```/g, "").trim();
  const match2 = fenced.match(/<svg[\s\S]*?<\/svg>/i);
  if (match2) return match2[0];

  return raw.trim();
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║        SVG Quality Smoke Test — Gemini Model          ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Model:     ${MODEL}`);
  console.log(`API Key:   ${API_KEY.slice(0, 10)}...${API_KEY.slice(-4)}`);
  console.log(`Test Cases: ${TEST_CASES.length}`);
  console.log();

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const reports: QualityReport[] = [];

  for (const tc of TEST_CASES) {
    console.log(`── Testing: ${tc.name} ──────────────────────────`);
    console.log(`Prompt: ${tc.prompt.slice(0, 80)}...`);

    try {
      const { text, durationMs } = await callGemini(SVG_SYSTEM_PROMPT, tc.prompt);
      const svg = extractSvg(text);

      // Write SVG file
      const svgPath = resolve(OUTPUT_DIR, `${tc.name}.svg`);
      writeFileSync(svgPath, svg);
      console.log(`SVG written: ${svgPath} (${(svg.length / 1024).toFixed(1)} KB)`);

      // Write HTML wrapper for easy preview
      const htmlPath = resolve(OUTPUT_DIR, `${tc.name}.html`);
      writeFileSync(htmlPath, `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${tc.name}</title>
<style>body{margin:0;background:#1e293b;display:flex;justify-content:center;align-items:center;min-height:100vh}
svg{max-width:90vw;max-height:90vh;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))}</style>
</head><body>${svg}</body></html>`);

      // Evaluate quality
      const report = evaluateSvgQuality(tc.name, svg, MODEL, durationMs);
      reports.push(report);

      // Print result
      const status = report.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`Result: ${status} | ${durationMs}ms | ${report.visualElements} elements`);
      if (report.issues.length > 0) {
        report.issues.forEach((issue) => console.log(`  ⚠️  ${issue}`));
      }
    } catch (err) {
      console.error(`ERROR: ${err}`);
      reports.push({
        name: tc.name,
        model: MODEL,
        visualElements: 0,
        hasDefs: false,
        hasGradient: false,
        connectorCount: 0,
        textLabelCount: 0,
        hasArrowMarker: false,
        totalSvgLength: 0,
        passed: false,
        issues: [`API call failed: ${err}`],
        durationMs: 0,
      });
    }
    console.log();
  }

  // ── Final Scorecard ───────────────────────────────────────────
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║                  QUALITY SCORECARD                    ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║ Model: ${MODEL.padEnd(46)}║`);
  console.log("╠══════════════╦═══════╦═══════╦═══════╦═══════╦═══════╣");
  console.log("║ Test Case    ║ Elems ║ Defs  ║ Grad  ║ Conn  ║ Pass  ║");
  console.log("╠══════════════╬═══════╬═══════╬═══════╬═══════╬═══════╣");

  for (const r of reports) {
    const name = r.name.padEnd(12);
    const elems = String(r.visualElements).padStart(3).padEnd(5);
    const defs = r.hasDefs ? "  ✅ " : "  ❌ ";
    const grad = r.hasGradient ? "  ✅ " : "  ❌ ";
    const conn = String(r.connectorCount).padStart(3).padEnd(5);
    const pass = r.passed ? "  ✅ " : "  ❌ ";
    console.log(`║ ${name} ║ ${elems} ║${defs}║${grad}║ ${conn} ║${pass}║`);
  }

  console.log("╚══════════════╩═══════╩═══════╩═══════╩═══════╩═══════╝");

  const passCount = reports.filter((r) => r.passed).length;
  const totalCount = reports.length;
  console.log();
  console.log(`Overall: ${passCount}/${totalCount} passed`);
  console.log(`SVG files saved to: ${OUTPUT_DIR}/`);
  console.log(`Open .html files in browser for visual review.`);
  console.log();

  // Write JSON report
  const jsonPath = resolve(OUTPUT_DIR, "quality-report.json");
  writeFileSync(jsonPath, JSON.stringify(reports, null, 2));
  console.log(`Full report: ${jsonPath}`);

  if (passCount < totalCount) {
    console.log();
    console.log("⚠️  Some tests failed the quality gate.");
    console.log("Flash models often produce bare SVGs. Pro models (gemini-3.1-pro-preview) are recommended for SVG.");
  }

  console.log();
  console.log("=== SVG QUALITY SMOKE TEST COMPLETE ===");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
