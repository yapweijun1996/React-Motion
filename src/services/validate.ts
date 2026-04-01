/**
 * Unified runtime schema validation.
 *
 * Single source of truth for all enums, ranges, and structural checks.
 * Called by: parseScript, cache, settingsStore, agentLoop.
 *
 * Design: validate functions return { ok, data?, errors } — never throw.
 * Callers decide whether to throw, log, or recover.
 */

import type { VideoScript, VideoScene, SceneElement, ThemeConfig } from "../types";

// ============================================================
// Canonical enums — used everywhere (prompt, parser, renderer)
// ============================================================

export const VALID_ELEMENT_TYPES = [
  "text", "metric", "bar-chart", "pie-chart", "line-chart",
  "sankey", "list", "divider", "callout", "kawaii", "lottie", "icon", "annotation", "svg", "map",
] as const;

export const VALID_LAYOUTS = ["column", "center", "row"] as const;

export const VALID_TRANSITIONS = [
  "fade", "slide", "wipe", "clock-wipe",
  "radial-wipe", "diamond-wipe", "iris", "zoom-out",
  "zoom-blur", "slide-up", "split", "rotate",
] as const;

export const VALID_ANIMATIONS = [
  "fade", "slide-up", "slide-left", "slide-right",
  "zoom", "bounce", "rubber-band", "scale-rotate", "flip",
] as const;

export const VALID_STAGGER_SPEEDS = ["tight", "normal", "relaxed", "dramatic"] as const;

export const VALID_THEME_STYLES = ["corporate", "modern", "minimal"] as const;

// ============================================================
// Range constraints
// ============================================================

export const CONSTRAINTS = {
  MIN_VIDEO_WIDTH: 1920,
  MIN_VIDEO_HEIGHT: 1080,
  MIN_SCENE_FRAMES: 30,   // Must exceed TRANSITION_FRAMES (20)
  MAX_SCENE_FRAMES: 1800,  // 60s at 30fps
  MIN_FPS: 24,
  MAX_FPS: 60,
  DEFAULT_FPS: 30,
  DEFAULT_DURATION: 300,   // 10s at 30fps
  DEFAULT_SCENE_DURATION: 150, // 5s at 30fps
  MAX_ELEMENTS_PER_SCENE: 10,
} as const;

// ============================================================
// Validation result type
// ============================================================

export type ValidationResult<T> = {
  ok: true;
  data: T;
  warnings: string[];
} | {
  ok: false;
  errors: string[];
  warnings: string[];
};

// ============================================================
// Type guard helpers
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

