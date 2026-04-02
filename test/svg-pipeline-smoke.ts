/**
 * SVG Pipeline Smoke Test — simulate REAL agent loop conditions.
 *
 * Usage:  npx vite-node test/svg-pipeline-smoke.ts
 *
 * This test replicates the EXACT constraints SVG faces inside the OODAE pipeline:
 *   1. JSON output mode (SVG embedded in VideoScript JSON string)
 *   2. Large system prompt (Visual Director ~30K chars)
 *   3. Prior conversation context (storyboard handoff message)
 *   4. Temperature pressure simulation (T=0.8 vs T=0.5)
 *   5. Quality gate evaluation (same as agentHooks.ts)
 *
 * Compares: isolated SVG prompt vs pipeline-realistic prompt
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

// ── Quality Gate (mirrors agentHooks.ts lines 247-273) ──────────────
interface QualityReport {
  name: string;
  condition: string;
  visualElements: number;
  hasDefs: boolean;
  hasGradient: boolean;
  connectorCount: number;
  textLabelCount: number;
  totalSvgLength: number;
  passed: boolean;
  issues: string[];
  durationMs: number;
}

function evaluateSvg(name: string, condition: string, svg: string, durationMs: number): QualityReport {
  const issues: string[] = [];
  const visualMatches = svg.match(/<(rect|circle|ellipse|path|line|polyline|polygon|text|tspan)\b/g) || [];
  const visualElements = visualMatches.length;
  const hasDefs = /<defs\b/.test(svg);
  const hasGradient = /Gradient\b/.test(svg);
  const connectors = svg.match(/<(line|polyline)\b/g) || [];
  const arrowPaths = svg.match(/marker-end/g) || [];
  const connectorCount = connectors.length + arrowPaths.length;
  const textMatches = svg.match(/<text\b/g) || [];
  const textLabelCount = textMatches.length;

  if (visualElements < 10) issues.push(`Only ${visualElements} visual elements (need ≥10)`);
  if (!hasDefs) issues.push("Missing <defs>");
  if (!hasGradient) issues.push("No gradients");
  if (connectorCount === 0) issues.push("No connectors/arrows");
  if (textLabelCount < 3) issues.push(`Only ${textLabelCount} text labels`);

  return {
    name, condition, visualElements, hasDefs, hasGradient, connectorCount,
    textLabelCount, totalSvgLength: svg.length, passed: issues.length === 0,
    issues, durationMs,
  };
}

// ── Extract SVG from JSON script ────────────────────────────────────
function extractSvgFromScript(scriptJson: string): string {
  try {
    const script = JSON.parse(scriptJson);
    for (const scene of script.scenes ?? []) {
      for (const el of scene.elements ?? []) {
        if ((el.type === "svg" || el.type === "svg-3d") && el.markup) {
          return el.markup;
        }
      }
    }
  } catch {
    // Try regex fallback
    const match = scriptJson.match(/"markup"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match) {
      return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }
  return "";
}

function extractSvgDirect(raw: string): string {
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) return match[0];
  const fenced = raw.replace(/```(?:xml|svg|html)?\s*/g, "").replace(/```/g, "").trim();
  const match2 = fenced.match(/<svg[\s\S]*?<\/svg>/i);
  return match2 ? match2[0] : raw.trim();
}

// ── Gemini API ──────────────────────────────────────────────────────
async function callGemini(
  systemPrompt: string,
  messages: Array<{ role: string; parts: Array<{ text: string }> }>,
  opts: { temperature?: number; jsonOutput?: boolean } = {},
): Promise<{ text: string; durationMs: number }> {
  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      ...(opts.jsonOutput ? { responseMimeType: "application/json" } : {}),
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
    throw new Error(`API error (${res.status}): ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { text, durationMs };
}

// ── Test Scenarios ──────────────────────────────────────────────────

// Scenario A: Isolated SVG (like smoke test — baseline)
const ISOLATED_SYSTEM = `You are a premium SVG diagram generator for a 1920×1080 video presentation.
Generate PREMIUM quality SVG with: <defs> for gradients/markers, rounded corners, labels, data badges, connector arrows, 3-4 opacity levels.
MINIMUM 15-20 SVG elements. viewBox 800x500+. Return ONLY raw <svg>...</svg>.`;

