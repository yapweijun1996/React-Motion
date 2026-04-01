/**
 * Settings validation — separated from VideoScript validation.
 */

import type { ValidationResult } from "./validateEnums";

// ============================================================
// Type guard helpers (duplicated from validate.ts — tiny 1-liners)
// ============================================================

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

// ============================================================
// Settings types
// ============================================================

export type ExportQuality = "draft" | "standard" | "high";

export type BgmMood = "corporate" | "upbeat" | "calm" | "dramatic" | "inspirational" | "playful" | "cinematic" | "ambient";

export type AppSettings = {
  geminiApiKey: string;
  geminiModel: string;
  ttsVoice: string;
  ttsConcurrency: number;
  exportQuality: ExportQuality;
  canvasEffects: boolean;
  bgMusicEnabled: boolean;
  bgMusicMood: BgmMood;
};

const VALID_MODEL_IDS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-3-flash-preview",
  "gemini-2.5-pro-preview-05-06",
  "gemini-3-pro-preview",
] as const;

// ============================================================
// Settings validation
// ============================================================

export function validateSettings(input: unknown): ValidationResult<AppSettings> {
  const warnings: string[] = [];

  if (!isObj(input)) {
    return { ok: false, errors: ["Settings is not an object"], warnings };
  }

  const geminiApiKey = isStr(input.geminiApiKey) ? input.geminiApiKey.trim() : "";
  let geminiModel = isStr(input.geminiModel) ? input.geminiModel.trim() : "";

  if (geminiModel && !(VALID_MODEL_IDS as readonly string[]).includes(geminiModel)) {
    warnings.push(`Unknown model "${geminiModel}", falling back to default`);
    geminiModel = "gemini-2.0-flash";
  }

  if (!geminiModel) {
    geminiModel = "gemini-2.0-flash";
  }

  // TTS voice — lazy import avoided; just validate as non-empty string, default "Kore"
  let ttsVoice = isStr(input.ttsVoice) ? input.ttsVoice.trim() : "Kore";
  if (!ttsVoice) ttsVoice = "Kore";

  let ttsConcurrency = isNum(input.ttsConcurrency) ? input.ttsConcurrency : 2;
  if (ttsConcurrency < 1 || ttsConcurrency > 5) {
    warnings.push(`ttsConcurrency ${ttsConcurrency} out of range [1-5], clamping`);
    ttsConcurrency = Math.max(1, Math.min(5, Math.round(ttsConcurrency)));
  }

  const VALID_EXPORT_QUALITIES: ExportQuality[] = ["draft", "standard", "high"];
  let exportQuality: ExportQuality = isStr(input.exportQuality) && VALID_EXPORT_QUALITIES.includes(input.exportQuality as ExportQuality)
    ? (input.exportQuality as ExportQuality)
    : "standard";

  const canvasEffects = typeof input.canvasEffects === "boolean" ? input.canvasEffects : false;

  const bgMusicEnabled = typeof input.bgMusicEnabled === "boolean" ? input.bgMusicEnabled : false;

  const VALID_BGM_MOODS: BgmMood[] = ["corporate", "upbeat", "calm", "dramatic", "inspirational", "playful", "cinematic", "ambient"];
  const bgMusicMood: BgmMood = isStr(input.bgMusicMood) && VALID_BGM_MOODS.includes(input.bgMusicMood as BgmMood)
    ? (input.bgMusicMood as BgmMood)
    : "ambient";

  return {
    ok: true,
    data: { geminiApiKey, geminiModel, ttsVoice, ttsConcurrency, exportQuality, canvasEffects, bgMusicEnabled, bgMusicMood },
    warnings,
  };
}
