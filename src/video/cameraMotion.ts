/**
 * Camera Motion System — cinematic camera movements for scenes.
 *
 * Pure functions only — no React dependency.
 * Replaces the hardcoded Ken Burns presets with AI-controllable camera types.
 *
 * Each camera type returns { scale, x, y } for a given normalized time (0→1).
 * GenericScene applies these as CSS transform on the content wrapper.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CameraType =
  | "push-in"     // Zoom from 1.0→1.15, slight upward drift (focus, tension)
  | "pull-out"    // Zoom from 1.15→1.0, slight downward drift (reveal, macro)
  | "pan-left"    // Horizontal pan left (timeline, sequence)
  | "pan-right"   // Horizontal pan right (timeline, sequence)
  | "pan-up"      // Vertical pan upward (growth, rising data)
  | "zoom-center" // Strong zoom 1.0→1.2 dead center (climax, emphasis)
  | "drift"       // Subtle Ken Burns — random preset per scene (default, alive)
  | "static";     // No motion (dense data, needs stillness)

export type CameraTransform = {
  scale: number;
  x: number; // px
  y: number; // px
};

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

/** Smooth ease-in-out cubic */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Ease-out quint — starts fast, decelerates smoothly */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

// ---------------------------------------------------------------------------
// Drift presets (legacy Ken Burns, used by "drift" type)
// ---------------------------------------------------------------------------

const DRIFT_PRESETS = [
  { sf: 1.00, st: 1.03, xf: 0, xt: -8, yf: 0, yt: -5 },
  { sf: 1.03, st: 1.00, xf: -5, xt: 3, yf: -3, yt: 2 },
  { sf: 1.00, st: 1.02, xf: 0, xt: 6, yf: 0, yt: -4 },
  { sf: 1.02, st: 1.00, xf: 4, xt: -4, yf: 2, yt: -2 },
  { sf: 1.00, st: 1.03, xf: 0, xt: 0, yf: 0, yt: -6 },
  { sf: 1.02, st: 1.00, xf: 0, xt: 0, yf: -4, yt: 4 },
];

/** Deterministic hash from string → stable index */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------------------------------------------------------------------------
// Camera calculations
// ---------------------------------------------------------------------------

/**
 * Compute camera transform for a given camera type and normalized time.
 *
 * @param type     Camera movement type (AI-set or default "drift")
 * @param t        Normalized time 0→1 (frame / durationInFrames)
 * @param sceneId  Scene id (used for deterministic drift selection)
 */
export function getCameraTransform(
  type: CameraType | undefined,
  t: number,
  sceneId: string,
): CameraTransform {
  const cam = type ?? "drift";
  // Clamp t to [0, 1]
  const ct = Math.max(0, Math.min(1, t));

  switch (cam) {
    case "push-in": {
      // Zoom in 1.0 → 1.15, drift slightly upward
      const e = easeInOut(ct);
      return {
        scale: 1.0 + 0.15 * e,
        x: -3 * e,
        y: -8 * e,
      };
    }

    case "pull-out": {
      // Zoom out 1.15 → 1.0, drift slightly downward
      const e = easeInOut(ct);
      return {
        scale: 1.15 - 0.15 * e,
        x: 5 * (1 - e),
        y: 6 * (1 - e),
      };
    }

    case "pan-left": {
      // Horizontal pan: right → left, subtle scale
      const e = easeInOut(ct);
      return {
        scale: 1.02,
        x: 20 - 40 * e,  // +20 → -20
        y: -2 * e,
      };
    }

    case "pan-right": {
      // Horizontal pan: left → right, subtle scale
      const e = easeInOut(ct);
      return {
        scale: 1.02,
        x: -20 + 40 * e, // -20 → +20
        y: -2 * e,
      };
    }

    case "pan-up": {
      // Vertical pan: bottom → top
      const e = easeInOut(ct);
      return {
        scale: 1.02,
        x: 0,
        y: 15 - 30 * e, // +15 → -15
      };
    }

    case "zoom-center": {
      // Strong center zoom 1.0 → 1.2 with ease-out (fast start, slow settle)
      const e = easeOut(ct);
      return {
        scale: 1.0 + 0.2 * e,
        x: 0,
        y: 0,
      };
    }

    case "static":
      return { scale: 1, x: 0, y: 0 };

    case "drift":
    default: {
      // Legacy Ken Burns — deterministic preset from scene id
      const preset = DRIFT_PRESETS[hashStr(sceneId) % DRIFT_PRESETS.length];
      const e = easeInOut(ct);
      return {
        scale: preset.sf + (preset.st - preset.sf) * e,
        x: preset.xf + (preset.xt - preset.xf) * e,
        y: preset.yf + (preset.yt - preset.yf) * e,
      };
    }
  }
}

/**
 * Validate camera type string from AI input.
 * Returns the camera type if valid, "drift" as fallback.
 */
const VALID_SET = new Set<string>([
  "push-in", "pull-out", "pan-left", "pan-right",
  "pan-up", "zoom-center", "drift", "static",
]);

export function parseCameraType(raw: unknown): CameraType {
  if (typeof raw === "string" && VALID_SET.has(raw)) return raw as CameraType;
  return "drift";
}
