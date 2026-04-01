/**
 * NoiseBackground — subtle ambient blob layer behind scene content.
 *
 * Renders 3 soft radial-gradient circles that drift via noise3D.
 * Uses <radialGradient> with Gaussian-curve stops + one lightweight
 * CSS blur on the container — gives dreamy bokeh feel at a fraction
 * of the cost of per-element SVG feGaussianBlur.
 *
 * Performance: 1× GPU-composited CSS blur vs 3× SVG filter convolutions.
 */

import { useCurrentFrame, useVideoConfig } from "./VideoContext";
import { noise3D } from "./animation";
import { useMemo } from "react";

const BLOB_COUNT = 3;
const SEED = "react-motion-bg";

/**
 * Pre-computed Gaussian-curve gradient stops.
 * Formula: opacity_factor = e^(-d²/(2σ²)) where σ=0.38, d=0..1
 * 8 stops gives smooth falloff indistinguishable from real blur.
 */
const GAUSSIAN_STOPS: { offset: number; factor: number }[] = [
  { offset: 0,    factor: 1.0 },
  { offset: 0.15, factor: 0.88 },
  { offset: 0.30, factor: 0.62 },
  { offset: 0.45, factor: 0.36 },
  { offset: 0.58, factor: 0.18 },
  { offset: 0.72, factor: 0.07 },
  { offset: 0.88, factor: 0.015 },
  { offset: 1.0,  factor: 0 },
];

type Props = {
  color?: string;
  intensity?: number; // 0-1, default 0.06
};

export const NoiseBackground: React.FC<Props> = ({
  color = "#2563eb",
  intensity = 0.06,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;

  // Stable unique ID prefix per instance (avoids gradient ID collision
  // when two scenes overlap during transitions).
  const gradientIdPrefix = useMemo(
    () => `nb-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const blobs = useMemo(() => {
    const result: { cx: number; cy: number; r: number; opacity: number }[] = [];
    for (let i = 0; i < BLOB_COUNT; i++) {
      const nx = noise3D(SEED, i * 0.7, 0, t * 0.3) * 0.4;
      const ny = noise3D(SEED, 0, i * 0.7, t * 0.3) * 0.3;
      const opacityVar = noise3D(SEED, i * 1.5, t * 0.2, 0) * 0.04;

      result.push({
        cx: width * (0.3 + i * 0.12 + nx),
        cy: height * (0.3 + (i % 3) * 0.2 + ny),
        // Slightly larger radius to compensate for Gaussian fade-to-zero at edges
        r: width * (0.15 + i * 0.035),
        opacity: Math.max(0, intensity + opacityVar),
      });
    }
    return result;
  }, [frame, width, height, intensity]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        filter: "blur(30px)",         // single GPU-composited blur
        willChange: "filter",         // hint browser to GPU-accelerate
      }}
    >
      <defs>
        {blobs.map((b, i) => (
          <radialGradient key={i} id={`${gradientIdPrefix}-${i}`}>
            {GAUSSIAN_STOPS.map((s, si) => (
              <stop
                key={si}
                offset={`${s.offset * 100}%`}
                stopColor={color}
                stopOpacity={b.opacity * s.factor}
              />
            ))}
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
