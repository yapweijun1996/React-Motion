/**
 * Unified stagger system for all scene elements.
 *
 * Features:
 * - Consistent base delay across all element types
 * - Per-item stagger with noise perturbation for organic feel
 * - AI-controllable stagger speed via element.stagger prop
 * - Spring config presets by visual hierarchy
 */

import { useCurrentFrame, useVideoConfig } from "./VideoContext";
import { spring, interpolate, noise2D } from "./animation";

const NOISE_SEED = "stagger";

// --- Stagger speed presets (AI picks one) ---
// StaggerSpeed derived from canonical VALID_STAGGER_SPEEDS in validate.ts

import { VALID_STAGGER_SPEEDS } from "../services/validate";

type StaggerSpeed = (typeof VALID_STAGGER_SPEEDS)[number];

const ITEM_STAGGER_FRAMES: Record<StaggerSpeed, number> = {
  tight: 5,
  normal: 8,
  relaxed: 12,
  dramatic: 18,
};

// --- Spring presets by visual role ---

type SpringPreset = "hero" | "data" | "support";

const SPRING_CONFIGS: Record<SpringPreset, { damping: number; mass: number }> = {
  hero: { damping: 16, mass: 0.7 },      // Quick, punchy (titles, callouts)
  data: { damping: 14, mass: 0.6 },      // Balanced (charts, metrics)
  support: { damping: 12, mass: 0.5 },   // Softer, fluid (lists, dividers)
};

// Map element types to spring presets
const TYPE_SPRING: Record<string, SpringPreset> = {
  text: "hero",
  metric: "hero",
  callout: "hero",
  "bar-chart": "data",
  "pie-chart": "data",
  "line-chart": "data",
  sankey: "data",
  list: "support",
  divider: "support",
  icon: "hero",
  annotation: "support",
};

// --- Hook ---

type UseStaggerOptions = {
  /** Element index within the scene (0-based) */
  elementIndex: number;
  /** Item index within the element (for multi-item elements like lists, bars) */
  itemIndex?: number;
  /** AI-set stagger speed (default: "normal") */
  stagger?: StaggerSpeed;
  /** Override delay in frames (from element.delay prop) */
  delayOverride?: number;
  /** Element type (for spring preset lookup) */
  elementType?: string;
};

type StaggerResult = {
  /** 0→1 spring progress for entrance animation */
  progress: number;
  /** Computed opacity (= progress) */
  opacity: number;
  /** Slide-up distance in px (40→0) */
  translateY: number;
  /** Scale factor (0.85→1) */
  scale: number;
  /** The computed delay in frames */
  delay: number;
  /** Spring config used */
  springConfig: { damping: number; mass: number };
};

export function useStagger(options: UseStaggerOptions): StaggerResult {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    elementIndex,
    itemIndex,
    stagger = "normal",
    delayOverride,
    elementType = "text",
  } = options;

  // Base delay: element index × 8 + 6 (unified across all types)
  const baseDelay = delayOverride ?? (elementIndex * 8 + 6);

  // Per-item stagger with noise perturbation
  let itemDelay = 0;
  if (itemIndex !== undefined && itemIndex > 0) {
    const staggerFrames = ITEM_STAGGER_FRAMES[stagger] ?? ITEM_STAGGER_FRAMES.normal;
    // Noise adds ±2 frames of variation per item
    const noisePerturbation = noise2D(NOISE_SEED, elementIndex * 3.7, itemIndex * 2.3) * 2;
    itemDelay = itemIndex * staggerFrames + noisePerturbation;
  }

  const delay = Math.max(0, Math.round(baseDelay + itemDelay));

  // Spring config from type preset
  const preset: SpringPreset = TYPE_SPRING[elementType] ?? "data";
  const springConfig = SPRING_CONFIGS[preset];

  const progress = spring({
    frame: frame - delay,
    fps,
    config: springConfig,
  });

  // Slight Y offset variation via noise (±8px)
  const yNoise = noise2D(NOISE_SEED, elementIndex * 1.1, (itemIndex ?? 0) * 0.9) * 8;
  const baseSlide = 36 + yNoise; // 28~44px range

  return {
    progress,
    opacity: progress,
    translateY: interpolate(progress, [0, 1], [baseSlide, 0]),
    scale: interpolate(progress, [0, 1], [0.85, 1]),
    delay,
    springConfig,
  };
}

