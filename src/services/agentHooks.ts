/**
 * Agent loop hooks — deterministic quality checks.
 *
 * Runs INSIDE the agent loop before returning produce_script result.
 * No AI call, instant (~0ms). Pure functions for testability.
 *
 * Pattern: Claude Code "Stop Hook" — validate result before accepting.
 * If checks fail, issues are sent back to AI for one retry.
 *
 * 10 checks: hook, action-close, element-diversity, transition-diversity,
 * personality, empty-chart-data, element-overflow, font-size-minimum,
 * data-accuracy, background-variety.
 */

import { checkDataAccuracy, extractHardNumbers } from "./agentHooksData";
import { checkRhythmGates } from "./agentHooksRhythm";
export { checkDataAccuracy, extractHardNumbers };

export type StopCheckResult = {
  pass: boolean;
  issues: string[];
};

// Element types that add visual personality (not just data/text)
const PERSONALITY_TYPES = new Set([
  "kawaii", "icon", "annotation", "svg", "svg-3d", "lottie", "map",
]);

// Rich visual types — require more creative effort than basic icon/kawaii
const RICH_VISUAL_TYPES = new Set([
  "svg", "svg-3d", "map", "annotation", "progress", "comparison", "timeline",
]);

// Action words indicating a call-to-action in the closing scene
const ACTION_PATTERN = /\b(should|must|need|recommend|action|next|start|focus|prioriti|consider|implement|review|ensure)\b/i;

/** Numeric patterns for hook claim detection (not the data accuracy check) */
const HARD_DATA_PATTERN = /(?:\$[\d,.]+[BMKTbmkt]?|\d+(?:\.\d+)?%|\d{4}(?:\s*[-–]\s*\d{4})?(?=\s|$|,|\.)|\d+(?:\.\d+)?x\b|\d[\d,.]*[BMKTbmkt]\+?(?=\s|$|,|\.|\))|\d[\d,.]*\s*(?:billion|million|trillion|thousand|percent|bps|basis\s*points))/gi;

// Verdict verbs/adjectives — signal a conclusion or key finding (not a topic intro)
const VERDICT_PATTERN = /\b(improv|increas|decreas|grew|growth|drop|fell|rise|rose|reach|hit|exceed|surpass|doubl|tripl|record|strongest|weakest|highest|lowest|fastest|slowest|largest|smallest|leading|declining|outperform|underperform|dominat|signal|indicat|driv|achiev|deliver|gain|lost|cut|sav|reduc|surge|spike|plummet|soar|crash|recover|transform|eliminat|generat|accelerat|decelerat)\b/i;

