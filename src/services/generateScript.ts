import type { BusinessData, VideoScript } from "../types";
import { buildAgentSystemPrompt, buildUserMessage, buildSystemPrompt } from "./prompt";
import { parseVideoScript } from "./parseScript";
import { evaluateScript } from "./evaluate";
import { runAgentLoop, type AgentProgress } from "./agentLoop";
import { callGemini, type GeminiMessage } from "./gemini";
import { generateSceneTTS } from "./tts";
import { generateBgMusic } from "./bgMusic";
import { adjustSceneTimings } from "./adjustTiming";
import { loadSettings } from "./settingsStore";
import { trackEvent } from "./metrics";

export type GenerationProgress = {
  stage: "agent" | "evaluate" | "tts" | "bgm" | "done";
  message: string;
  agentDetail?: AgentProgress;
};

const MAX_PARSE_RETRIES = 2;

export async function generateScript(
  userPrompt: string,
  data?: BusinessData,
  onProgress?: (p: GenerationProgress) => void,
): Promise<VideoScript> {
  console.group("[ReactMotion] generateScript (OODAE Agent)");
  const t0 = performance.now();

  // --- Phase 1: Agent Loop (Observe → Orient → Decide → Act) ---
  onProgress?.({ stage: "agent", message: "Agent starting..." });

  const systemPrompt = buildAgentSystemPrompt();
  const userMessage = buildUserMessage(userPrompt, data);

  let scriptJson: Record<string, unknown>;
  let iterations: number;

  try {
    const result = await runAgentLoop(
      systemPrompt,
      userMessage,
      { userPrompt, data },
      (agentProgress) => {
        onProgress?.({
          stage: "agent",
          message: formatAgentMessage(agentProgress),
          agentDetail: agentProgress,
        });
      },
    );
    scriptJson = result.scriptJson;
    iterations = result.iterations;
    console.log(`[Agent] Completed in ${iterations} iterations`);
  } catch (err) {
    // Fallback: if agent loop fails, try legacy single-shot
    console.warn("[Agent] Loop failed, falling back to legacy single-shot:", err);
    onProgress?.({ stage: "agent", message: "Falling back to direct generation..." });
    scriptJson = await legacyGenerate(userPrompt, data);
    iterations = 0;
  }

  // --- Parse the script JSON ---
  let script: VideoScript;
  try {
    script = parseVideoScript(JSON.stringify(scriptJson));
    console.log("[Parse] OK. Scenes:", script.scenes.length);
  } catch (parseErr) {
    // If parse fails, try one retry with legacy approach
    console.warn("[Parse] Agent output failed validation:", parseErr);
    onProgress?.({ stage: "agent", message: "Fixing script format..." });
    scriptJson = await legacyGenerate(userPrompt, data);
    script = parseVideoScript(JSON.stringify(scriptJson));
  }

  // --- Phase 2: Evaluate ---
  onProgress?.({ stage: "evaluate", message: "Evaluating quality..." });
  console.log("[Evaluate] Starting...");

  try {
    const evalResult = await evaluateScript(userPrompt, script);
    if (!evalResult.pass && evalResult.fixes) {
      script = parseVideoScript(JSON.stringify(evalResult.fixes));
      console.log("[Evaluate] Applied corrections");
    } else if (evalResult.pass) {
      console.log("[Evaluate] Passed");
    }
  } catch (err) {
    console.warn("[Evaluate] Failed (non-fatal):", err);
  }

  // --- Phase 3: TTS ---
  onProgress?.({ stage: "tts", message: "Generating narration audio..." });
  console.log("[TTS] Generating...");

  try {
    const scenesWithTTS = await generateSceneTTS(script.scenes, (p) => {
      onProgress?.({
        stage: "tts",
        message: `Generating narration (${p.scenesProcessed + 1}/${p.totalScenes})...`,
      });
    });
    script = adjustSceneTimings({ ...script, scenes: scenesWithTTS });
    console.log("[TTS] Done. Adjusted duration:", script.durationInFrames, "frames");
  } catch (err) {
    console.warn("[TTS] Failed (non-fatal):", err);
  }

  // --- Phase 4: Background Music (if enabled) ---
  const { bgMusicEnabled, bgMusicMood } = loadSettings();
  if (bgMusicEnabled) {
    onProgress?.({ stage: "bgm", message: "Generating background music..." });
    console.log(`[BGM] Generating (mood: ${bgMusicMood})...`);

    try {
      const bgm = await generateBgMusic(bgMusicMood, (status) => {
        onProgress?.({ stage: "bgm", message: status });
      });
      script = { ...script, bgMusicUrl: bgm.blobUrl, bgMusicDurationMs: bgm.durationMs };
      console.log(`[BGM] Done. Duration: ${bgm.durationMs}ms`);
    } catch (err) {
      console.warn("[BGM] Failed (non-fatal):", err);
    }
  }

  onProgress?.({ stage: "done", message: "Done" });
  const durationMs = Math.round(performance.now() - t0);
  trackEvent("generation", true, durationMs, {
    scenes: script.scenes.length,
    iterations,
    durationFrames: script.durationInFrames,
  });
  console.groupEnd();
  return script;
}

// --- Legacy single-shot fallback ---

async function legacyGenerate(
  userPrompt: string,
  data?: BusinessData,
): Promise<Record<string, unknown>> {
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(userPrompt, data);
  const messages: GeminiMessage[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
    const raw = await callGemini(systemPrompt, messages);
    try {
      return JSON.parse(raw);
    } catch {
      if (attempt < MAX_PARSE_RETRIES) {
        messages.push(
          { role: "model", parts: [{ text: raw }] },
          { role: "user", parts: [{ text: "Invalid JSON. Fix it and return ONLY the corrected JSON." }] },
        );
      }
    }
  }

  throw new Error("Legacy generation failed after retries");
}

// --- Progress message formatting ---

function formatAgentMessage(p: AgentProgress): string {
  const LABELS: Record<string, string> = {
    thinking: "Thinking...",
    "tool:analyze_data": "Analyzing data...",
    "tool:draft_storyboard": "Writing storyboard...",
    "tool:get_element_catalog": "Reviewing elements...",
    "tool:produce_script": "Producing video script...",
    text_only: "Processing...",
    fallback_json: "Parsing output...",
    max_reached: "Finalizing...",
    force_output: "Generating final script...",
  };

  const label = LABELS[p.action] ?? `Agent: ${p.action}`;
  return `[${p.iteration}/${p.maxIterations}] ${label}`;
}
