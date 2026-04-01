/** Unified runtime schema validation — validate functions return { ok, data?, errors }. */

import type { VideoScript, VideoScene, SceneElement, ThemeConfig } from "../types";
import {
  VALID_ELEMENT_TYPES,
  VALID_LAYOUTS,
  VALID_TRANSITIONS,
  VALID_ANIMATIONS,
  VALID_STAGGER_SPEEDS,
  VALID_BG_EFFECTS,
  VALID_THEME_STYLES,
  VALID_DEPTH_PRESETS,
  VALID_CAMERA_TILTS,
  VALID_PARALLAX,
  VALID_SVG3D_SHADOW,
  VALID_SVG3D_REVEAL,
  CONSTRAINTS,
} from "./validateEnums";
import type { ValidationResult } from "./validateEnums";

// Re-export for backward compatibility
export * from "./validateEnums";
export * from "./validateSettings";

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
    bgGradient: isStr(s.bgGradient) ? s.bgGradient : undefined,
    bgEffect: isStr(s.bgEffect) && VALID_BG_EFFECTS.includes(s.bgEffect as typeof VALID_BG_EFFECTS[number]) ? s.bgEffect as typeof VALID_BG_EFFECTS[number] : undefined,
    layout,
    padding: isStr(s.padding) ? s.padding : undefined,
    elements,
    transition,
    narration: isStr(s.narration) ? s.narration : undefined,
    imagePrompt: isStr(s.imagePrompt) ? s.imagePrompt : undefined,
    imageOpacity: isNum(s.imageOpacity) ? clamp(s.imageOpacity, 0, 1) : undefined,
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

  // --- svg-3d specific validation (permissive — defaults for missing) ---
  if (type === "svg-3d") {
    const r = el as Record<string, unknown>;
    if (!isStr(r.markup) || (r.markup as string).trim() === "") {
      warnings.push(`${prefix}: svg-3d missing or empty "markup" — will render nothing`);
    }
    if (Array.isArray(r.layers) && (r.layers as unknown[]).length === 0) {
      warnings.push(`${prefix}: svg-3d "layers" is empty — wrapper motion only`);
    }
    if (r.depthPreset !== undefined && !inEnum(r.depthPreset, VALID_DEPTH_PRESETS)) {
      warnings.push(`${prefix}: invalid depthPreset "${r.depthPreset}", defaulting to "subtle"`);
      r.depthPreset = "subtle";
    }
    if (r.cameraTilt !== undefined && !inEnum(r.cameraTilt, VALID_CAMERA_TILTS)) {
      warnings.push(`${prefix}: invalid cameraTilt "${r.cameraTilt}", defaulting to "left"`);
      r.cameraTilt = "left";
    }
    if (r.parallax !== undefined && !inEnum(r.parallax, VALID_PARALLAX)) {
      warnings.push(`${prefix}: invalid parallax "${r.parallax}", defaulting to "subtle"`);
      r.parallax = "subtle";
    }
    if (r.shadow !== undefined && !inEnum(r.shadow, VALID_SVG3D_SHADOW)) {
      warnings.push(`${prefix}: invalid shadow "${r.shadow}", defaulting to "soft"`);
      r.shadow = "soft";
    }
    if (r.reveal !== undefined && !inEnum(r.reveal, VALID_SVG3D_REVEAL)) {
      warnings.push(`${prefix}: invalid reveal "${r.reveal}", defaulting to "fade"`);
      r.reveal = "fade";
    }
  }

  return { ok: true, data: el, warnings };
}

// ============================================================
// Theme validation
// ============================================================

function validateTheme(input: unknown): ThemeConfig | null {
  if (!isObj(input)) return null;

  let chartColors: string[] | undefined;
  if (Array.isArray(input.chartColors)) {
    chartColors = input.chartColors.filter(isStr).slice(0, 16);
    if (chartColors.length === 0) chartColors = undefined;
  }

  return {
    primaryColor: isStr(input.primaryColor) ? input.primaryColor : undefined,
    secondaryColor: isStr(input.secondaryColor) ? input.secondaryColor : undefined,
    fontFamily: isStr(input.fontFamily) ? input.fontFamily : undefined,
    style: inEnum(input.style, VALID_THEME_STYLES) ? input.style : undefined,
    chartColors,
  };
}

// ============================================================
// Utility
// ============================================================

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
