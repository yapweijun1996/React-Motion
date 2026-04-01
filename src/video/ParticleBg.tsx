/**
 * ParticleBg — Canvas 2D background effect layer.
 *
 * Three visual modes, selectable via `effect` prop:
 *   - "bokeh"   — soft out-of-focus light orbs
 *   - "flow"    — particles drifting along a noise flow field
 *   - "rising"  — firefly/bubble particles floating upward
 *
 * Only rendered when canvasEffects=ON AND scene.bgEffect is set.
 * Color is background-aware: bgGradient → bgColor → fallback.
 *
 * Deterministic: driven by useCurrentFrame(), no Math.random().
 * html-to-image captures <canvas> via canvas.toDataURL() internally.
 */

import { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "./VideoContext";
import { initBokeh, frameBokeh, drawBokeh } from "./effects/BokehEffect";
import { initFlow, frameFlow, drawFlow } from "./effects/FlowEffect";
import { initRising, frameRising, drawRising } from "./effects/RisingEffect";

export type BgEffect = "bokeh" | "flow" | "rising";

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/** Extract the first hex color from a CSS gradient string. */
function extractGradientColor(gradient: string): string | undefined {
  const m = gradient.match(/#[0-9a-fA-F]{3,8}/);
  return m ? m[0] : undefined;
}

/** Calculate luminance (0-1) from a hex color. */
function hexLuminance(hex: string): number | undefined {
  const c = hex.replace("#", "");
  if (c.length < 6) return undefined;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Resolve particle color with background awareness.
 * Priority: bgGradient first stop → bgColor → primaryColor → fallback.
 * Dark bg → bright particles (#93c5fd), light bg → deeper particles (#3b82f6).
 */
function resolveColor(
  color: string | undefined,
  bgColor: string | undefined,
  bgGradient: string | undefined,
): string {
  const effectiveBg = bgGradient ? extractGradientColor(bgGradient) : bgColor;
  if (!effectiveBg) return color ?? "#60a5fa";
  const lum = hexLuminance(effectiveBg);
  if (lum === undefined) return color ?? "#60a5fa";
  if (lum < 0.4) return "#93c5fd";
  return "#3b82f6";
}

function hexToRgb(hex: string): string {
  const c = hex.replace("#", "");
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  color?: string;
  bgColor?: string;
  bgGradient?: string;
  opacity?: number;
  effect?: BgEffect;
};

export const ParticleBg: React.FC<Props> = ({
  color,
  bgColor,
  bgGradient,
  opacity = 0.7,
  effect = "bokeh",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Init base particles once per effect type
  const baseRef = useRef<{ effect: BgEffect; data: unknown } | null>(null);
  if (!baseRef.current || baseRef.current.effect !== effect) {
    baseRef.current = {
      effect,
      data: effect === "flow"   ? initFlow(width, height)
          : effect === "rising" ? initRising(width, height)
          :                       initBokeh(width, height),
    };
  }

  const resolvedColor = resolveColor(color, bgColor, bgGradient);
  const rgb = hexToRgb(resolvedColor);
  const fadeIn = Math.min(1, frame / (fps * 0.8));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const alpha = opacity * fadeIn;
    if (alpha <= 0) return;

    const base = baseRef.current!.data;

    switch (effect) {
      case "flow": {
        const particles = frameFlow(base as ReturnType<typeof initFlow>, frame, width, height);
        drawFlow(ctx, particles, rgb, alpha);
        break;
      }
      case "rising": {
        const particles = frameRising(base as ReturnType<typeof initRising>, frame, width, height);
        drawRising(ctx, particles, rgb, alpha);
        break;
      }
      default: {
        const orbs = frameBokeh(base as ReturnType<typeof initBokeh>, frame, width, height);
        drawBokeh(ctx, orbs, rgb, alpha);
        break;
      }
    }
  }, [frame, width, height, rgb, opacity, fadeIn, effect]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
};
