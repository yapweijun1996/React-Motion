import type { BusinessData, VideoScript } from "../types";
import { buildAgentSystemPrompt, buildUserMessage, buildSystemPrompt } from "./prompt";
import { parseVideoScript } from "./parseScript";
import { runAgentLoop, type AgentProgress } from "./agentLoop";
import { callGemini, type GeminiMessage } from "./gemini";
import { generateSceneTTS } from "./tts";
import { generateBgMusic } from "./bgMusic";
import { generateImage } from "./imageGen";
import { generateSvgElements } from "./svgGen";
import { adjustSceneTimings } from "./adjustTiming";
import { loadSettings } from "./settingsStore";
import { trackEvent } from "./metrics";
import { getImageHints } from "./agentToolRegistry";
import { JSON_PARSE_MAX_RETRIES } from "./agentConfig";
import { formatAgentMessage, concurrentPool } from "./generateScriptHelpers";
import { resetCostTracker, getCostSummary, formatCostLog, recordBgmCost, recordImageCost } from "./costTracker";

export type GenerationProgress = {
  stage: "agent" | "evaluate" | "svgGen" | "tts" | "bgm" | "imageGen" | "done";
  stageIndex: number;
  stageCount: number;
  stageLabel: string;
  message: string;
  percent: number;
  elapsedMs: number;
  /** Absolute timestamp (performance.now()) when generation started — used for real-time elapsed display */
  startTime: number;
  eta?: number;
  completedTools?: string[];
  agentDetail?: AgentProgress;
  /** Cost summary — only present when stage === "done" */
  costSummary?: import("./costTracker").CostSummary;
};

// --- Stage weights based on real timing data ---
const STAGE_WEIGHTS = [26, 0, 8, 43, 12, 11]; // agent, skip, svgGen, tts, bgm, imageGen → sums to 100
const STAGE_LABELS = ["AI Scripting", "Quality Check", "SVG Generation", "Narration", "Background Music", "Image Generation"];

/** Lightweight progress tracker — computes percent, elapsed, ETA */
function createProgressTracker(onProgress?: (p: GenerationProgress) => void) {
  const t0 = performance.now();
  let stageIdx = 0;
  const completedTools: string[] = [];

  function basePercent(idx: number): number {
    return STAGE_WEIGHTS.slice(0, idx).reduce((a, b) => a + b, 0);
  }

  function emit(overrides: Partial<GenerationProgress>) {
    if (!onProgress) return;
    onProgress({
      stage: (["agent", "evaluate", "svgGen", "tts", "bgm", "imageGen"] as const)[stageIdx],
      stageIndex: stageIdx,
      stageCount: 6,
      stageLabel: STAGE_LABELS[stageIdx],
      message: "",
      percent: basePercent(stageIdx),
      elapsedMs: Math.round(performance.now() - t0),
      startTime: t0,
      completedTools: stageIdx === 0 ? [...completedTools] : undefined,
      ...overrides,
    });
  }

  return {
    setStage(idx: number, message: string) {
      stageIdx = idx;
      emit({ message, percent: basePercent(idx) });
    },

    reportAgent(p: AgentProgress) {
      // Track completed tools
      if (p.action.startsWith("tool:")) {
        const toolName = p.action.slice(5);
        if (!completedTools.includes(toolName)) completedTools.push(toolName);
      }
      const msg = formatAgentMessage(p, completedTools);
      // Intra-stage: estimate ~6 iterations typical
      const intra = Math.min(p.iteration / 6, 0.95);
      emit({
        message: msg,
        percent: basePercent(0) + STAGE_WEIGHTS[0] * intra,
        completedTools: [...completedTools],
        agentDetail: p,
      });
    },

    reportTTS(scenesProcessed: number, totalScenes: number, ttsStartMs: number) {
      const intra = totalScenes > 0 ? scenesProcessed / totalScenes : 0;
      const elapsed = performance.now() - ttsStartMs;
      const avgPerScene = scenesProcessed > 0 ? elapsed / scenesProcessed : 0;
      const remaining = (totalScenes - scenesProcessed) * avgPerScene;
      const eta = scenesProcessed > 0 ? Math.round(remaining / 1000) : undefined;
      emit({
        message: `Generating narration (${scenesProcessed}/${totalScenes})...`,
        percent: basePercent(2) + STAGE_WEIGHTS[2] * intra,
        eta,
      });
    },

    reportSimple(message: string) {
      emit({ message });
    },

    done(costSummary?: import("./costTracker").CostSummary) {
      emit({ stage: "done", stageIndex: 6, stageLabel: "Done", message: "Done", percent: 100, costSummary });
    },
  };
}

const MAX_PARSE_RETRIES = JSON_PARSE_MAX_RETRIES;