/** Parse stagger prop from SceneElement */
export function parseStagger(el: Record<string, unknown>): StaggerSpeed {
  const v = el.stagger as string | undefined;
  if (v && v in ITEM_STAGGER_FRAMES) return v as StaggerSpeed;
  return "normal";
}

// --- Entrance animation system ---
// EntranceAnimation type derived from canonical VALID_ANIMATIONS in validate.ts

import { VALID_ANIMATIONS as VALID_ANIM_ARRAY } from "../services/validate";

export type EntranceAnimation = (typeof VALID_ANIM_ARRAY)[number];

const VALID_ANIMATIONS = new Set<string>(VALID_ANIM_ARRAY);

/** Parse animation prop from SceneElement, with configurable fallback */
export function parseAnimation(
  el: Record<string, unknown>,
  fallback: EntranceAnimation = "fade",
): EntranceAnimation {
  const v = el.animation as string | undefined;
  if (v && VALID_ANIMATIONS.has(v)) return v as EntranceAnimation;
  return fallback;
}

type EntranceStyle = {
  opacity: number;
  transform: string;
};

/**
 * Compute CSS transform + opacity for a given entrance animation.
 * All math is pure — uses spring progress (0→1) only.
 *
 * Every animation uses Remotion `interpolate()` for multi-keyframe curves.
 * Spring physics come from the progress value itself (driven by `spring()`).
 */
export function computeEntranceStyle(
  progress: number,
  animation: EntranceAnimation,
): EntranceStyle {
  switch (animation) {
    case "fade":
      return { opacity: progress, transform: "none" };

    case "slide-up": {
      const y = interpolate(progress, [0, 1], [40, 0]);
      return { opacity: progress, transform: `translateY(${y}px)` };
    }

    case "slide-left": {
      const x = interpolate(progress, [0, 1], [-60, 0]);
      return { opacity: progress, transform: `translateX(${x}px)` };
    }

    case "slide-right": {
      const x = interpolate(progress, [0, 1], [60, 0]);
      return { opacity: progress, transform: `translateX(${x}px)` };
    }

    case "zoom": {
      const s = interpolate(progress, [0, 1], [0.85, 1]);
      return { opacity: progress, transform: `scale(${s})` };
    }

    case "bounce": {
      // Overshoot to 1.12, then settle back to 1.0
      const s = interpolate(progress, [0, 0.55, 0.8, 1], [0.3, 1.12, 0.95, 1]);
      const y = interpolate(progress, [0, 0.55, 1], [30, -8, 0]);
      return { opacity: Math.min(progress * 2, 1), transform: `translateY(${y}px) scale(${s})` };
    }

    case "rubber-band": {
      // Horizontal stretch overshoot
      const sx = interpolate(progress, [0, 0.4, 0.65, 0.85, 1], [0.3, 1.25, 0.9, 1.05, 1]);
      const sy = interpolate(progress, [0, 0.4, 0.65, 0.85, 1], [0.3, 0.85, 1.08, 0.97, 1]);
      return { opacity: Math.min(progress * 2, 1), transform: `scaleX(${sx}) scaleY(${sy})` };
    }

    case "scale-rotate": {
      const s = interpolate(progress, [0, 0.6, 1], [0.3, 1.08, 1]);
      const r = interpolate(progress, [0, 0.5, 1], [-12, 4, 0]);
      return { opacity: Math.min(progress * 2, 1), transform: `scale(${s}) rotate(${r}deg)` };
    }

    case "flip": {
      const ry = interpolate(progress, [0, 0.6, 1], [90, -10, 0]);
      const s = interpolate(progress, [0, 0.6, 1], [0.8, 1.03, 1]);
      return {
        opacity: Math.min(progress * 1.5, 1),
        transform: `perspective(800px) rotateY(${ry}deg) scale(${s})`,
      };
    }

    case "typewriter":
      // Per-character reveal handled inside TextElement — container stays fully visible
      return { opacity: 1, transform: "none" };

    default:
      return { opacity: progress, transform: "none" };
  }
}
