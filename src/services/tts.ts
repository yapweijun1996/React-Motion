import { loadSettings } from "./settingsStore";
import { logWarn } from "./errors";
import { trackEvent } from "./metrics";
import type { VideoScene } from "../types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = "Kore";
const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2; // 16-bit PCM

export type TTSProgress = {
  scenesProcessed: number;
  totalScenes: number;
  currentSceneId: string;
};

// --- Public API ---

/** Delay before retrying a 429'd request */
const RETRY_DELAY_MS = 1500;

/**
 * Generate TTS audio for all scenes that have narration text.
 * Uses controlled parallelism (concurrency from settings, default 2) with single 429 retry.
 * Returns new scene array with ttsAudioUrl + ttsAudioDurationMs populated.
 */
export async function generateSceneTTS(
  scenes: VideoScene[],
  onProgress?: (p: TTSProgress) => void,
): Promise<VideoScene[]> {
  const narrationScenes = scenes.filter((s) => s.narration?.trim());

  if (narrationScenes.length === 0) {
    console.log("[TTS] No scenes with narration, skipping");
    return scenes;
  }

  const total = narrationScenes.length;
  const { ttsConcurrency } = loadSettings();
  console.log(`[TTS] Generating audio for ${total} scenes (concurrency: ${ttsConcurrency})`);
  const ttsStart = performance.now();

  const results = new Map<string, { url: string; durationMs: number }>();
  let processed = 0;
  let failedCount = 0;

  const processSingle = async (scene: VideoScene): Promise<void> => {
    let url: string | null = null;
    try {
      const { pcmBase64 } = await callGeminiTTSWithRetry(scene.narration!);
      const { blob: wavBlob, durationMs } = pcmToWav(pcmBase64, SAMPLE_RATE);
      url = URL.createObjectURL(wavBlob);
      results.set(scene.id, { url, durationMs });
      console.log(`[TTS] Scene "${scene.id}": ${durationMs}ms`);
    } catch (err) {
      failedCount++;
      if (url) URL.revokeObjectURL(url);
      logWarn("TTS", "TTS_PARTIAL_FAILURE", `Scene "${scene.id}" failed — will be silent`, { error: err });
    } finally {
      processed++;
      onProgress?.({ scenesProcessed: processed, totalScenes: total, currentSceneId: scene.id });
    }
  };

  // Controlled concurrency pool
  await runPool(narrationScenes, processSingle, ttsConcurrency);

  if (failedCount > 0) {
    logWarn("TTS", "TTS_PARTIAL_FAILURE", `${failedCount}/${total} scenes failed — video will have partial audio`);
  }

  trackEvent("tts", failedCount === 0, Math.round(performance.now() - ttsStart), {
    total,
    failed: failedCount,
    concurrency: ttsConcurrency,
  });

  return scenes.map((scene) => {
    const audio = results.get(scene.id);
    if (!audio) return scene;
    return {
      ...scene,
      ttsAudioUrl: audio.url,
      ttsAudioDurationMs: audio.durationMs,
    };
  });
}

/**
 * Simple concurrency pool — runs tasks with at most `limit` in flight.
 * Zero dependencies, ~10 lines.
 */
async function runPool<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number,
): Promise<void> {
  let idx = 0;
  const next = async (): Promise<void> => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(workers);
}

/** Status codes worth retrying (transient errors) */
const RETRYABLE_CODES = ["429", "500", "502", "503"];

/**
 * Call Gemini TTS with single retry on transient errors (429/500/502/503).
 */
async function callGeminiTTSWithRetry(
  text: string,
): Promise<{ pcmBase64: string; mimeType: string }> {
  try {
    return await callGeminiTTS(text);
  } catch (err) {
    if (err instanceof Error && RETRYABLE_CODES.some((c) => err.message.includes(c))) {
      const code = RETRYABLE_CODES.find((c) => err.message.includes(c)) ?? "?";
      console.log(`[TTS] Transient error (${code}), retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
      return await callGeminiTTS(text);
    }
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Gemini TTS API ---

type TTSResponse = {
  candidates?: {
    content?: {
      parts?: {
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }[];
    };
  }[];
};

async function callGeminiTTS(
  text: string,
  voiceName?: string,
): Promise<{ pcmBase64: string; mimeType: string }> {
  const { geminiApiKey } = loadSettings();
  if (!geminiApiKey) throw new Error("Gemini API key not configured");

  const model =
    import.meta.env.VITE_GEMINI_TTS_MODEL ||
    import.meta.env.DEVELOPMENT_GEMINI_TTS_MODEL ||
    DEFAULT_TTS_MODEL;

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`;

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName ?? DEFAULT_VOICE },
        },
      },
    },
  };

  console.log(`[TTS] Calling ${model}, text length: ${text.length}`);
  const t0 = performance.now();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error (${res.status}): ${err}`);
  }

  const data: TTSResponse = await res.json();
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

  const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data) {
    throw new Error("TTS returned empty audio data");
  }

  console.log(`[TTS] Response in ${elapsed}s, mimeType: ${inlineData.mimeType}`);
  return { pcmBase64: inlineData.data, mimeType: inlineData.mimeType ?? "" };
}

// --- Audio conversion helpers ---

/** Convert base64 PCM to WAV Blob + exact duration from actual byte count. */
function pcmToWav(
  pcmBase64: string,
  sampleRate: number,
): { blob: Blob; durationMs: number } {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
  const header = buildWavHeader(pcmBytes.length, sampleRate, 1, 16);
  const blob = new Blob([header, pcmBytes], { type: "audio/wav" });
  const durationMs = Math.ceil((pcmBytes.length / (sampleRate * BYTES_PER_SAMPLE)) * 1000);
  return { blob, durationMs };
}

/** Build a 44-byte WAV RIFF header. */
function buildWavHeader(
  dataSize: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): ArrayBuffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF chunk
  writeString(view, 0, "RIFF");
  view.setUint32(4, dataSize + 36, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