// Scenario B: Pipeline-realistic — SVG embedded in VideoScript JSON
const PIPELINE_SYSTEM = `You are a Visual Director Agent generating a VideoScript JSON for a video presentation system.

You must output a VALID JSON object following this exact schema:
{
  "id": "unique-id",
  "title": "...",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "durationInFrames": 300,
  "scenes": [{
    "id": "scene-1",
    "startFrame": 0,
    "durationInFrames": 150,
    "bgColor": "#0f172a",
    "layout": "center",
    "elements": [{
      "type": "svg",
      "markup": "<svg viewBox='0 0 800 500'>...FULL SVG HERE...</svg>",
      "animation": "draw"
    }],
    "transition": "fade",
    "narration": "..."
  }]
}

## SVG Quality Rules (CRITICAL):
1. USE <defs> for gradients, markers, glow filters.
2. Every shape: gradient fill + rounded corners (rx) + subtle stroke.
3. ADD: labels font-size 16-22, data badges, metric callouts, connector lines.
4. Nodes: circles or rounded rects with icon symbols.
5. Connections: paths with arrowhead markers.
6. Color depth: 3-4 opacity levels.
7. MINIMUM 15-20 SVG elements. Quality gate REJECTS <10.
8. viewBox 800x500. Text uses fill (not CSS color).

IMPORTANT: Output ONLY valid JSON. The SVG must be properly escaped inside the JSON string (escape quotes as \\", newlines as \\n).`;

const SVG_PROMPT = `Generate a flowchart showing: Data Collection → Preprocessing → Model Training → (Branch: Accuracy ≥90% → Deploy to Production, Accuracy <90% → Hyperparameter Tuning → back to Training). Each node: gradient fill, rounded corners, metrics badges (e.g. "~3.2h", "92.5%"), arrow connectors.`;

interface TestConfig {
  name: string;
  condition: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  jsonOutput: boolean;
  extractFn: (raw: string) => string;
}

const TESTS: TestConfig[] = [
  {
    name: "A-isolated-t08",
    condition: "Isolated SVG, T=0.8 (baseline)",
    systemPrompt: ISOLATED_SYSTEM,
    userPrompt: SVG_PROMPT,
    temperature: 0.8,
    jsonOutput: false,
    extractFn: extractSvgDirect,
  },
  {
    name: "B-pipeline-t08",
    condition: "Pipeline JSON, T=0.8 (normal)",
    systemPrompt: PIPELINE_SYSTEM,
    userPrompt: `Create a 2-scene VideoScript. Scene 1: text title "ML Pipeline Overview". Scene 2: SVG flowchart.\n\n${SVG_PROMPT}`,
    temperature: 0.8,
    jsonOutput: true,
    extractFn: extractSvgFromScript,
  },
  {
    name: "C-pipeline-t05",
    condition: "Pipeline JSON, T=0.5 (budget pressure)",
    systemPrompt: PIPELINE_SYSTEM,
    userPrompt: `Create a 2-scene VideoScript. Scene 1: text title "ML Pipeline Overview". Scene 2: SVG flowchart.\n\n${SVG_PROMPT}`,
    temperature: 0.5,
    jsonOutput: true,
    extractFn: extractSvgFromScript,
  },
  {
    name: "D-pipeline-t05-nosvgrules",
    condition: "Pipeline JSON, T=0.5, NO SVG rules (worst case)",
    systemPrompt: `You are a Visual Director Agent. Output a VALID JSON VideoScript with scenes and elements.
For SVG elements, put the full SVG markup in the "markup" field.
Output ONLY valid JSON. Escape quotes and newlines in SVG markup.
Schema: {"id":"...","title":"...","fps":30,"width":1920,"height":1080,"durationInFrames":300,"scenes":[{"id":"...","startFrame":0,"durationInFrames":150,"bgColor":"#0f172a","layout":"center","elements":[{"type":"svg","markup":"<svg>...</svg>","animation":"draw"}],"transition":"fade","narration":"..."}]}`,
    userPrompt: `Create a 2-scene VideoScript. Scene 2 should have an SVG flowchart of: Data Collection → Preprocessing → Model Training → Deployment. Include metrics and detail badges on each node.`,
    temperature: 0.5,
    jsonOutput: true,
    extractFn: extractSvgFromScript,
  },
];

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     SVG Pipeline Smoke Test — Real Condition Comparison     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Model: ${MODEL}`);
  console.log(`Tests: ${TESTS.length} conditions`);
  console.log();

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const reports: QualityReport[] = [];

  for (const tc of TESTS) {
    console.log(`── ${tc.name}: ${tc.condition} ──`);
    try {
      const messages = [{ role: "user", parts: [{ text: tc.userPrompt }] }];
      const { text, durationMs } = await callGemini(tc.systemPrompt, messages, {
        temperature: tc.temperature,
        jsonOutput: tc.jsonOutput,
      });

      // Write raw response
      const rawPath = resolve(OUTPUT_DIR, `${tc.name}-raw.txt`);
      writeFileSync(rawPath, text);

      // Extract SVG
      const svg = tc.extractFn(text);
      if (!svg || svg.length < 20) {
        console.log(`  ⚠️  No SVG extracted from response (${text.length} chars)`);
        reports.push({
          name: tc.name, condition: tc.condition, visualElements: 0,
          hasDefs: false, hasGradient: false, connectorCount: 0,
          textLabelCount: 0, totalSvgLength: 0, passed: false,
          issues: ["No SVG extracted from response"], durationMs,
        });
        continue;
      }

      // Write SVG + HTML
      const svgPath = resolve(OUTPUT_DIR, `${tc.name}.svg`);
      writeFileSync(svgPath, svg);
      const htmlPath = resolve(OUTPUT_DIR, `${tc.name}.html`);
      writeFileSync(htmlPath, `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${tc.name}</title>
