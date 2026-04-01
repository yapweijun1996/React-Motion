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
6. LAYOUT FIT: Estimate whether each scene's elements fit within 1920×1080 (usable ~1824×1008px).
   Height estimates: text title ~140px, subtitle ~100px, body ~80px, metric ~220px, bar-chart ~80px/bar+40px, pie/sankey ~500px, line-chart ~450px, list ~80px/item, callout ~120px, divider ~30px, icon/kawaii/lottie ~160px, gap ~20px.
   Flag any scene where estimated total > 1008px or element count > 4.
7. STORYTELLING QUALITY:
   a. **Hook test**: Does scene 1 lead with a conclusion or key finding within the first sentence? The hook must let the viewer understand the verdict within 2 seconds. It can be a surprising number, but must NOT be a pure question with no answer, or a generic title like "Q1 Report" or "Let's look at...". A question followed immediately by a concrete claim is acceptable.
   b. **Audience awareness**: Does narration use "you/we/our"? Flag impersonal-only narration.
   c. **So What test**: Do chart/metric scenes interpret the data, not just read numbers?
   d. **Visual variety**: At least ONE of: annotation, icon, progress, comparison, SVG, map, or kawaii?
   e. **Action close**: Does the last scene have a recommendation or call-to-action? Flag recap dumps or "thank you" endings.
   f. **Narrative arc**: Is there at least one challenge AND one resolution across scenes?

8. APPLE NARRATIVE DISCIPLINE (Perception → Proof → Consequence):
   a. **2-second test**: Can the viewer understand the point of scene 1 within 2 seconds? The hook must state a conclusion or verdict, not introduce a topic. A surprising number is good; a pure question with no follow-up claim is not.
   b. **Single message test**: Does each scene have exactly ONE dominant message? Flag scenes that try to make multiple unrelated points.
   c. **Narration interprets, not duplicates**: Narration should explain WHY the visual matters, not read the visual verbatim. Flag scenes where narration just lists the same numbers shown in charts.
   d. **Claim → Evidence → Implication flow**: Does the script progress from stating a claim (hook) to showing evidence (proof) to drawing implication (resolution)? Flag scripts that jump randomly between unrelated points.
   e. **Climax strength test**: Is the climax scene clearly stronger than surrounding scenes? Check for: strongest data point, highest contrast element, most impactful visual. Flag scripts where climax is indistinguishable from proof scenes.
   f. **Compressed close test**: Does the last scene compress to ONE takeaway and ONE action/implication? Flag endings with 3+ bullet points, multiple charts, or recap-style summaries.

## Output JSON

{
  "pass": boolean,
  "issues": ["string", ...]
}

If pass is true, return { "pass": true, "issues": [] }.
If pass is false, return specific, actionable issue strings, e.g.:
- "Scene 3: narration mentions 45% but no visual element shows this number"
- "Scene 5: estimated height ~1200px (5 elements), exceeds 1008px viewport"
- "Scene 1: opens with generic title, no hook or surprising data point"

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

    // svg, divider, unknown: type only
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

  const raw = await callGemini(EVALUATE_SYSTEM, messages);
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
