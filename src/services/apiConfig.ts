/**
 * Canonical source for API endpoints, model catalog, and shared defaults.
 * This file must remain a leaf module — no imports from other src/services files.
 */

export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

export const AVAILABLE_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite (Preview)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
  { id: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro (Preview)" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];

export const DEFAULT_MODEL: ModelId = "gemini-2.0-flash";

export const DEFAULT_TTS_VOICE = "Kore";

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

export const DEFAULT_BGM_MOOD: BgmMood = "ambient";

export const IMAGE_GEN_MODEL = "gemini-2.5-flash-image" as const;