<style>body{margin:0;background:#1e293b;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#94a3b8}
h2{margin:20px 0 10px}svg{max-width:90vw;max-height:80vh;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))}</style>
</head><body><h2>${tc.condition}</h2>${svg}</body></html>`);

      // Evaluate
      const report = evaluateSvg(tc.name, tc.condition, svg, durationMs);
      reports.push(report);

      const status = report.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${status} | ${durationMs}ms | ${report.visualElements} elems | ${(svg.length / 1024).toFixed(1)} KB`);
      if (report.issues.length > 0) {
        report.issues.forEach((i) => console.log(`    ⚠️  ${i}`));
      }
    } catch (err) {
      console.error(`  ERROR: ${err}`);
      reports.push({
        name: tc.name, condition: tc.condition, visualElements: 0,
        hasDefs: false, hasGradient: false, connectorCount: 0,
        textLabelCount: 0, totalSvgLength: 0, passed: false,
        issues: [`Error: ${err}`], durationMs: 0,
      });
    }
    console.log();
  }

  // ── Scorecard ─────────────────────────────────────────────────
  console.log("╔══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                        PIPELINE COMPARISON                              ║");
  console.log("╠══════════════════════════════════╦═══════╦═══════╦═══════╦══════╦═══════╣");
  console.log("║ Condition                        ║ Elems ║ Defs  ║ Grad  ║ Conn ║ Pass  ║");
  console.log("╠══════════════════════════════════╬═══════╬═══════╬═══════╬══════╬═══════╣");

  for (const r of reports) {
    const cond = r.condition.slice(0, 32).padEnd(32);
    const elems = String(r.visualElements).padStart(3).padEnd(5);
    const defs = r.hasDefs ? " ✅  " : " ❌  ";
    const grad = r.hasGradient ? " ✅  " : " ❌  ";
    const conn = String(r.connectorCount).padStart(2).padEnd(4);
    const pass = r.passed ? " ✅  " : " ❌  ";
    console.log(`║ ${cond} ║ ${elems} ║${defs}║${grad}║ ${conn} ║${pass}║`);
  }
  console.log("╚══════════════════════════════════╩═══════╩═══════╩═══════╩══════╩═══════╝");

  // ── Root Cause Summary ────────────────────────────────────────
  console.log();
  console.log("── ROOT CAUSE ANALYSIS ──");
  const baseline = reports.find((r) => r.name.startsWith("A-"));
  for (const r of reports) {
    if (r === baseline) continue;
    const diff = (baseline?.visualElements ?? 0) - r.visualElements;
    if (diff > 5) {
      console.log(`⚠️  ${r.condition}: lost ${diff} elements vs baseline`);
    }
    if (baseline?.hasDefs && !r.hasDefs) {
      console.log(`⚠️  ${r.condition}: lost <defs> — JSON escaping may have stripped it`);
    }
    if (baseline?.hasGradient && !r.hasGradient) {
      console.log(`⚠️  ${r.condition}: lost gradients — model simplified under constraint`);
    }
  }

  // Write full report
  const jsonPath = resolve(OUTPUT_DIR, "pipeline-report.json");
  writeFileSync(jsonPath, JSON.stringify(reports, null, 2));
  console.log();
  console.log(`Full report: ${jsonPath}`);
  console.log(`Open .html files in browser to visually compare.`);
  console.log();
  console.log("=== PIPELINE SMOKE TEST COMPLETE ===");
}

main().catch((err) => {
  console.error("Pipeline smoke test failed:", err);
  process.exit(1);
});
