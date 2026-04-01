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

/** Numeric patterns that represent hard data claims (not ordinals like "3 steps") */
const HARD_DATA_PATTERN = /(?:\$[\d,.]+[BMKTbmkt]?|\d+(?:\.\d+)?%|\d{4}(?:\s*[-–]\s*\d{4})?(?=\s|$|,|\.)|\d+(?:\.\d+)?x\b|\d[\d,.]*\s*(?:billion|million|trillion|thousand|percent|bps|basis\s*points))/gi;

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

  // 3. Element diversity: >= 3 different element types
  const elementTypes = new Set<string>();
  for (const scene of scenes) {
    const elements = (scene.elements as Record<string, unknown>[]) ?? [];
    for (const el of elements) {
      if (typeof el.type === "string") elementTypes.add(el.type);
    }
  }
  if (elementTypes.size < 3) {
    issues.push(
      `Only ${elementTypes.size} element type(s) used — need ≥3 for visual variety`,
    );
  }

  // 4. Transition diversity: >= 2 different transitions (if > 2 scenes)
  if (scenes.length > 2) {
    const transitions = new Set<string>();
    for (const scene of scenes) {
      if (typeof scene.transition === "string") transitions.add(scene.transition);
    }
    if (transitions.size < 2) {
      issues.push(
        "All scenes use the same transition — vary for visual interest",
      );
    }
  }

  // 5. Visual personality: at least one personality element
  let hasPersonality = false;
  for (const scene of scenes) {
    const elements = (scene.elements as Record<string, unknown>[]) ?? [];
    if (elements.some((el) => PERSONALITY_TYPES.has(String(el.type)))) {
      hasPersonality = true;
      break;
    }
  }
  if (!hasPersonality) {
    issues.push(
      "No visual personality elements (kawaii/icon/annotation/svg) — video feels like a spreadsheet",
    );
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

  // 10. Background variety: prevent canvas effect repetition.
  //     Activated when >= 4 scenes. Catches "all-bokeh" wallpaper syndrome.
  const bgIssues = checkBackgroundVariety(scenes);
  issues.push(...bgIssues);

  return { pass: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Background variety helpers
// ---------------------------------------------------------------------------

const CHART_TYPES = new Set(["bar-chart", "pie-chart", "line-chart", "sankey"]);

/**
 * Check background canvas effect diversity.
 *
 * Rules (activated when >= 4 scenes):
 * - Max 3 scenes may use bgEffect.
 * - If multiple scenes use bgEffect, they must not all be the same effect.
 * - Chart-heavy scenes (primary element is a chart) should not use bgEffect.
 */
export function checkBackgroundVariety(
  scenes: Record<string, unknown>[],
): string[] {
  const issues: string[] = [];
  if (scenes.length < 4) return issues;

  const bgEffectScenes: { index: number; effect: string }[] = [];
  const chartWithCanvas: number[] = [];

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const effect = scene.bgEffect;
    if (typeof effect !== "string" || effect.length === 0) continue;

    bgEffectScenes.push({ index: si, effect });

    // Check if scene is chart-heavy (has a chart as primary/first content element)
    const elements = (scene.elements as Record<string, unknown>[]) ?? [];
    const hasChart = elements.some((el) => CHART_TYPES.has(String(el.type)));
    if (hasChart) chartWithCanvas.push(si + 1);
  }

  // Too many canvas scenes
  if (bgEffectScenes.length > 3) {
    issues.push(
      `Too many scenes use animated canvas background (${bgEffectScenes.length}) — reduce to 2-3 max and use bgGradient or bgColor for the rest`,
    );
  }

  // All same effect
  if (bgEffectScenes.length >= 2) {
    const uniqueEffects = new Set(bgEffectScenes.map((s) => s.effect));
    if (uniqueEffects.size === 1) {
      issues.push(
        `Background canvas repeats the same effect ("${bgEffectScenes[0].effect}") across all ${bgEffectScenes.length} canvas scenes — use different effects (bokeh/flow/rising) for variety`,
      );
    }
  }

  // Chart-heavy scenes with canvas
  if (chartWithCanvas.length > 0) {
    issues.push(
      `Chart-heavy scene(s) ${chartWithCanvas.join(", ")} should not use bgEffect — particle backgrounds compete with data visualization`,
    );
  }

  // Monotonous background rhythm: only plain bgColor switching, no gradient/image/canvas variety
  if (scenes.length >= 5) {
    let hasGradient = false;
    let hasImage = false;
    const hasCanvas = bgEffectScenes.length > 0;
    for (const scene of scenes) {
      if (typeof scene.bgGradient === "string" && scene.bgGradient.length > 0) hasGradient = true;
      if (typeof scene.imagePrompt === "string" && scene.imagePrompt.length > 0) hasImage = true;
    }
    if (!hasGradient && !hasImage && !hasCanvas) {
      issues.push(
        "All scenes use plain bgColor only — add bgGradient, imagePrompt, or bgEffect on 1-2 key scenes for visual rhythm",
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Data accuracy helpers
// ---------------------------------------------------------------------------

/** Small ordinal/count numbers (1-20) that are structural, not data claims */
const TRIVIAL_NUMBER = /^(?:[0-9]|1[0-9]|20)$/;

/**
 * Canonicalize a matched number token so equivalent forms compare equal.
 *
 * Examples:
 *  "$2B" and "$2.0B" → "$2b"
 *  "2 billion" → "$2b"  (word suffix → letter suffix)
 *  "45%" stays "45%"
 *  "2020–2024" → "2020-2024" (normalize dash)
 */
function canonicalize(raw: string): string {
  let s = raw.replace(/[\s,]/g, "").toLowerCase();

  // Normalize en-dash / em-dash to hyphen
  s = s.replace(/[–—]/g, "-");

  // Word suffixes → letter suffixes: "billion" → "b", "million" → "m", etc.
  s = s.replace(/billion/g, "b").replace(/million/g, "m")
    .replace(/trillion/g, "t").replace(/thousand/g, "k")
    .replace(/percent/g, "%").replace(/basispoints/g, "bps");

  // Strip trailing ".0" before a suffix: "$2.0b" → "$2b", "45.0%" → "45%"
  s = s.replace(/\.0+([bmkt%x])/g, "$1");

  // Strip "$" when a magnitude suffix is present, so "$2b" and "2b" match.
  // Keep "$" for raw amounts without suffix (e.g. "$500" stays "$500").
  if (/[bmtk]$/i.test(s)) {
    s = s.replace(/^\$/, "");
  }

  return s;
}

/**
 * Extract hard data numbers from text (percentages, dollar amounts, years, multipliers).
 * Returns canonicalized string tokens for comparison.
 */
export function extractHardNumbers(text: string): string[] {
  const matches = text.match(HARD_DATA_PATTERN) ?? [];
  return matches.map(canonicalize);
}

/**
 * Check whether script narration contains fabricated data.
 *
 * Strategy:
 * - Extract all hard numbers from script narrations.
 * - If userPrompt is provided, extract its numbers as the allowed set.
 * - Numbers in script that don't appear in user prompt → potential fabrication.
 * - If userPrompt has NO hard numbers at all, any hard number in script is suspect.
 */
export function checkDataAccuracy(
  scenes: Record<string, unknown>[],
  userPrompt?: string,
): string[] {
  const issues: string[] = [];
  if (!userPrompt) return issues; // no prompt → can't verify, skip

  const userNumbers = new Set(extractHardNumbers(userPrompt));
  const userHasData = userNumbers.size > 0;

  for (let si = 0; si < scenes.length; si++) {
    const narration = String(scenes[si].narration ?? "");
    const scriptNumbers = extractHardNumbers(narration);

    for (const num of scriptNumbers) {
      // Skip trivial numbers that are structural, not data claims
      // But keep numbers with format markers ($, %, B, M, x) — those are data claims
      const hasFormatMarker = /[$%xbmkt]/i.test(num);
      const raw = num.replace(/[%$xbmkt,.]/gi, "");
      if (!hasFormatMarker && TRIVIAL_NUMBER.test(raw)) continue;

      if (!userHasData) {
        // User provided no data → script should not invent numbers
        issues.push(
          `data_accuracy: Scene ${si + 1} narration contains "${num}" but user provided no verifiable data — remove or replace with qualitative statement`,
        );
      } else if (!userNumbers.has(num)) {
        // User provided data but this number isn't in it
        issues.push(
          `data_accuracy: Scene ${si + 1} narration contains "${num}" not found in user's original data — verify or remove`,
        );
      }
    }
  }
  return issues;
}
