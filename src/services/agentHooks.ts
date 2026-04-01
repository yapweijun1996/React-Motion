/**
 * Agent loop hooks — deterministic quality checks.
 *
 * Runs INSIDE the agent loop before returning produce_script result.
 * No AI call, instant (~0ms). Pure functions for testability.
 *
 * Pattern: Claude Code "Stop Hook" — validate result before accepting.
 * If checks fail, issues are sent back to AI for one retry.
 */

export type StopCheckResult = {
  pass: boolean;
  issues: string[];
};

// Element types that add visual personality (not just data/text)
const PERSONALITY_TYPES = new Set([
  "kawaii", "icon", "annotation", "svg", "lottie", "map",
]);

// Action words indicating a call-to-action in the closing scene
const ACTION_PATTERN = /\b(should|must|need|recommend|action|next|start|focus|prioriti|consider|implement|review|ensure)\b/i;

/**
 * Run 5 deterministic quality checks on a produced script.
 *
 * These checks catch the most common "boring video" patterns:
 * - No hook (opens with bland title instead of question/surprise)
 * - No call-to-action (ends with data summary instead of next steps)
 * - Low visual variety (all text+charts, no personality)
 */
export function runStopChecks(
  scriptJson: Record<string, unknown>,
): StopCheckResult {
  const issues: string[] = [];
  const scenes = (scriptJson.scenes as Record<string, unknown>[]) ?? [];

  if (scenes.length === 0) {
    return { pass: false, issues: ["No scenes in script"] };
  }

  // 1. Hook test: scene 1 narration has "?" or starts with a number
  const scene1Narration = String(scenes[0].narration ?? "");
  if (scene1Narration.length > 0) {
    const hasQuestion = scene1Narration.includes("?");
    const startsWithNumber = /\d/.test(scene1Narration.slice(0, 30));
    if (!hasQuestion && !startsWithNumber) {
      issues.push(
        "Scene 1 lacks a hook — narration should open with a question or surprising number",
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

  return { pass: issues.length === 0, issues };
}
