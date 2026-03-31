import type { BusinessData, VideoScript } from "../types";
import { callGemini } from "./gemini";
import { buildSystemPrompt, buildUserMessage } from "./prompt";
import { parseVideoScript } from "./parseScript";

export async function generateScript(
  userPrompt: string,
  data?: BusinessData,
): Promise<VideoScript> {
  console.group("[ReactMotion] generateScript");

  // 1. Log inputs
  console.log("[1] User prompt:", userPrompt);
  console.log("[1] Structured data:", data ? JSON.stringify(data, null, 2) : "(none — AI extracts from prompt)");

  // 2. Build and log messages
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(userPrompt, data);
  console.log("[2] System prompt length:", systemPrompt.length, "chars");
  console.log("[2] User message:", userMessage);

  // 3. Call Gemini
  const raw = await callGemini(systemPrompt, userMessage);
  console.log("[3] Gemini raw response:", raw);

  // 4. Parse and validate
  const script = parseVideoScript(raw);
  console.log("[4] Parsed VideoScript:", JSON.stringify(script, null, 2));
  console.log("[4] Scenes:", script.scenes.length, "total");
  script.scenes.forEach((s, i) => {
    console.log(
      `  Scene ${i}: type=${s.type}, start=${s.startFrame}, duration=${s.durationInFrames}`,
      s.props,
    );
  });

  console.groupEnd();
  return script;
}