// Generic title-card patterns that are NOT hooks (topic introductions)
const TITLE_CARD_PATTERN = /^(let'?s\s+(look|talk|dive|explore|discuss)|welcome\s+to|introducing|overview|report|update|summary|agenda|today\s+we)/i;

// Stricter verdict pattern for title-card exemption — excludes topic-intro words
// like "growth", "leading", "performance" that are often used as topics, not verdicts.
// Uses word-start boundary only (no trailing \b) so stems match inflected forms.
const STRONG_VERDICT_PATTERN = /\b(grew|fell|drop(?:ped)?|rise[sn]?|rose|hit|exceed|surpass|doubl|tripl|record|strongest|weakest|highest|lowest|fastest|slowest|largest|smallest|outperform|underperform|surg|spike[ds]?|plummet|soar|crash|eliminat|cut\s+by|sav|reduc)/i;

/**
 * Check whether Scene 1 narration contains a conclusion/verdict hook.
 *
 * Rules (aligned with Apple narrative + evaluate.ts "2-second test"):
 * - A claim = contains a concrete number OR a verdict verb/adjective.
 * - Pure question with no claim in remaining text → fail.
 * - Question followed by a claim sentence → pass (acceptable rhetorical hook).
 * - Generic title-card opener with no claim → fail.
 * - Number in first 60 chars + any context → pass (data-led verdict).
 */
export function checkHookClaim(narration: string): boolean {
  const trimmed = narration.trim();
  if (trimmed.length === 0) return true; // empty narration handled elsewhere

  // Reject generic title-card openers outright (unless they also contain a strong claim)
  // Use STRONG_VERDICT_PATTERN here — loose topic words (growth, leading, performance)
  // should NOT exempt a title-card opener.
  // Number check is strict: require data-style numbers (%, $, year, multiplier),
  // not incidental digits like "Q4".
  if (TITLE_CARD_PATTERN.test(trimmed)) {
    const hasDataNumber = HARD_DATA_PATTERN.test(trimmed);
    HARD_DATA_PATTERN.lastIndex = 0; // reset global regex
    const hasStrongVerdict = STRONG_VERDICT_PATTERN.test(trimmed);
    return hasDataNumber || hasStrongVerdict;
  }

  // Split into sentences (rough split on . ! ?)
  const sentences = trimmed.split(/(?<=[.!?])\s+/);
  const firstSentence = sentences[0] ?? "";

  const firstHasNumber = /\d/.test(firstSentence.slice(0, 60));
  const firstHasVerdict = VERDICT_PATTERN.test(firstSentence);
  const firstIsClaim = firstHasNumber || firstHasVerdict;

  // If first sentence is a claim → pass
  if (firstIsClaim) return true;

  // If first sentence is a question, check whether remaining text contains a claim
  if (firstSentence.includes("?")) {
    const rest = sentences.slice(1).join(" ");
    const restHasNumber = /\d/.test(rest);
    const restHasVerdict = VERDICT_PATTERN.test(rest);
    return restHasNumber || restHasVerdict;
  }

  // No claim found at all → fail
  return false;
}

/**
 * Run deterministic quality checks on a produced script.
 *
 * These checks catch the most common "boring video" patterns:
 * - No hook (opens with bland title instead of question/surprise)
 * - No call-to-action (ends with data summary instead of next steps)
 * - Low visual variety (all text+charts, no personality)
 */
export function runStopChecks(
  scriptJson: Record<string, unknown>,
  userPrompt?: string,
): StopCheckResult {
  const issues: string[] = [];
  const scenes = (scriptJson.scenes as Record<string, unknown>[]) ?? [];

  if (scenes.length === 0) {
    return { pass: false, issues: ["No scenes in script"] };
  }

  // 1. Hook test: scene 1 must lead with a conclusion/verdict, not a topic.
  //    Aligned with Apple 6-beat narrative: "open with the verdict, not the topic."
  //    Pass if first sentence contains a concrete claim (number OR verdict verb/adjective).
  //    Pure question with no follow-up claim → fail.
  //    Generic title-card opener with no claim → fail.
  const scene1Narration = String(scenes[0].narration ?? "");
  if (scene1Narration.length > 0) {
    const passed = checkHookClaim(scene1Narration);
    if (!passed) {
      issues.push(
        "Scene 1 lacks a hook — narration must lead with a conclusion or key finding, not a question or generic title",
      );
    }
  }

  // 2. Action close: last scene narration has action words
  const lastNarration = String(scenes[scenes.length - 1].narration ?? "");
  if (lastNarration.length > 0 && !ACTION_PATTERN.test(lastNarration)) {
    issues.push(
      "Last scene lacks call-to-action — audience won't know what to do next",
    );
  }

  // 3. Element diversity: >= 3 for short videos, >= 5 for 5+ scene videos
  const elementTypes = new Set<string>();
  for (const scene of scenes) {
    const elements = (scene.elements as Record<string, unknown>[]) ?? [];
    for (const el of elements) {
      if (typeof el.type === "string") elementTypes.add(el.type);
    }
  }
  const minElementTypes = scenes.length >= 5 ? 5 : 3;
  if (elementTypes.size < minElementTypes) {
    issues.push(
      `Only ${elementTypes.size} element type(s) used — need ≥${minElementTypes} for visual variety. ` +
      `Consider: svg, comparison, timeline, progress, map, annotation.`,
    );
  }

  // 4. Transition diversity: >= 2 for short, >= 3 for 5+ scene videos
  if (scenes.length > 2) {
    const transitions = new Set<string>();
    for (const scene of scenes) {
      if (typeof scene.transition === "string") transitions.add(scene.transition);
    }
    const minTransitions = scenes.length >= 5 ? 3 : 2;
    if (transitions.size < minTransitions) {
      issues.push(
        `Only ${transitions.size} transition type(s) — need ≥${minTransitions}. ` +
        `Available: fade, slide, wipe, clock-wipe, zoom-out, zoom-blur, dissolve, iris, split, rotate.`,
      );
    }
  }

  // 5. Visual personality: at least 1 scene with a personality element
  let personalityCount = 0;
  for (const scene of scenes) {
    const elements = (scene.elements as Record<string, unknown>[]) ?? [];
    if (elements.some((el) => PERSONALITY_TYPES.has(String(el.type)))) {
      personalityCount++;
    }
  }
  if (personalityCount < 1) {
    issues.push(
      "No visual personality elements (icon/annotation/svg/map) — add at least 1 for visual interest",
    );
  }

  // 5b. Standalone decoration check: annotation/kawaii must not be sole non-text element
  const DECORATION_TYPES = new Set(["annotation", "kawaii", "lottie"]);
  for (let si = 0; si < scenes.length; si++) {
    const elements = (scenes[si].elements as Record<string, unknown>[]) ?? [];
    const decorations = elements.filter((el) => DECORATION_TYPES.has(String(el.type)));
    const content = elements.filter((el) => !DECORATION_TYPES.has(String(el.type)) && el.type !== "text" && el.type !== "divider");
    if (decorations.length > 0 && content.length === 0) {
      issues.push(
        `Scene ${si + 1}: decoration element (${decorations.map((d) => d.type).join(", ")}) without content — annotation/kawaii must pair with a chart, metric, or comparison, not float alone`,
      );
    }
  }

  // 5b. Rich visual variety: at least 1 rich visual element (not just icon/kawaii)
  let hasRichVisual = false;
  for (const scene of scenes) {
    const elements = (scene.elements as Record<string, unknown>[]) ?? [];
    if (elements.some((el) => RICH_VISUAL_TYPES.has(String(el.type)))) {
      hasRichVisual = true;
      break;
    }
  }
  if (!hasRichVisual && scenes.length >= 5) {
    issues.push(
      "No rich visual elements (svg/map/progress/comparison/timeline) — use at least one for visual impact",
    );
  }

  // 6. Empty chart data: charts without data render as invisible spacers
  for (let si = 0; si < scenes.length; si++) {
    const elements = (scenes[si].elements as Record<string, unknown>[]) ?? [];
    for (const el of elements) {
      const t = String(el.type);
      if (t === "bar-chart" && !((el.bars as unknown[])?.length > 0))
        issues.push(`Scene ${si + 1}: bar-chart has no bars — remove it or add data`);
      if (t === "pie-chart" && !((el.slices as unknown[])?.length > 0))
        issues.push(`Scene ${si + 1}: pie-chart has no slices — remove it or add data`);
      if (t === "line-chart" && !((el.series as unknown[])?.length > 0))
        issues.push(`Scene ${si + 1}: line-chart has no series — remove it or add data`);
      if (t === "sankey" && (!((el.nodes as unknown[])?.length > 0) || !((el.links as unknown[])?.length > 0)))
        issues.push(`Scene ${si + 1}: sankey missing nodes or links — remove it or add data`);
    }
  }

  // 6b. SVG complexity: reject bare-bones SVGs that look empty on 1920×1080
  for (let si = 0; si < scenes.length; si++) {
    const elements = (scenes[si].elements as Record<string, unknown>[]) ?? [];
    for (const el of elements) {
      if ((el.type === "svg" || el.type === "svg-3d") && typeof el.markup === "string") {
        const markup = el.markup as string;
        // Count visual elements (shapes, paths, text, lines — not defs/metadata)
        const visualTags = (markup.match(/<(rect|circle|ellipse|path|line|polyline|polygon|text|tspan)\b/g) || []).length;
        const hasDefs = /<defs\b/.test(markup);
        const hasGradient = /Gradient\b/.test(markup);
        if (visualTags < 10) {
          issues.push(
            `Scene ${si + 1}: SVG has only ${visualTags} visual elements — need ≥10 for 1920×1080 canvas. ` +
            `Add more shapes, labels, badges, connectors. Use <defs> for gradients.`,
          );
        }
        if (!hasDefs || !hasGradient) {
          issues.push(
            `Scene ${si + 1}: SVG lacks <defs> with gradients — use linearGradient/radialGradient fills for depth, not flat colors.`,
          );
        }
      }
    }
  }

  // 7. Element overflow: > 4 elements per scene crowds the 1920×1080 layout
  for (let si = 0; si < scenes.length; si++) {
    const count = ((scenes[si].elements as unknown[]) ?? []).length;
    if (count > 4)
      issues.push(`Scene ${si + 1}: ${count} elements — split into multiple scenes (max 4)`);
  }

  // 8. Font size minimum: < 48 is unreadable at 1920×1080 displayed size
  for (let si = 0; si < scenes.length; si++) {
    const elements = (scenes[si].elements as Record<string, unknown>[]) ?? [];
    for (const el of elements) {
      if (el.type === "text" && typeof el.fontSize === "number" && el.fontSize < 48)
        issues.push(`Scene ${si + 1}: text fontSize ${el.fontSize} below 48 minimum`);
    }
  }

  // 9. Data accuracy: script must not contain fabricated numbers.
  //    When user prompt has no structured data, narration/elements must not
  //    invent specific statistics, percentages, monetary amounts, or year-based claims.
  //    When user prompt has data, script numbers must be traceable to user input.
  const dataIssues = checkDataAccuracy(scenes, userPrompt);
  issues.push(...dataIssues);

  // 10-11. Background variety + Director Mode rhythm gates
  //        (layout/transition consecutive, stagger, ScenePlan conformance)
  //        Moved to agentHooksRhythm.ts for 300-line compliance.
  const rhythmIssues = checkRhythmGates(scenes);
  issues.push(...rhythmIssues);

  return { pass: issues.length === 0, issues };
}

// Data accuracy helpers moved to agentHooksData.ts
// (checkDataAccuracy, extractHardNumbers imported at top of file)
// Background variety + rhythm gates moved to agentHooksRhythm.ts
