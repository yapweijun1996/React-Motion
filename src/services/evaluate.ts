import { callGemini, type GeminiMessage } from "./gemini";
import { logWarn } from "./errors";
import type { VideoScript, VideoScene, SceneElement } from "../types";

const EVALUATE_SYSTEM = `You are a quality checker for AI-generated video scripts.

You receive:
1. The user's original prompt (contains the source data)
2. A scene-level summary of the generated script (rendering fields like colors, animations, and stagger are stripped — focus on data accuracy and structure)

Your job: diagnose issues. Do NOT return a corrected script — only list problems found.

## Check these:

1. DATA ACCURACY: Every number in the script must come from the user's prompt. Flag any invented data.
2. DATA COMPLETENESS: If the user's prompt contains data that the script ignores, flag it.
3. SCENE INTEGRITY: Scenes must not overlap (startFrame math must be correct).
4. VISUAL VARIETY: Are scenes visually distinct? Check element types, layouts, and transitions across scenes.
   - Background variety: If bgEffect is set on multiple scenes, are different effects used? More than 3 bgEffect scenes is excessive. Chart-heavy scenes should not use bgEffect. If all scenes only use plain bgColor (no gradient, no image, no canvas), the video lacks visual rhythm.
5. NARRATION-VISUAL SYNC: For each scene, check that narration and elements tell the same story:
   - If narration mentions a number/percentage/trend, it MUST appear in a visual element in that scene.
   - If a scene has a chart or metric, the narration MUST reference what it shows.
   - Flag orphan narration (data mentioned but not shown) and silent visuals (data shown but not narrated).
6. LAYOUT FIT: Flag scenes where element count > 4 or estimated height > 1008px (title~140, metric~220, chart~450, list~80/item, gap~20).
7. STORYTELLING: Hook test (scene 1 = conclusion, not title), So What test (interpret data, don't read numbers), action close (last scene = recommendation), narrative arc (challenge + resolution).

8. SVG QUALITY (when element has svgSummary):
   a. **Element count**: visualElements must be ≥10 for a 1920×1080 canvas. Fewer than 10 = "looks empty."
   b. **Gradients required**: hasGradients must be true. Flat single-color shapes look unprofessional.
   c. **Structure required**: hasConnectors > 0 — diagrams need connecting lines/arrows between nodes.
   d. **Detail required**: textLabels should include specific data/metrics, not just generic titles.
   e. **Complexity match**: The SVG should match the narrative complexity. A "risk matrix" with only 3 rectangles fails this test. A proper risk matrix has axes, positioned nodes, severity badges, and connecting arrows.
   Flag: "Scene N: SVG is too simple (X visual elements, no connectors/gradients) — should be a rich diagram with ≥10 elements, gradient fills, connecting arrows, and data labels."

9. APPLE NARRATIVE DISCIPLINE:
   - 2-second test: scene 1 must state conclusion, not introduce topic.
   - Single message: each scene = ONE point. Flag multi-point scenes.
   - Narration interprets: explain WHY, don't read chart numbers verbatim.
   - Claim→Evidence→Implication flow: hook→proof→resolution progression.
   - Climax must be visually/narratively stronger than surrounding scenes.
   - Compressed close: last scene = ONE takeaway + ONE action.

## Output: { "pass": boolean, "issues": ["string", ...] }
Return specific issues like "Scene 3: narration mentions 45% but no element shows it."
Do NOT return a corrected script. Only diagnose.`;

type EvalResult = {
  pass: boolean;
  issues: string[];
};

// ---------------------------------------------------------------------------
// Scene-level summary builder — strips rendering-only fields to reduce payload.
// Evaluator checks need: data values, narration, element types, layout, timing.
// Evaluator does NOT need: colors, animation, stagger, fontWeight, align, etc.
// ---------------------------------------------------------------------------

function buildEvalSummary(script: VideoScript): Record<string, unknown> {
  return {
    title: script.title,
    sceneCount: script.scenes.length,
    scenes: script.scenes.map(summarizeScene),
  };
}

function summarizeScene(scene: VideoScene): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: scene.id,
    startFrame: scene.startFrame,
    durationInFrames: scene.durationInFrames,
    layout: scene.layout,
    transition: scene.transition,
    narration: scene.narration,
    elements: scene.elements.map(summarizeElement),
  };
  // Include background fields so evaluator can check variety
  if (scene.bgGradient) out.bgGradient = scene.bgGradient;
  if (scene.bgEffect) out.bgEffect = scene.bgEffect;
  if (scene.imagePrompt) out.imagePrompt = scene.imagePrompt;
  return out;
}

