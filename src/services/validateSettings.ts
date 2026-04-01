/**
 * Settings validation — separated from VideoScript validation.
 */

import type { ValidationResult } from "./validateEnums";
import { AVAILABLE_MODELS, DEFAULT_MODEL, DEFAULT_TTS_VOICE, BGM_MOODS, DEFAULT_BGM_MOOD, type BgmMood } from "./apiConfig";

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

export type { BgmMood } from "./apiConfig";

export type AgentMode = "single" | "multi";

export type AppSettings = {
  geminiApiKey: string;
  geminiModel: string;
  ttsVoice: string;
  ttsConcurrency: number;
  exportQuality: ExportQuality;
  canvasEffects: boolean;
  bgMusicEnabled: boolean;
  bgMusicMood: BgmMood;
  agentMode: AgentMode;
};

const VALID_MODEL_IDS: readonly string[] = AVAILABLE_MODELS.map((m) => m.id);

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

  if (geminiModel && !VALID_MODEL_IDS.includes(geminiModel)) {
    warnings.push(`Unknown model "${geminiModel}", falling back to default`);
    geminiModel = DEFAULT_MODEL;
  }

  if (!geminiModel) {
    geminiModel = DEFAULT_MODEL;
  }

  // TTS voice — lazy import avoided; just validate as non-empty string
  let ttsVoice = isStr(input.ttsVoice) ? input.ttsVoice.trim() : DEFAULT_TTS_VOICE;
  if (!ttsVoice) ttsVoice = DEFAULT_TTS_VOICE;

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

  const bgMusicMood: BgmMood = isStr(input.bgMusicMood) && (BGM_MOODS as readonly string[]).includes(input.bgMusicMood)
    ? (input.bgMusicMood as BgmMood)
    : DEFAULT_BGM_MOOD;

  const VALID_AGENT_MODES: AgentMode[] = ["single", "multi"];
  const agentMode: AgentMode = isStr(input.agentMode) && VALID_AGENT_MODES.includes(input.agentMode as AgentMode)
    ? (input.agentMode as AgentMode)
    : "single";

  return {
    ok: true,
    data: { geminiApiKey, geminiModel, ttsVoice, ttsConcurrency, exportQuality, canvasEffects, bgMusicEnabled, bgMusicMood, agentMode },
    warnings,
  };
}
