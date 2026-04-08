/**
 * Image generation service — calls Gemini image model and returns a browser blob URL.
 *
 * Pattern mirrors tts.ts / bgMusic.ts:
 *   public API  → retry wrapper → raw API call → blob conversion
 */

import { loadSettings } from "./settingsStore";
import { logWarn } from "./errors";
import { trackEvent } from "./metrics";
import { GEMINI_API_BASE, IMAGE_GEN_MODEL } from "./apiConfig";
import {
  IMAGE_GEN_MAX_RETRIES,
  IMAGE_GEN_RETRY_BASE_MS,
  RETRYABLE_HTTP_CODES,
} from "./agentConfig";

// ============================================================
// Types
// ============================================================

export type ImageGenResult = {
  /** Object URL — caller must revoke when no longer needed */
  blobUrl: string;
  mimeType: string;
  /** Prompt input tokens from usageMetadata (for composite cost tracking) */
  promptTokenCount?: number;
};

type ImageGenResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }[];
    };
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

// ============================================================
// Public API
// ============================================================

/**
 * Generate an image from a text prompt.
 * Returns a blob URL suitable for <img src>.
 *
 * Guards:
 *  - Checks `imageGenEnabled` setting; throws if disabled.
 *  - Checks API key existence.
 */
export async function generateImage(
  prompt: string,
  onProgress?: (status: string) => void,
): Promise<ImageGenResult> {
  const { imageGenEnabled } = loadSettings();
  if (!imageGenEnabled) {
    throw new Error("Image generation is disabled in settings");
  }

  console.log(`[ImageGen] Generating image, prompt length: ${prompt.length}`);
  onProgress?.("Generating image...");
  const t0 = performance.now();

  try {
    const { data, mimeType, promptTokenCount } = await callImageGenWithRetry(prompt);
    const blob = base64ToBlob(data, mimeType);
    const blobUrl = URL.createObjectURL(blob);

    const elapsed = Math.round(performance.now() - t0);
    console.log(`[ImageGen] Generated in ${elapsed}ms, type: ${mimeType}, promptTokens: ${promptTokenCount ?? "n/a"}`);

    trackEvent("imageGen", true, elapsed, { promptLen: prompt.length });
    onProgress?.("Image ready");

    return { blobUrl, mimeType, promptTokenCount };
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    trackEvent("imageGen", false, elapsed, { error: String(err) });
    logWarn("ImageGen", "IMAGE_GEN_FAILED", "Image generation failed", { error: err });
    throw err;
  }
}

// ============================================================
// Raw API call
// ============================================================

async function callImageGen(
  prompt: string,
): Promise<{ data: string; mimeType: string; text?: string; promptTokenCount?: number }> {
  const { geminiApiKey } = loadSettings();
  if (!geminiApiKey) throw new Error("Gemini API key not configured");

  const model =
    import.meta.env.VITE_IMAGE_GEN_MODEL ||
    import.meta.env.DEVELOPMENT_IMAGE_GEN_MODEL ||
    IMAGE_GEN_MODEL;

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  console.log(`[ImageGen] Calling ${model}, prompt length: ${prompt.length}`);
  const t0 = performance.now();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ImageGen API error (${res.status}): ${err}`);
  }

  const responseData: ImageGenResponse = await res.json();
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

  const parts = responseData?.candidates?.[0]?.content?.parts ?? [];

  // Extract image part (inlineData) and optional text part
  const imagePart = parts.find((p) => p.inlineData?.data);
  const textPart = parts.find((p) => p.text);

  if (!imagePart?.inlineData?.data) {
    throw new Error("ImageGen returned no image data");
  }

  const { data: imgData, mimeType: mime } = imagePart.inlineData;
  console.log(`[ImageGen] Response in ${elapsed}s, mimeType: ${mime}`);

  return {
    data: imgData,
    mimeType: mime ?? "image/png",
    text: textPart?.text,
    promptTokenCount: responseData?.usageMetadata?.promptTokenCount,
  };
}

// ============================================================
// Retry logic
// ============================================================

async function callImageGenWithRetry(
  prompt: string,
): Promise<{ data: string; mimeType: string; text?: string; promptTokenCount?: number }> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= IMAGE_GEN_MAX_RETRIES; attempt++) {
    try {
      return await callImageGen(prompt);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable = RETRYABLE_HTTP_CODES.some((c) =>
        lastError!.message.includes(c),
      );
      if (!isRetryable || attempt >= IMAGE_GEN_MAX_RETRIES) throw lastError;

      const delayMs = IMAGE_GEN_RETRY_BASE_MS * Math.pow(2, attempt);
      console.log(
        `[ImageGen] Transient error, retry ${attempt + 1}/${IMAGE_GEN_MAX_RETRIES} in ${delayMs}ms...`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError ?? new Error("ImageGen retry exhausted");
}

// ============================================================
// Helpers
// ============================================================

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}
