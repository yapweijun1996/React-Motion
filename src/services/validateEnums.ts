/**
 * Canonical enums, constraints, and shared types for validation.
 *
 * These are the single source of truth used by: prompt, parser, renderer, validate.
 */

// ============================================================
// Validation result type (shared by validate.ts & validateSettings.ts)
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
// Canonical enums — used everywhere (prompt, parser, renderer)
// ============================================================

export const VALID_ELEMENT_TYPES = [
  "text", "metric", "bar-chart", "pie-chart", "line-chart",
  "sankey", "list", "divider", "callout", "kawaii", "lottie", "icon", "annotation", "svg", "map",
  "progress", "timeline", "comparison",
] as const;

export const VALID_LAYOUTS = ["column", "center", "row"] as const;

export const VALID_TRANSITIONS = [
  "fade", "slide", "wipe", "clock-wipe",
  "radial-wipe", "diamond-wipe", "iris", "zoom-out",
  "zoom-blur", "slide-up", "split", "rotate",
  "dissolve", "pixelate",
] as const;

export const VALID_ANIMATIONS = [
  "fade", "slide-up", "slide-left", "slide-right",
  "zoom", "bounce", "rubber-band", "scale-rotate", "flip",
  "typewriter",
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
