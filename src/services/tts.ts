import { loadSettings } from "./settingsStore";
import { logWarn } from "./errors";
import { trackEvent } from "./metrics";
import type { VideoScene } from "../types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = "Kore";
const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2; // 16-bit PCM

// --- Gemini TTS voice catalog (30 voices) ---

export const TTS_VOICES = [
  { id: "Kore", desc: "Firm" },
  { id: "Zephyr", desc: "Bright" },
  { id: "Puck", desc: "Upbeat" },
  { id: "Charon", desc: "Informative" },
  { id: "Fenrir", desc: "Excitable" },
  { id: "Aoede", desc: "Breezy" },
  { id: "Leda", desc: "Youthful" },
  { id: "Orus", desc: "Firm" },
  { id: "Perseus", desc: "Gruff" },
  { id: "Tanpura", desc: "Calm" },
  { id: "Achernar", desc: "Soft" },
  { id: "Gacrux", desc: "Mature" },
  { id: "Achird", desc: "Friendly" },
  { id: "Sulafat", desc: "Warm" },
  { id: "Schedar", desc: "Even" },
  { id: "Algieba", desc: "Smooth" },
  { id: "Despina", desc: "Smooth" },
  { id: "Erinome", desc: "Clear" },
  { id: "Pulcherrima", desc: "Forward" },
  { id: "Sadachbia", desc: "Lively" },
  { id: "Sadaltager", desc: "Knowledgeable" },
  { id: "Zubenelgenubi", desc: "Casual" },
  { id: "Vindemiatrix", desc: "Gentle" },
  { id: "Iapetus", desc: "Clear" },
  { id: "Umbriel", desc: "Easy-going" },
  { id: "Callirhoe", desc: "Easy-going" },
  { id: "Enceladus", desc: "Breathy" },
  { id: "Autonoe", desc: "Bright" },
  { id: "Laomedeia", desc: "Upbeat" },
  { id: "Rasalgethi", desc: "Informative" },
] as const;

export const VALID_TTS_VOICE_IDS = TTS_VOICES.map((v) => v.id);

export function getAvailableTtsVoices() {
  return TTS_VOICES;
}

export type TTSProgress = {
  scenesProcessed: number;
  totalScenes: number;
  currentSceneId: string;
};

// --- Public API ---

/** Base delay before retrying a rate-limited request (exponential backoff) */
const RETRY_BASE_MS = 2000;
const MAX_RETRIES = 3;

/**
 * Generate TTS audio for all scenes that have narration text.
 * Uses controlled parallelism (concurrency from settings, default 2) with exponential backoff retry.
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

  const { ttsVoice } = loadSettings();
  const results = new Map<string, { url: string; durationMs: number }>();
  let processed = 0;
  let failedCount = 0;

  const processSingle = async (scene: VideoScene): Promise<void> => {
    let url: string | null = null;
    try {
      const { pcmBase64 } = await callGeminiTTSWithRetry(scene.narration!, ttsVoice);
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
 * Call Gemini TTS with exponential backoff retry on transient errors (429/500/502/503).
 * Up to MAX_RETRIES attempts with increasing delay: 2s, 4s, 8s.
 */
async function callGeminiTTSWithRetry(
  text: string,
  voiceName?: string,
): Promise<{ pcmBase64: string; mimeType: string }> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGeminiTTS(text, voiceName);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isRetryable = RETRYABLE_CODES.some((c) => lastError!.message.includes(c));
      if (!isRetryable || attempt >= MAX_RETRIES) {
        throw lastError;
      }

      const code = RETRYABLE_CODES.find((c) => lastError!.message.includes(c)) ?? "?";
      const delayMs = RETRY_BASE_MS * Math.pow(2, attempt); // 2s, 4s, 8s
      console.log(`[TTS] Transient error (${code}), retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error("TTS retry exhausted");
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

// --- Voice preview ---

/** Generate a short TTS sample for the given voice. Returns a blob URL (caller must revoke). */
export async function previewVoice(voiceId: string): Promise<string> {
  const { pcmBase64 } = await callGeminiTTS(
    "Hello, this is a preview of my voice. How does it sound?",
    voiceId,
  );
  const { blob } = pcmToWav(pcmBase64, SAMPLE_RATE);
  return URL.createObjectURL(blob);
}
