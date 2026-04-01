import { loadSettings } from "./settingsStore";
import { logWarn } from "./errors";
import { trackEvent } from "./metrics";
import { GEMINI_API_BASE, type BgmMood } from "./apiConfig";

export { BGM_MOODS, type BgmMood } from "./apiConfig";

const DEFAULT_BGM_MODEL = "lyria-3-clip-preview";

export type BgmResult = {
  blobUrl: string;
  durationMs: number;
  mimeType: string;
  mood: string;
};

/** Suffix appended to all mood prompts — ensures loopable, no vocals, stays behind narration */
const PROMPT_SUFFIX =
  ", seamless loop, soft background level, instrumental only, no vocals, no singing, no human voice";

/** Mood → prompt mapping for Lyria */
const MOOD_PROMPTS: Record<BgmMood, string> = {
  corporate:
    "Professional corporate background music, clean piano and soft synth pads, steady 100-110 BPM, modern and polished" + PROMPT_SUFFIX,
  upbeat:
    "Upbeat positive background music, light acoustic guitar and claps, bright 120-130 BPM, energetic and optimistic" + PROMPT_SUFFIX,
  calm:
    "Calm relaxing background music, gentle piano and ambient strings, slow 70-80 BPM, soothing and warm" + PROMPT_SUFFIX,
  dramatic:
    "Dramatic cinematic background music, deep cello and timpani hits, building tension at 90-100 BPM, intense and powerful" + PROMPT_SUFFIX,
  inspirational:
    "Inspirational uplifting background music, soaring strings and soft piano, hopeful 100-115 BPM, motivating and emotional" + PROMPT_SUFFIX,
  playful:
    "Playful fun background music, marimba and pizzicato strings, bouncy 115-125 BPM, light and cheerful" + PROMPT_SUFFIX,
  cinematic:
    "Cinematic orchestral background music, full orchestra with French horn, epic and grand at 85-95 BPM, sweeping and majestic" + PROMPT_SUFFIX,
  ambient:
    "Minimal ambient background music, subtle synth textures and soft pads, slow 60-70 BPM, atmospheric and unobtrusive" + PROMPT_SUFFIX,
};

// --- Public API ---

import {
  BGM_MAX_RETRIES,
  BGM_RETRY_BASE_MS,
  RETRYABLE_HTTP_CODES,
} from "./agentConfig";

const RETRY_BASE_MS = BGM_RETRY_BASE_MS;
const MAX_RETRIES = BGM_MAX_RETRIES;

/**
 * Generate background music from a mood keyword or custom prompt.
 * Returns a blob URL to the generated audio.
 */
export async function generateBgMusic(
  moodOrPrompt: BgmMood | string,
  onProgress?: (status: string) => void,
): Promise<BgmResult> {
  const preset = (MOOD_PROMPTS as Record<string, string>)[moodOrPrompt];
  // Preset already includes PROMPT_SUFFIX; for custom prompts, append it
  const prompt = preset ?? (moodOrPrompt + PROMPT_SUFFIX);

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

const RETRYABLE_CODES = RETRYABLE_HTTP_CODES;

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
      audio.src = ""; // release media decoder without revoking the blob URL
      resolve(ms);
    };
    audio.onerror = () => {
      reject(new Error("Failed to read audio duration"));
    };

    audio.src = blobUrl;
  });
}
