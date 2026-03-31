import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export type BarItem = {
  label: string;
  value: number;
  color?: string;
};

type ChartSceneProps = {
  title: string;
  bars: BarItem[];
  primaryColor?: string;
};

const DEFAULT_COLORS = [
  "#93a8c4", // steel blue
  "#f4b183", // orange
  "#e88b9a", // rose
  "#a8ccc8", // teal
  "#8db87c", // green
  "#f2d475", // gold
  "#c4a5c9", // lavender
  "#f5a3a3", // pink
];

export const ChartScene: React.FC<ChartSceneProps> = ({
  title,
  bars,
  primaryColor = "#2563eb",
}) => {
  const frame = useCurrentFrame();
  const maxValue = Math.max(...bars.map((b) => b.value));

  // Title fades in first
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        padding: "48px 60px",
        fontFamily: "Arial, sans-serif",
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      {/* Chart title */}
      <h2
        style={{
          fontSize: 36,
          color: primaryColor,
          margin: "0 0 32px 0",
          opacity: titleOpacity,
        }}
      >
        {title}
      </h2>

      {/* Bars container */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        {bars.map((bar, i) => (
          <BarRow
            key={bar.label}
            bar={bar}
            index={i}
            maxValue={maxValue}
            frame={frame}
            color={bar.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

type BarRowProps = {
  bar: BarItem;
  index: number;
  maxValue: number;
  frame: number;
  color: string;
};

const BarRow: React.FC<BarRowProps> = ({
  bar,
  index,
  maxValue,
  frame,
  color,
}) => {
  // Each bar starts animating with a stagger delay
  const delay = 15 + index * 8;
  const barWidth = interpolate(
    frame,
    [delay, delay + 30],
    [0, (bar.value / maxValue) * 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Label fades in slightly before bar
  const labelOpacity = interpolate(
    frame,
    [delay - 5, delay + 5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Value number appears after bar finishes
  const valueOpacity = interpolate(
    frame,
    [delay + 20, delay + 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div style={{ display: "flex", alignItems: "center", height: 40 }}>
      {/* Label */}
      <div
        style={{
          width: 220,
          textAlign: "right",
          paddingRight: 16,
          fontSize: 16,
          color: "#374151",
          opacity: labelOpacity,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {bar.label}
      </div>

      {/* Bar track */}
      <div style={{ flex: 1, position: "relative", height: 28 }}>
        {/* Animated bar — uses transform for GPU performance */}
        <div
          style={{
            height: "100%",
            width: `${barWidth}%`,
            backgroundColor: color,
            borderRadius: 4,
            transformOrigin: "left",
          }}
        />
      </div>

      {/* Value */}
      <div
        style={{
          width: 50,
          paddingLeft: 8,
          fontSize: 16,
          fontWeight: 600,
          color: "#374151",
          opacity: valueOpacity,
          flexShrink: 0,
        }}
      >
        {bar.value}
      </div>
    </div>
  );
};
