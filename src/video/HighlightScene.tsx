import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

type HighlightSceneProps = {
  title: string;
  points: string[];
  icon?: "trend-up" | "trend-down" | "warning" | "info";
  primaryColor?: string;
};

const ICON_MAP: Record<string, string> = {
  "trend-up": "\u2191",
  "trend-down": "\u2193",
  warning: "\u26a0",
  info: "\u2139",
};

export const HighlightScene: React.FC<HighlightSceneProps> = ({
  title,
  points,
  icon = "info",
  primaryColor = "#2563eb",
}) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        padding: "60px 80px",
        fontFamily: "Arial, sans-serif",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: titleOpacity }}>
        <span style={{ fontSize: 48 }}>{ICON_MAP[icon] ?? ICON_MAP.info}</span>
        <h2 style={{ fontSize: 40, color: primaryColor, margin: 0 }}>{title}</h2>
      </div>

      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 20 }}>
        {points.map((point, i) => {
          const delay = 20 + i * 15;
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [delay, delay + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                fontSize: 28,
                color: "#374151",
                opacity,
                transform: `translateY(${translateY}px)`,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ color: primaryColor, fontWeight: 700 }}>{"\u2022"}</span>
              <span>{point}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
