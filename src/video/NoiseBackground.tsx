import { useCurrentFrame, useVideoConfig } from "remotion";
import { noise3D } from "@remotion/noise";

const BLOB_COUNT = 3;
const SEED = "react-motion-bg";

type Props = {
  color?: string;
  intensity?: number; // 0-1, default 0.12
};

export const NoiseBackground: React.FC<Props> = ({
  color = "#2563eb",
  intensity = 0.06,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps; // time in seconds for smooth movement

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter id="noise-blur">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      {Array.from({ length: BLOB_COUNT }).map((_, i) => {
        // Each blob has unique noise-driven position
        const nx = noise3D(SEED, i * 0.7, 0, t * 0.3) * 0.4;
        const ny = noise3D(SEED, 0, i * 0.7, t * 0.3) * 0.3;

        const cx = width * (0.3 + i * 0.12 + nx);
        const cy = height * (0.3 + (i % 3) * 0.2 + ny);
        const r = width * (0.12 + i * 0.03);

        // Slight opacity variation per blob
        const opacityVar = noise3D(SEED, i * 1.5, t * 0.2, 0) * 0.04;

        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill={color}
            opacity={intensity + opacityVar}
            filter="url(#noise-blur)"
          />
        );
      })}
    </svg>
  );
};
