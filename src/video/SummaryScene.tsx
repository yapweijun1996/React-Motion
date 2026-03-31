import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

type SummarySceneProps = {
  title: string;
  points: string[];
  recommendation?: string;
  primaryColor?: string;
};

export const SummaryScene: React.FC<SummarySceneProps> = ({
  title,
  points,
  recommendation,
  primaryColor = "#2563eb",
}) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        padding: "60px 80px",
        fontFamily: "Arial, sans-serif",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <h2
        style={{
          fontSize: 40,
          color: primaryColor,
          margin: 0,
          opacity: titleOpacity,
        }}
      >
        {title}
      </h2>

      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 18 }}>
        {points.map((point, i) => {
          const delay = 15 + i * 12;
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                fontSize: 26,
                color: "#374151",
                opacity,
                display: "flex",
                gap: 12,
              }}
            >
              <span style={{ color: "#10b981", fontWeight: 700 }}>{"\u2713"}</span>
              <span>{point}</span>
            </div>
          );
        })}
      </div>

      {recommendation && (
        <div
          style={{
            marginTop: 40,
            padding: "20px 24px",
            backgroundColor: "#eff6ff",
            borderLeft: `4px solid ${primaryColor}`,
            borderRadius: 8,
            opacity: interpolate(
              frame,
              [15 + points.length * 12 + 10, 15 + points.length * 12 + 25],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 4 }}>Recommendation</div>
          <div style={{ fontSize: 24, color: "#1e40af", fontWeight: 600 }}>{recommendation}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
