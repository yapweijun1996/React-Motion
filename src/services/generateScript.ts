import type { BusinessData, VideoScript } from "../types";
import { callGemini, type GeminiMessage } from "./gemini";
import { buildSystemPrompt, buildUserMessage } from "./prompt";
import { parseVideoScript } from "./parseScript";
import { evaluateScript } from "./evaluate";

const MAX_RETRIES = 2;

export async function generateScript(
  userPrompt: string,
  data?: BusinessData,
): Promise<VideoScript> {
  console.group("[ReactMotion] generateScript");

  console.log("[1] User prompt:", userPrompt);
  console.log("[1] Structured data:", data ? "provided" : "(none)");

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(userPrompt, data);

  const messages: GeminiMessage[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let lastError: Error | null = null;

  // --- Turn 1: Generate ---
  let script: VideoScript | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[2] Generate attempt ${attempt + 1}/${MAX_RETRIES + 1}`);

    const raw = await callGemini(systemPrompt, messages);
    console.log("[3] Gemini raw response:", raw);

    try {
      script = parseVideoScript(raw);

      console.log("[4] Parsed OK. Scenes:", script.scenes.length);
      script.scenes.forEach((s, i) => {
        const elTypes = s.elements.map((e) => e.type).join(", ");
        console.log(
          `  Scene ${i}: start=${s.startFrame}, dur=${s.durationInFrames}, bg=${s.bgColor}, elements=[${elTypes}]`,
        );
      });

      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[4] Parse failed (attempt ${attempt + 1}):`, lastError.message);

      if (attempt < MAX_RETRIES) {
        messages.push(
          { role: "model", parts: [{ text: raw }] },
          {
            role: "user",
            parts: [
              {
                text: `Your JSON output failed validation:\n\n${lastError.message}\n\nPlease fix the JSON and try again. Return ONLY the corrected JSON.`,
              },
            ],
          },
        );
      }
    }
  }

  if (!script) {
    console.groupEnd();
    throw new Error(
      `Generation failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError?.message}`,
    );
  }

  // --- Turn 2: Evaluate ---
  console.log("[5] Starting Evaluate...");

  try {
    const evalResult = await evaluateScript(userPrompt, script);

    if (!evalResult.pass) {
      console.warn("[5] Evaluate found issues:", evalResult.issues);

      if (evalResult.fixes) {
        // Use the corrected script from Evaluate
        const fixed = parseVideoScript(JSON.stringify(evalResult.fixes));
        console.log("[5] Applied corrected script from Evaluate");
        console.groupEnd();
        return fixed;
      }

      // No fixes provided — log issues but use original script
      console.warn("[5] No corrected script provided, using original");
    } else {
      console.log("[5] Evaluate passed");
    }
  } catch (err) {
    // Evaluate failure is non-fatal — use original script
    console.warn("[5] Evaluate failed, using original script:", err);
  }

  console.groupEnd();
  return script;
}
