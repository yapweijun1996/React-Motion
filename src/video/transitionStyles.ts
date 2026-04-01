/**
 * transitionStyles — CSS transition style generation for SceneRenderer.
 *
 * Extracted from SceneRenderer.tsx for modularity.
 * All functions are pure (generate inline CSSProperties).
 */

import type { VideoScene } from "../types";

// ---------------------------------------------------------------------------
// Pure: CSS transition styles
// ---------------------------------------------------------------------------

/**
 * Generate inline CSSProperties for a transition effect.
 *
 * | Transition  | Entering                         | Exiting                      |
 * |-------------|----------------------------------|------------------------------|
 * | fade        | opacity: progress                | opacity: 1 - progress        |
 * | slide       | translateX(-100% → 0)            | translateX(0 → 100%)         |
 * | wipe        | clip-path inset reveals from left | (behind entering, no clip)   |
 * | clock-wipe  | clip-path polygon sweeps from top | (behind entering, no clip)   |
 */
export function getTransitionStyle(
  type: VideoScene["transition"],
  progress: number,
  direction: "entering" | "exiting",
): React.CSSProperties {
  const t = type ?? "fade";

  switch (t) {
    // --- Original 4 ---

    case "fade":
      return direction === "entering"
        ? { opacity: progress }
        : { opacity: 1 - progress };

    case "slide":
      return direction === "entering"
        ? { transform: `translateX(${(1 - progress) * -100}%)` }
        : { transform: `translateX(${progress * 100}%)` };

    case "wipe":
      return direction === "entering"
        ? { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }
        : {};

    case "clock-wipe":
      return direction === "entering"
        ? { clipPath: clockWipePolygon(progress) }
        : {};

    // --- New 8: Enhanced CSS transitions ---

    case "radial-wipe":
      // Circle expanding from center
      return direction === "entering"
        ? { clipPath: `circle(${progress * 150}% at 50% 50%)` }
        : {};

    case "diamond-wipe":
      // Diamond shape expanding from center
      return direction === "entering"
        ? { clipPath: diamondPolygon(progress) }
        : {};

    case "iris":
      // Rectangle expanding from center
      return direction === "entering"
        ? {
            clipPath: `inset(${(1 - progress) * 50}% ${(1 - progress) * 50}% ${(1 - progress) * 50}% ${(1 - progress) * 50}%)`,
          }
        : {};

    case "zoom-out":
      // Exiting scene shrinks + fades, entering fades in
      return direction === "exiting"
        ? {
            transform: `scale(${1 - progress * 0.3})`,
            opacity: 1 - progress,
          }
        : { opacity: progress };

    case "zoom-blur":
      // Exiting scene zooms + blurs, entering fades in
      return direction === "exiting"
        ? {
            transform: `scale(${1 + progress * 0.2})`,
            opacity: 1 - progress,
            filter: `blur(${progress * 12}px)`,
          }
        : { opacity: progress };

    case "slide-up":
      // New scene pushes up from bottom
      return direction === "entering"
        ? { transform: `translateY(${(1 - progress) * 100}%)` }
        : { transform: `translateY(${progress * -100}%)` };

    case "split":
      // Left and right halves split apart to reveal entering scene
      return direction === "entering"
        ? { clipPath: splitPolygon(progress) }
        : {};

    case "rotate":
      // Exiting rotates + shrinks out, entering fades in
      return direction === "exiting"
        ? {
            transform: `rotate(${progress * 15}deg) scale(${1 - progress * 0.4})`,
            opacity: 1 - progress,
            transformOrigin: "center center",
          }
        : { opacity: progress };

    default:
      return direction === "entering"
        ? { opacity: progress }
        : { opacity: 1 - progress };
  }
}

/**
 * Generate CSS polygon() for clock-wipe effect.
 * Sweeps clockwise from 12 o'clock position.
 * Uses enough points (~24) for a visually smooth arc.
 */
export function clockWipePolygon(progress: number): string {
  if (progress <= 0) return "polygon(50% 50%, 50% 50%)";
  if (progress >= 1) return "none"; // fully visible

  const angle = progress * 360;
  const cx = 50;
  const cy = 50;
  // Radius in percentage — 75% exceeds the diagonal from center to corner
  // (max diagonal = √(50²+50²) ≈ 70.7%)
  const r = 75;

  const pts: string[] = [`${cx}% ${cy}%`, `${cx}% ${cy - r}%`];

  // One point every 15° for smooth arc
  const steps = Math.max(2, Math.ceil(angle / 15));
  for (let i = 1; i <= steps; i++) {
    const deg = Math.min((i / steps) * angle, angle);
    // -90° offset: start from 12 o'clock (top center)
    const rad = ((deg - 90) * Math.PI) / 180;
    const px = cx + r * Math.cos(rad);
    const py = cy + r * Math.sin(rad);
    pts.push(`${px.toFixed(2)}% ${py.toFixed(2)}%`);
  }

  return `polygon(${pts.join(", ")})`;
}

/**
 * Generate CSS polygon() for diamond-wipe effect.
 * Diamond expands from center to corners.
 */
export function diamondPolygon(progress: number): string {
  if (progress <= 0) return "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)";
  if (progress >= 1) return "none";
  const d = progress * 55; // % from center
  return `polygon(50% ${50 - d}%, ${50 + d}% 50%, 50% ${50 + d}%, ${50 - d}% 50%)`;
}

/**
 * Generate CSS polygon() for split effect.
 * Vertical split — two halves reveal from center outward.
 */
export function splitPolygon(progress: number): string {
  if (progress <= 0) return "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)";
  if (progress >= 1) return "none";
  const half = progress * 50; // each side opens by this %
  return `polygon(${50 - half}% 0%, ${50 + half}% 0%, ${50 + half}% 100%, ${50 - half}% 100%)`;
}
