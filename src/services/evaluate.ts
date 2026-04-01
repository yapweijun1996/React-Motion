import { callGemini, type GeminiMessage } from "./gemini";
import { parseVideoScript } from "./parseScript";
import { logWarn } from "./errors";
import type { VideoScript } from "../types";

const EVALUATE_SYSTEM = `You are a quality checker for AI-generated video scripts.

You receive:
1. The user's original prompt (contains the source data)
2. A VideoScript JSON that was generated from that prompt

Your job: verify the script is correct, effective, and visually fits the viewport.

## Check these:

1. DATA ACCURACY: Every number in the script must come from the user's prompt. Flag any invented data.
2. DATA COMPLETENESS: If the user's prompt contains data that the script ignores, flag it.
3. SCENE INTEGRITY: Scenes must not overlap (startFrame math must be correct).
4. VISUAL VARIETY: Are scenes visually distinct? Or do they all look the same?
5. NARRATION-VISUAL SYNC: For each scene, check that narration and elements tell the same story:
   - If narration mentions a number/percentage/trend, it MUST appear in a visual element (metric, chart, callout) in that scene.
   - If a scene has a chart or metric, the narration MUST reference what it shows.
   - Fix orphan narration by adding the missing visual element (metric or callout).
   - Fix silent visuals by adding the data point to narration.
6. LAYOUT FIT (CRITICAL): Estimate whether each scene's elements fit within the 1920×1080 viewport.
   The viewport has padding (default ~36px top/bottom, ~48px left/right), so the usable area is approximately **1824 × 1008 pixels**.
   Use these height estimates per element type:
   - text (title, fontSize 96-128): ~140px
   - text (subtitle, fontSize 64-80): ~100px
   - text (body, fontSize 48-64): ~80px
   - metric: ~220px (value + label)
   - bar-chart: ~80px per bar + 40px padding
   - pie-chart: ~500px (chart + legend side by side)
   - line-chart: ~450px
   - sankey: ~500px
   - list: ~80px per item
   - callout: ~120px
   - divider: ~30px
   - icon / kawaii / lottie: ~160px
   - gap between elements: ~20px each

   For each scene, sum the estimated heights. If total > 1008px:
   - FAIL the check
   - Fix by: (a) splitting the scene into two scenes, OR (b) removing the least important element, OR (c) reducing font sizes (but never below 48px)
   - Max 3-4 elements per scene. If a scene has 5+ elements, it almost certainly overflows.
   - Chart scenes should have at most: 1 title + 1 chart (+ optionally 1 callout if space allows)
   - Metric scenes: max 3 metrics in a row layout, max 2 in a column layout

7. STORYTELLING QUALITY (CRITICAL — this is what makes the video useful, not boring):
   a. **Hook test**: Does scene 1 open with a QUESTION or SURPRISING number? If it opens with a plain title like "Q1 Report" or "Data Overview", FAIL. Fix by rewriting scene 1 narration as a provocative question or dramatic stat.
   b. **Audience awareness**: Does narration speak TO the audience? Look for "you", "we", "our", "your team". If all narration is impersonal ("The data shows..."), FAIL. Fix by rewriting key narration lines to address the audience directly.
   c. **So What test**: For each scene with a chart or metric, does the narration INTERPRET what it means (not just read numbers)? If narration says "Revenue was $4.8M" without context like "exceeding target by 6.7%", FAIL.
   d. **Visual metaphor**: Does the video use at least ONE of: kawaii character, annotation, icon with metric, SVG illustration, or map? If it's ALL text + charts with no visual personality, flag as "visually monotonous".
   e. **Action close**: Does the last or second-to-last scene contain a RECOMMENDATION or CALL-TO-ACTION? If the video ends with just a data summary or "thank you", FAIL. Fix by adding a resolution scene with actionable next steps.
   f. **Emotional arc**: Do scenes vary in tone? There should be at least one moment of tension/surprise AND one moment of resolution/hope. If all scenes have the same neutral tone, flag it.

## Output JSON

{
  "pass": boolean,
  "issues": ["string", ...],
  "fixes": { ...partial VideoScript patch to apply, or null if pass is true }
}

If pass is true, return { "pass": true, "issues": [], "fixes": null }.
If pass is false, return the issues found AND a corrected full VideoScript in "fixes".`;

type EvalResult = {
  pass: boolean;
  issues: string[];
  fixes: VideoScript | null;
};

export async function evaluateScript(
  userPrompt: string,
  script: VideoScript,
): Promise<EvalResult> {
  console.group("[ReactMotion] evaluate");

  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [
        {
          text: `## Original user prompt\n${userPrompt}\n\n## Generated VideoScript\n${JSON.stringify(script, null, 2)}`,
        },
      ],
    },
  ];

  console.log("[Eval] Sending script for review...");

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

    // If fixes contains a full corrected script, validate it properly
    let fixes: VideoScript | null = null;
    if (!pass && result.fixes && typeof result.fixes === "object") {
      try {
        fixes = parseVideoScript(JSON.stringify(result.fixes));
        console.log("[Eval] Corrected script validated OK");
      } catch (fixErr) {
        console.warn("[Eval] Corrected script failed validation, ignoring:", fixErr);
        fixes = null;
      }
    }

    console.groupEnd();
    return { pass, issues, fixes };
  } catch (parseErr) {
    logWarn("Eval", "EVAL_PARSE_FAILED", "Eval response was not valid JSON — skipping evaluation (non-fatal)", { error: parseErr });
    console.groupEnd();
    return { pass: false, issues: ["Evaluation skipped: AI returned invalid JSON"], fixes: null };
  }
}
