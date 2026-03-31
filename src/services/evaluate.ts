import { callGemini, type GeminiMessage } from "./gemini";
import { parseVideoScript } from "./parseScript";
import { logWarn } from "./errors";
import type { VideoScript } from "../types";

const EVALUATE_SYSTEM = `You are a quality checker for AI-generated video scripts.

You receive:
1. The user's original prompt (contains the source data)
2. A VideoScript JSON that was generated from that prompt

Your job: verify the script is correct and effective.

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
