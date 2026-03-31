/**
 * Built-in Lottie animation presets.
 *
 * These are minimal hand-crafted Lottie JSON animations.
 * They avoid external dependencies and keep bundle size small.
 * Each animation is a simple shape + motion (check, arrow, pulse, etc.)
 *
 * AI picks a preset by name. Custom animationData JSON is also supported.
 */

import type { LottieAnimationData } from "@remotion/lottie";

// Helper to build minimal Lottie JSON
function makeLottie(
  name: string,
  layers: Record<string, unknown>[],
  opts: { w?: number; h?: number; fr?: number; op?: number } = {},
): LottieAnimationData {
  return {
    v: "5.7.0",
    nm: name,
    fr: opts.fr ?? 30,
    w: opts.w ?? 200,
    h: opts.h ?? 200,
    ip: 0,
    op: opts.op ?? 60,
    layers,
  } as LottieAnimationData;
}

// --- Checkmark animation ---
const checkmark = makeLottie("checkmark", [
  {
    ty: 4, // shape layer
    nm: "check",
    ip: 0, op: 60, st: 0,
    ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] }, s: { a: 0, k: [100, 100, 100] } },
    shapes: [
      {
        ty: "gr",
        it: [
          {
            ty: "sh", // path
            ks: {
              a: 0,
              k: { c: false, v: [[-40, 0], [-10, 30], [40, -30]], i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]] },
            },
          },
          { ty: "st", c: { a: 0, k: [0.22, 0.78, 0.36, 1] }, w: { a: 0, k: 8 }, lc: 2, lj: 2 },
          {
            ty: "tm", // trim path for draw-on animation
            s: { a: 0, k: 0 },
            e: { a: 1, k: [{ t: 10, s: [0] }, { t: 35, s: [100] }] },
            o: { a: 0, k: 0 },
          },
          { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
        ],
      },
    ],
  },
]);

// --- Arrow up animation ---
const arrowUp = makeLottie("arrow-up", [
  {
    ty: 4, nm: "arrow",
    ip: 0, op: 60, st: 0,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
      p: { a: 1, k: [{ t: 0, s: [100, 140, 0] }, { t: 25, s: [100, 80, 0] }] },
      s: { a: 0, k: [100, 100, 100] },
    },
    shapes: [
      {
        ty: "gr",
        it: [
          { ty: "sh", ks: { a: 0, k: { c: false, v: [[0, 30], [0, -30]], i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]] } } },
          { ty: "sh", ks: { a: 0, k: { c: false, v: [[-20, -10], [0, -30], [20, -10]], i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]] } } },
          { ty: "st", c: { a: 0, k: [0.15, 0.39, 0.92, 1] }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
          { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
        ],
      },
    ],
  },
]);

// --- Arrow down animation ---
const arrowDown = makeLottie("arrow-down", [
  {
    ty: 4, nm: "arrow",
    ip: 0, op: 60, st: 0,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 180 },
      p: { a: 1, k: [{ t: 0, s: [100, 60, 0] }, { t: 25, s: [100, 120, 0] }] },
      s: { a: 0, k: [100, 100, 100] },
    },
    shapes: [
      {
        ty: "gr",
        it: [
          { ty: "sh", ks: { a: 0, k: { c: false, v: [[0, 30], [0, -30]], i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]] } } },
          { ty: "sh", ks: { a: 0, k: { c: false, v: [[-20, -10], [0, -30], [20, -10]], i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]] } } },
          { ty: "st", c: { a: 0, k: [0.86, 0.16, 0.16, 1] }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
          { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
        ],
      },
    ],
  },
]);

// --- Pulse circle (attention) ---
const pulse = makeLottie("pulse", [
  {
    ty: 4, nm: "pulse",
    ip: 0, op: 60, st: 0,
    ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] }, s: { a: 0, k: [100, 100, 100] } },
    shapes: [
      {
        ty: "gr",
        it: [
          { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 1, k: [{ t: 0, s: [40, 40] }, { t: 30, s: [80, 80] }, { t: 60, s: [40, 40] }] } },
          { ty: "st", c: { a: 0, k: [0.96, 0.62, 0.04, 1] }, w: { a: 0, k: 4 } },
          { ty: "fl", c: { a: 0, k: [0.96, 0.62, 0.04, 1] }, o: { a: 1, k: [{ t: 0, s: [60] }, { t: 30, s: [20] }, { t: 60, s: [60] }] } },
          { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
        ],
      },
    ],
  },
]);

// --- Star spin ---
const star = makeLottie("star", [
  {
    ty: 4, nm: "star",
    ip: 0, op: 60, st: 0,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
      p: { a: 0, k: [100, 100, 0] },
      s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 20, s: [110, 110, 100] }, { t: 35, s: [100, 100, 100] }] },
    },
    shapes: [
      {
        ty: "gr",
        it: [
          { ty: "sr", p: { a: 0, k: [0, 0] }, or: { a: 0, k: 35 }, ir: { a: 0, k: 15 }, pt: { a: 0, k: 5 }, r: { a: 0, k: 0 }, sy: 1 },
          { ty: "fl", c: { a: 0, k: [0.96, 0.73, 0.04, 1] } },
          { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
        ],
      },
    ],
  },
]);

// --- Thumbs up (simple shape) ---
const thumbsUp = makeLottie("thumbs-up", [
  {
    ty: 4, nm: "thumb",
    ip: 0, op: 60, st: 0,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 1, k: [{ t: 0, s: [-20] }, { t: 15, s: [10] }, { t: 30, s: [0] }] },
      p: { a: 1, k: [{ t: 0, s: [100, 130, 0] }, { t: 20, s: [100, 90, 0] }] },
      s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 20, s: [110, 110, 100] }, { t: 35, s: [100, 100, 100] }] },
    },
    shapes: [
      {
        ty: "gr",
        it: [
          { ty: "rc", p: { a: 0, k: [0, 15] }, s: { a: 0, k: [30, 40] }, r: { a: 0, k: 4 } },
          { ty: "rc", p: { a: 0, k: [0, -15] }, s: { a: 0, k: [22, 30] }, r: { a: 0, k: 10 } },
          { ty: "fl", c: { a: 0, k: [0.15, 0.68, 0.38, 1] } },
          { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
        ],
      },
    ],
  },
]);

// --- Registry ---

export const LOTTIE_PRESETS: Record<string, LottieAnimationData> = {
  checkmark,
  "arrow-up": arrowUp,
  "arrow-down": arrowDown,
  pulse,
  star,
  "thumbs-up": thumbsUp,
};

export const PRESET_NAMES = Object.keys(LOTTIE_PRESETS);

export function getPreset(name: string): LottieAnimationData | null {
  return LOTTIE_PRESETS[name] ?? null;
}