function toNum(v: unknown, fallback: number): number {
  if (isNum(v)) return v;
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function inEnum<T extends string>(v: unknown, allowed: readonly T[]): v is T {
  return isStr(v) && (allowed as readonly string[]).includes(v);
}

// ============================================================
// VideoScript validation
// ============================================================

export function validateVideoScript(input: unknown): ValidationResult<VideoScript> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Auto-recover: if input is a JSON string, parse it
  let resolved = input;
  if (typeof resolved === "string") {
    try {
      resolved = JSON.parse(resolved);
    } catch { /* not JSON, fall through to error */ }
  }

  if (!isObj(resolved)) {
    return { ok: false, errors: [`Input is not an object (got ${typeof resolved})`], warnings };
  }

  const obj = resolved;

  // --- Required fields ---
  if (!isStr(obj.title) || obj.title.trim().length === 0) {
    errors.push("Missing or empty 'title'");
  }

  if (!Array.isArray(obj.scenes)) {
    errors.push("Missing 'scenes' array");
    return { ok: false, errors, warnings };
  }

  if (obj.scenes.length === 0) {
    errors.push("'scenes' array is empty — at least one scene required");
    return { ok: false, errors, warnings };
  }

  // --- Top-level numerics ---
  const fps = clamp(toNum(obj.fps, CONSTRAINTS.DEFAULT_FPS), CONSTRAINTS.MIN_FPS, CONSTRAINTS.MAX_FPS);
  const width = Math.max(toNum(obj.width, CONSTRAINTS.MIN_VIDEO_WIDTH), CONSTRAINTS.MIN_VIDEO_WIDTH);
  const height = Math.max(toNum(obj.height, CONSTRAINTS.MIN_VIDEO_HEIGHT), CONSTRAINTS.MIN_VIDEO_HEIGHT);

  // --- Scenes ---
  const scenes: VideoScene[] = [];
  for (let i = 0; i < obj.scenes.length; i++) {
    const sceneResult = validateScene(obj.scenes[i], i);
    if (!sceneResult.ok) {
      errors.push(...sceneResult.errors);
    } else {
      scenes.push(sceneResult.data);
      warnings.push(...sceneResult.warnings);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  // --- Recalculate total duration from scenes ---
  const totalDuration = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);

  // --- Theme ---
  const theme = validateTheme(obj.theme);

  const script: VideoScript = {
    id: isStr(obj.id) ? obj.id : "ai-script",
    title: (obj.title as string).trim(),
    fps,
    width,
    height,
    durationInFrames: totalDuration || toNum(obj.durationInFrames, CONSTRAINTS.DEFAULT_DURATION),
    scenes,
    narrative: isStr(obj.narrative) ? obj.narrative : "",
    theme: theme ?? undefined,
  };

  return { ok: true, data: script, warnings };
}

// ============================================================
// Scene validation
// ============================================================

function validateScene(input: unknown, index: number): ValidationResult<VideoScene> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Scene ${index}`;

  // Auto-recover stringified scenes
  let resolved = input;
  if (typeof resolved === "string") {
    try { resolved = JSON.parse(resolved); } catch { /* not JSON */ }
  }

  if (!isObj(resolved)) {
    return { ok: false, errors: [`${prefix}: not an object (got ${typeof resolved})`], warnings };
  }

  const s = resolved;

  // --- Elements (required) ---
  if (!Array.isArray(s.elements)) {
    return { ok: false, errors: [`${prefix}: missing 'elements' array`], warnings };
  }

  if (s.elements.length === 0) {
    warnings.push(`${prefix}: empty elements array`);
  }

  if (s.elements.length > CONSTRAINTS.MAX_ELEMENTS_PER_SCENE) {
    warnings.push(`${prefix}: ${s.elements.length} elements (max recommended: ${CONSTRAINTS.MAX_ELEMENTS_PER_SCENE})`);
  }

  const elements: SceneElement[] = [];
  for (let j = 0; j < s.elements.length; j++) {
    const elResult = validateElement(s.elements[j], index, j);
    if (!elResult.ok) {
      errors.push(...elResult.errors);
    } else {
      elements.push(elResult.data);
      warnings.push(...elResult.warnings);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  // --- Optional enums ---
  const layout = inEnum(s.layout, VALID_LAYOUTS) ? s.layout : undefined;
  if (s.layout && !layout) {
    warnings.push(`${prefix}: invalid layout "${s.layout}", ignoring`);
  }

  const transition = inEnum(s.transition, VALID_TRANSITIONS) ? s.transition : undefined;
  if (s.transition && !transition) {
    warnings.push(`${prefix}: invalid transition "${s.transition}", ignoring`);
  }

  const scene: VideoScene = {
    id: isStr(s.id) ? s.id : `scene-${index}`,
    startFrame: Math.max(0, toNum(s.startFrame, 0)),
    durationInFrames: clamp(
      toNum(s.durationInFrames, CONSTRAINTS.DEFAULT_SCENE_DURATION),
      CONSTRAINTS.MIN_SCENE_FRAMES,
      CONSTRAINTS.MAX_SCENE_FRAMES,
    ),
    bgColor: isStr(s.bgColor) ? s.bgColor : undefined,
    layout,
    padding: isStr(s.padding) ? s.padding : undefined,
    elements,
    transition,
    narration: isStr(s.narration) ? s.narration : undefined,
  };

  return { ok: true, data: scene, warnings };
}

// ============================================================
// Element validation
// ============================================================

function validateElement(
  input: unknown,
  sceneIndex: number,
  elemIndex: number,
): ValidationResult<SceneElement> {
  const prefix = `Scene ${sceneIndex}, element ${elemIndex}`;
  const warnings: string[] = [];

  // Auto-recover: Gemini function calling sometimes stringifies nested objects
  let resolved = input;
  if (typeof resolved === "string") {
    try {
      resolved = JSON.parse(resolved);
    } catch { /* not JSON */ }
  }

  if (!isObj(resolved)) {
    return { ok: false, errors: [`${prefix}: not an object (got ${typeof resolved})`], warnings };
  }

  const e = resolved;

  const type = e.type;
  if (!isStr(type)) {
    return {
      ok: false,
      errors: [`${prefix}: missing "type" field. Keys: ${Object.keys(e).join(", ")}`],
      warnings,
    };
  }

  if (!inEnum(type, VALID_ELEMENT_TYPES)) {
    return {
      ok: false,
      errors: [`${prefix}: invalid type "${type}". Valid: ${VALID_ELEMENT_TYPES.join(", ")}`],
      warnings,
    };
  }

  // --- Validate common optional fields ---
  const el: SceneElement = { ...e, type } as SceneElement;

  if (e.stagger !== undefined && !inEnum(e.stagger, VALID_STAGGER_SPEEDS)) {
    warnings.push(`${prefix}: invalid stagger "${e.stagger}", defaulting to "normal"`);
    el.stagger = "normal";
  }

  if (e.animation !== undefined && !inEnum(e.animation, VALID_ANIMATIONS)) {
    warnings.push(`${prefix}: invalid animation "${e.animation}", defaulting to "fade"`);
    (el as Record<string, unknown>).animation = "fade";
  }

  if (e.delay !== undefined) {
    const d = toNum(e.delay, 0);
    el.delay = Math.max(0, d);
  }

  return { ok: true, data: el, warnings };
}

// ============================================================
// Theme validation
// ============================================================

function validateTheme(input: unknown): ThemeConfig | null {
  if (!isObj(input)) return null;

  return {
    primaryColor: isStr(input.primaryColor) ? input.primaryColor : undefined,
    secondaryColor: isStr(input.secondaryColor) ? input.secondaryColor : undefined,
    fontFamily: isStr(input.fontFamily) ? input.fontFamily : undefined,
    style: inEnum(input.style, VALID_THEME_STYLES) ? input.style : undefined,
  };
}

// ============================================================
// Settings validation
// ============================================================

export type ExportQuality = "draft" | "standard" | "high";

export type BgmMood = "corporate" | "upbeat" | "calm" | "dramatic" | "inspirational" | "playful" | "cinematic" | "ambient";

export type AppSettings = {
  geminiApiKey: string;
  geminiModel: string;
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
] as const;

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
    data: { geminiApiKey, geminiModel, ttsConcurrency, exportQuality, canvasEffects, bgMusicEnabled, bgMusicMood },
    warnings,
  };
}

// ============================================================
// Utility
// ============================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
