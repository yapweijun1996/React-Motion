import { loadSettings } from "./settingsStore";
import { logWarn } from "./errors";
import { trackEvent } from "./metrics";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_BGM_MODEL = "lyria-3-clip-preview";

/** Predefined mood presets for AI to choose from */
export const BGM_MOODS = [
  "corporate",
  "upbeat",
  "calm",
  "dramatic",
  "inspirational",
  "playful",
  "cinematic",
  "ambient",
] as const;

export type BgmMood = (typeof BGM_MOODS)[number];

export type BgmResult = {
  blobUrl: string;
  durationMs: number;
  mimeType: string;
  mood: string;
};

/** Mood → prompt mapping for Lyria */
const MOOD_PROMPTS: Record<BgmMood, string> = {
  corporate: "Professional corporate background music, clean and modern, suitable for business presentation",
  upbeat: "Upbeat positive background music, energetic and optimistic, suitable for product showcase",
  calm: "Calm relaxing background music, gentle and soothing, suitable for data storytelling",
  dramatic: "Dramatic cinematic background music, building tension, suitable for impactful reveal",
  inspirational: "Inspirational uplifting background music, motivating and hopeful, suitable for success story",
  playful: "Playful fun background music, light and cheerful, suitable for casual presentation",
  cinematic: "Cinematic orchestral background music, epic and grand, suitable for keynote",
  ambient: "Minimal ambient background music, subtle atmospheric texture, unobtrusive",
};

// --- Public API ---

const RETRY_BASE_MS = 2000;
const MAX_RETRIES = 2;

/**
 * Generate background music from a mood keyword or custom prompt.
 * Returns a blob URL to the generated audio.
 */
export async function generateBgMusic(
  moodOrPrompt: BgmMood | string,
  onProgress?: (status: string) => void,
): Promise<BgmResult> {
  const prompt =
    (MOOD_PROMPTS as Record<string, string>)[moodOrPrompt] ?? moodOrPrompt;

  console.log(`[BGM] Generating music, mood/prompt: "${moodOrPrompt}"`);
  onProgress?.("Generating background music...");
  const t0 = performance.now();

  try {
    const { data, mimeType } = await callLyriaWithRetry(prompt);
    const blob = base64ToBlob(data, mimeType);
    const blobUrl = URL.createObjectURL(blob);
    const durationMs = await getAudioDuration(blobUrl);

    const elapsed = Math.round(performance.now() - t0);
    console.log(`[BGM] Generated in ${elapsed}ms, duration: ${durationMs}ms, type: ${mimeType}`);

    trackEvent("bgm", true, elapsed, { mood: moodOrPrompt, durationMs });
    onProgress?.("Background music ready");

    return { blobUrl, durationMs, mimeType, mood: moodOrPrompt };
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    trackEvent("bgm", false, elapsed, { mood: moodOrPrompt, error: String(err) });
    logWarn("BGM", "BGM_GENERATION_FAILED", `Background music generation failed`, { error: err });
    throw err;
  }
}

// --- Lyria API ---

type LyriaResponse = {
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

async function callLyria(
  prompt: string,
): Promise<{ data: string; mimeType: string }> {
  const { geminiApiKey } = loadSettings();
  if (!geminiApiKey) throw new Error("Gemini API key not configured");

  const model =
    import.meta.env.VITE_BGM_MODEL ||
    import.meta.env.DEVELOPMENT_BGM_MODEL ||
    DEFAULT_BGM_MODEL;

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
    },
  };

  console.log(`[BGM] Calling ${model}, prompt length: ${prompt.length}`);
  const t0 = performance.now();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BGM API error (${res.status}): ${err}`);
  }

  const data: LyriaResponse = await res.json();
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

  // Lyria returns multiple parts: text caption(s) + audio inlineData
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const audioPart = parts.find(
    (p: { inlineData?: { data?: string } }) => p.inlineData?.data,
  );

  if (!audioPart?.inlineData?.data) {
    throw new Error("BGM returned empty audio data");
  }

  const { data: audioData, mimeType: mime } = audioPart.inlineData;
  console.log(`[BGM] Response in ${elapsed}s, mimeType: ${mime}`);
  return { data: audioData, mimeType: mime ?? "audio/mpeg" };
}

// --- Retry logic ---

const RETRYABLE_CODES = ["429", "500", "502", "503"];

async function callLyriaWithRetry(
  prompt: string,
): Promise<{ data: string; mimeType: string }> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callLyria(prompt);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable = RETRYABLE_CODES.some((c) => lastError!.message.includes(c));
      if (!isRetryable || attempt >= MAX_RETRIES) throw lastError;

      const delayMs = RETRY_BASE_MS * Math.pow(2, attempt);
      console.log(`[BGM] Transient error, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError ?? new Error("BGM retry exhausted");
}

// --- Helpers ---

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

/** Get audio duration by loading into an HTMLAudioElement */
function getAudioDuration(blobUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      const ms = Math.ceil(audio.duration * 1000);
      URL.revokeObjectURL(audio.src); // cleanup temp listener
      resolve(ms);
    };
    audio.onerror = () => {
      reject(new Error("Failed to read audio duration"));
    };

    audio.src = blobUrl;
  });
}