export async function generateScript(
  userPrompt: string,
  data?: BusinessData,
  onProgress?: (p: GenerationProgress) => void,
): Promise<VideoScript> {
  console.group("[ReactMotion] generateScript (OODAE Agent)");
  resetCostTracker();
  const tracker = createProgressTracker(onProgress);

  // --- Phase 1: Agent Loop ---
  tracker.setStage(0, "Agent starting...");

  const systemPrompt = buildAgentSystemPrompt();
  const userMessage = buildUserMessage(userPrompt, data);

  let scriptJson: Record<string, unknown>;
  let iterations: number;

  try {
    const result = await runAgentLoop(
      systemPrompt,
      userMessage,
      { userPrompt, data },
      (agentProgress) => tracker.reportAgent(agentProgress),
    );
    scriptJson = result.scriptJson;
    iterations = result.iterations;
    const bs = result.budgetSummary;
    console.log(`[Agent] Completed in ${iterations} iterations | Budget: ${bs.pctOfBudget}% (${bs.totalEstimatedTokens} tokens) [sys:${bs.breakdown.system} usr:${bs.breakdown.user} model:${bs.breakdown.model} tool:${bs.breakdown.toolResults}]`);
  } catch (err) {
    console.warn("[Agent] Loop failed, falling back to legacy single-shot:", err);
    tracker.reportSimple("Falling back to direct generation...");
    scriptJson = await legacyGenerate(userPrompt, data);
    iterations = 0;
  }

  // --- Parse ---
  let script: VideoScript;
  try {
    script = parseVideoScript(JSON.stringify(scriptJson));
    console.log("[Parse] OK. Scenes:", script.scenes.length);
  } catch (parseErr) {
    console.warn("[Parse] Agent output failed validation:", parseErr);
    tracker.reportSimple("Fixing script format...");
    scriptJson = await legacyGenerate(userPrompt, data);
    script = parseVideoScript(JSON.stringify(scriptJson));
  }

  // --- Inject imagePrompt from direct_visuals if AI didn't include them ---
  const imageHints = getImageHints();
  if (imageHints.length > 0) {
    let injected = 0;
    for (const hint of imageHints) {
      const scene = script.scenes[hint.sceneIndex];
      if (scene && !scene.imagePrompt) {
        scene.imagePrompt = hint.imagePrompt;
        injected++;
      }
    }
    if (injected > 0) {
      console.log(`[ImageGen] Injected ${injected} imagePrompt(s) from direct_visuals plan`);
    }
  }

  // --- Phase 2: Evaluate — now runs inside agent loop (RM-155) ---
  tracker.setStage(1, "Quality verified");

  // --- Phase 2b: SVG Post-Generation ---
  tracker.setStage(2, "Generating SVG diagrams...");
  try {
    script = await generateSvgElements(script, (p) => {
      tracker.reportSimple(`Generating SVG (${p.generated}/${p.total})...`);
    });
  } catch (err) {
    console.warn("[SvgGen] Failed (non-fatal):", err);
  }

  // --- Phase 3: TTS ---
  tracker.setStage(3, "Generating narration audio...");
  console.log("[TTS] Generating...");
  const ttsStart = performance.now();

  try {
    const scenesWithTTS = await generateSceneTTS(script.scenes, (p) => {
      tracker.reportTTS(p.scenesProcessed, p.totalScenes, ttsStart);
    });
    script = adjustSceneTimings({ ...script, scenes: scenesWithTTS });
    console.log("[TTS] Done. Adjusted duration:", script.durationInFrames, "frames");
  } catch (err) {
    console.warn("[TTS] Failed (non-fatal):", err);
  }

  // --- Phase 4: BGM ---
  const { bgMusicEnabled, bgMusicMood } = loadSettings();
  if (bgMusicEnabled) {
    tracker.setStage(4, "Generating background music...");
    console.log(`[BGM] Generating (mood: ${bgMusicMood})...`);

    try {
      const bgm = await generateBgMusic(bgMusicMood, (status) => {
        tracker.reportSimple(status);
      });
      script = { ...script, bgMusicUrl: bgm.blobUrl, bgMusicDurationMs: bgm.durationMs };
      recordBgmCost();
      console.log(`[BGM] Done. Duration: ${bgm.durationMs}ms`);
    } catch (err) {
      console.warn("[BGM] Failed (non-fatal):", err);
    }
  }

  // --- Phase 5: Image Generation (AI-driven) ---
  const { imageGenEnabled } = loadSettings();
  const imageScenes = script.scenes.filter((s) => s.imagePrompt?.trim());
  console.log(`[ImageGen] enabled=${imageGenEnabled}, scenes with imagePrompt=${imageScenes.length}`);
  if (imageGenEnabled) {
    if (imageScenes.length > 0) {
      tracker.setStage(5, "Generating scene images...");
      const imgTotal = imageScenes.length;
      console.log(`[ImageGen] Generating images for ${imgTotal} scenes (concurrency: 2)`);

      let imgProcessed = 0;
      const processScene = async (scene: typeof imageScenes[number]) => {
        try {
          const result = await generateImage(scene.imagePrompt!);
          scene.imageUrl = result.blobUrl;
          recordImageCost();
          console.log(`[ImageGen] Scene "${scene.id}" done`);
        } catch (err) {
          console.warn(`[ImageGen] Scene "${scene.id}" failed (non-fatal):`, err);
        }
        imgProcessed++;
        tracker.reportSimple(`Generating images (${imgProcessed}/${imgTotal})...`);
      };

      // Concurrent pool — limit to 2 parallel requests to avoid rate limits
      await concurrentPool(imageScenes, processScene, 2);
    }
  }

  // --- Cost Summary ---
  const cost = getCostSummary();
  console.log(`[Cost] ${formatCostLog(cost)}`);

  tracker.done(cost);
  trackEvent("generation", true, 0, {
    scenes: script.scenes.length,
    iterations,
    durationFrames: script.durationInFrames,
    costUsd: cost.totalUsd,
    costBreakdown: cost.breakdown,
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

// formatAgentMessage & concurrentPool extracted to generateScriptHelpers.ts
