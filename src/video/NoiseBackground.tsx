/**
 * NoiseBackground — subtle ambient blob layer behind scene content.
 *
 * Renders 3 soft radial-gradient circles that drift via noise3D.
 * Uses <radialGradient> fills instead of feGaussianBlur for near-zero
 * GPU cost (no per-frame filter convolution).
 *
 * Always renders (not gated by canvasEffects) since radialGradient is
 * extremely cheap — no blur filter, no canvas, just SVG paints.
 */

import { useCurrentFrame, useVideoConfig } from "./VideoContext";
import { noise3D } from "./animation";
import { useMemo } from "react";

const BLOB_COUNT = 3;
const SEED = "react-motion-bg";

type Props = {
  color?: string;
  intensity?: number; // 0-1, default 0.06
};

/** Convert hex color to rgba string. */
function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const NoiseBackground: React.FC<Props> = ({
  color = "#2563eb",
  intensity = 0.06,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fps = 30; // avoid re-render on config ref change
  const t = frame / fps;

  // Stable unique ID prefix per instance (avoids SVG gradient ID collision
  // when two scenes overlap during transitions).
  const gradientIdPrefix = useMemo(
    () => `nb-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  // Pre-compute blob positions — pure math, no side effects
  const blobs = useMemo(() => {
    const result: { cx: number; cy: number; r: number; opacity: number }[] = [];
    for (let i = 0; i < BLOB_COUNT; i++) {
      const nx = noise3D(SEED, i * 0.7, 0, t * 0.3) * 0.4;
      const ny = noise3D(SEED, 0, i * 0.7, t * 0.3) * 0.3;
      const opacityVar = noise3D(SEED, i * 1.5, t * 0.2, 0) * 0.04;

      result.push({
        cx: width * (0.3 + i * 0.12 + nx),
        cy: height * (0.3 + (i % 3) * 0.2 + ny),
        r: width * (0.12 + i * 0.03),
        opacity: Math.max(0, intensity + opacityVar),
      });
    }
    return result;
  }, [frame, width, height, intensity]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        {blobs.map((b, i) => (
          <radialGradient key={i} id={`${gradientIdPrefix}-${i}`}>
            <stop offset="0%" stopColor={color} stopOpacity={b.opacity} />
            <stop offset="70%" stopColor={color} stopOpacity={b.opacity * 0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>

      {blobs.map((b, i) => (
        <circle
          key={i}
          cx={b.cx}
          cy={b.cy}
          r={b.r}
          fill={`url(#${gradientIdPrefix}-${i})`}
        />
      ))}
    </svg>
  );
};
