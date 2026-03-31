import { useCurrentFrame, interpolate } from "remotion";
import type { SceneElement } from "../../types";

type BarItem = { label: string; value: number; color?: string };

const DEFAULT_COLORS = [
  "#3b82f6", "#f97316", "#ef4444", "#10b981",
  "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4",
];

type Props = { el: SceneElement; index: number };

export const BarChartElement: React.FC<Props> = ({ el, index }) => {
  const frame = useCurrentFrame();
  const bars = (el.bars as BarItem[]) ?? [];
  const highlightIndex = (el.highlightIndex as number) ?? 0;
  const showPct = (el.showPercentage as boolean) ?? false;
  const baseDelay = (el.delay as number) ?? index * 8 + 10;

  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const totalValue = bars.reduce((s, b) => s + b.value, 0);

  const barHeight = bars.length <= 4 ? 34 : bars.length <= 6 ? 28 : 24;
  const fontSize = bars.length <= 4 ? 16 : 14;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {bars.map((bar, i) => {
        const delay = baseDelay + i * 7;
        const color = bar.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const isHl = i === highlightIndex;

        const barWidth = interpolate(frame, [delay, delay + 25], [0, (bar.value / maxValue) * 100], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const labelOpacity = interpolate(frame, [delay - 4, delay + 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const valueOpacity = interpolate(frame, [delay + 15, delay + 25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const pct = totalValue > 0 ? ((bar.value / totalValue) * 100).toFixed(1) : "0";
        const fmtVal =
          bar.value >= 1_000_000
            ? `${(bar.value / 1_000_000).toFixed(2)}M`
            : bar.value >= 1_000
              ? `${(bar.value / 1_000).toFixed(1)}K`
              : String(bar.value);

        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: barHeight + 6 }}>
            <div
              style={{
                width: 170,
                textAlign: "right",
                paddingRight: 12,
                fontSize,
                color: "#374151",
                opacity: labelOpacity,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontWeight: isHl ? 700 : 400,
              }}
            >
              {bar.label}
            </div>
            <div style={{ flex: 1, height: barHeight }}>
              <div
                style={{
                  height: "100%",
                  width: `${barWidth}%`,
                  backgroundColor: color,
                  borderRadius: 4,
                  boxShadow: isHl ? `0 2px 8px ${color}66` : "none",
                }}
              />
            </div>
            <div
              style={{
                minWidth: showPct ? 105 : 65,
                paddingLeft: 8,
                fontSize,
                fontWeight: 600,
                color: isHl ? color : "#374151",
                opacity: valueOpacity,
                flexShrink: 0,
              }}
            >
              {fmtVal}
              {showPct && (
                <span style={{ fontSize: fontSize - 2, color: "#9ca3af", marginLeft: 3 }}>
                  ({pct}%)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