function summarizeElement(el: SceneElement): Record<string, unknown> {
  const base: Record<string, unknown> = { type: el.type };

  switch (el.type) {
    case "text":
      base.content = el.content;
      base.fontSize = el.fontSize;
      break;

    case "metric":
      base.items = Array.isArray(el.items)
        ? (el.items as Record<string, unknown>[]).map((it) => ({ value: it.value, label: it.label }))
        : [];
      break;

    case "bar-chart":
      base.bars = Array.isArray(el.bars)
        ? (el.bars as Record<string, unknown>[]).map((b) => ({ label: b.label, value: b.value }))
        : [];
      break;

    case "pie-chart":
      base.slices = Array.isArray(el.slices)
        ? (el.slices as Record<string, unknown>[]).map((s) => ({ label: s.label, value: s.value }))
        : [];
      break;

    case "line-chart":
      base.series = Array.isArray(el.series)
        ? (el.series as Record<string, unknown>[]).map((s) => ({
            name: s.name,
            data: Array.isArray(s.data)
              ? (s.data as Record<string, unknown>[]).map((d) => ({ label: d.label, value: d.value }))
              : [],
          }))
        : [];
      break;

    case "sankey":
      base.nodes = Array.isArray(el.nodes)
        ? (el.nodes as Record<string, unknown>[]).map((n) => ({ name: n.name }))
        : [];
      base.links = Array.isArray(el.links)
        ? (el.links as Record<string, unknown>[]).map((l) => ({ source: l.source, target: l.target, value: l.value }))
        : [];
      break;

    case "list":
      base.items = el.items;
      base.icon = el.icon;
      break;

    case "callout":
      base.title = el.title;
      base.content = el.content;
      break;

    case "progress":
      base.value = el.value;
      base.max = el.max;
      base.label = el.label;
      break;

    case "timeline":
      base.items = Array.isArray(el.items)
        ? (el.items as Record<string, unknown>[]).map((it) => ({ label: it.label, description: it.description }))
        : [];
      break;

    case "comparison": {
      const pickSide = (side: unknown) => {
        if (!side || typeof side !== "object") return null;
        const s = side as Record<string, unknown>;
        return { title: s.title, value: s.value, items: s.items };
      };
      base.left = pickSide(el.left);
      base.right = pickSide(el.right);
      break;
    }

    case "kawaii":
      base.character = el.character;
      base.mood = el.mood;
      break;

    case "icon":
      base.name = el.name;
      base.label = el.label;
      break;

    case "annotation":
      base.shape = el.shape;
      base.label = el.label;
      break;

    case "lottie":
      base.preset = el.preset;
      break;

    case "map":
      base.countries = Array.isArray(el.countries)
        ? (el.countries as Record<string, unknown>[]).map((c) => ({ name: c.name, value: c.value }))
        : [];
      break;

    case "svg":
    case "svg-3d": {
      // Extract structural summary from SVG markup for quality evaluation
      const props = (el.props as Record<string, unknown>) ?? el;
      const markup = String(props.markup ?? el.markup ?? "");
      if (markup.length > 0) {
        const visualTags = (markup.match(/<(rect|circle|ellipse|path|line|polyline|polygon|text|tspan)\b/g) || []);
        const textContent = (markup.match(/>([^<]{2,})</g) || []).map((m: string) => m.slice(1).trim()).filter(Boolean);
        base.svgSummary = {
          visualElements: visualTags.length,
          hasGradients: /Gradient\b/.test(markup),
          hasDefs: /<defs\b/.test(markup),
          hasArrowMarkers: /marker/i.test(markup),
          hasConnectors: (markup.match(/<(line|path)\b/g) || []).length,
          textLabels: textContent.slice(0, 10),
          markupLength: markup.length,
        };
      }
      break;
    }

    // divider, unknown: type only
  }

  return base;
}

export async function evaluateScript(
  userPrompt: string,
  script: VideoScript,
): Promise<EvalResult> {
  const summary = buildEvalSummary(script);
  return runEval(userPrompt, summary, JSON.stringify(script).length);
}

/**
 * Evaluate raw script JSON (before full validation).
 * Used inside agentLoop where we have Record<string, unknown>, not VideoScript.
 */
export async function evaluateScriptJson(
  userPrompt: string,
  scriptJson: Record<string, unknown>,
): Promise<EvalResult> {
  const scenes = (scriptJson.scenes as Record<string, unknown>[]) ?? [];
  const summary = {
    title: scriptJson.title,
    sceneCount: scenes.length,
    scenes: scenes.map((s) => {
      const elements = (s.elements as Record<string, unknown>[]) ?? [];
      const out: Record<string, unknown> = {
        id: s.id,
        startFrame: s.startFrame,
        durationInFrames: s.durationInFrames,
        layout: s.layout,
        transition: s.transition,
        narration: s.narration,
        elements: elements.map(summarizeElement as (el: Record<string, unknown>) => Record<string, unknown>),
      };
      if (s.bgGradient) out.bgGradient = s.bgGradient;
      if (s.bgEffect) out.bgEffect = s.bgEffect;
      if (s.imagePrompt) out.imagePrompt = s.imagePrompt;
      return out;
    }),
  };
  return runEval(userPrompt, summary, JSON.stringify(scriptJson).length);
}

/** Shared eval runner — calls Gemini with EVALUATE_SYSTEM prompt. */
async function runEval(
  userPrompt: string,
  summary: Record<string, unknown>,
  fullScriptLength: number,
): Promise<EvalResult> {
  console.group("[ReactMotion] evaluate");
  const summaryJson = JSON.stringify(summary);
  console.log("[Eval] Summary:", summaryJson.length, "chars (full script was", fullScriptLength, "chars)");

  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [
        {
          text: `## Original user prompt\n${userPrompt}\n\n## Scene summary\n${summaryJson}`,
        },
      ],
    },
  ];

  const raw = await callGemini(EVALUATE_SYSTEM, messages, { costCategory: "agent" });
  console.log("[Eval] Response length:", raw.length, "chars");

  try {
    const result = JSON.parse(raw) as Record<string, unknown>;

    const pass = result.pass === true;
    const issues = Array.isArray(result.issues)
      ? (result.issues as string[])
      : [];

    if (!pass && issues.length > 0) {
      console.warn("[Eval] Issues found:", issues);
    } else {
      console.log("[Eval] Passed — no issues");
    }

    console.groupEnd();
    return { pass, issues };
  } catch (parseErr) {
    logWarn("Eval", "EVAL_PARSE_FAILED", "Eval response was not valid JSON — skipping evaluation (non-fatal)", { error: parseErr });
    console.groupEnd();
    return { pass: false, issues: ["Evaluation skipped: AI returned invalid JSON"] };
  }
}
