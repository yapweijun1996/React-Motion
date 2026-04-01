import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring, interpolate } from "../animation";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatValue, formatPercent } from "../../services/chartHelpers";
import type { SceneElement } from "../../types";

type BarItem = { label: string; value: number; color?: string };

type Props = { el: SceneElement; index: number; dark?: boolean };

export const BarChartElement: React.FC<Props> = ({ el, index, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = (el.bars as BarItem[]) ?? [];
  const highlightIndex = (el.highlightIndex as number) ?? 0;
  const showPct = (el.showPercentage as boolean) ?? false;
  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "zoom");

  // Container-level entrance animation
  const { progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "bar-chart",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const totalValue = bars.reduce((s, b) => s + b.value, 0);

  const barHeight = bars.length <= 4 ? 80 : bars.length <= 6 ? 64 : 52;
  const fontSize = bars.length <= 4 ? 42 : 36;
  const textCol = dark ? "#e2e8f0" : "#374151";
  const mutedCol = dark ? "#94a3b8" : "#9ca3af";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", opacity: entrance.opacity, transform: entrance.transform }}>
      {bars.map((bar, i) => {
        const { delay, springConfig } = useStagger({
          elementIndex: index,
          itemIndex: i,
          stagger,
          delayOverride: el.delay,
          elementType: "bar-chart",
        });

        const color = bar.color ?? chartColor(i);
        const isHl = i === highlightIndex;

        const barProgress = spring({ frame: frame - delay, fps, config: springConfig });
        const barWidth = interpolate(barProgress, [0, 1], [0, (bar.value / maxValue) * 100]);

        const labelOpacity = spring({ frame: frame - delay + 4, fps, config: { damping: 20 } });
        const valueOpacity = spring({ frame: frame - delay - 15, fps, config: { damping: 20 } });

        const pct = totalValue > 0 ? formatPercent((bar.value / totalValue) * 100) : "0%";
        const fmtVal = formatValue(bar.value);

        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: barHeight + 6 }}>
            <div
              style={{
                width: 320,
                textAlign: "right",
                paddingRight: 12,
                fontSize,
                color: textCol,
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
                minWidth: showPct ? 220 : 140,
                paddingLeft: 8,
                fontSize,
                fontWeight: 600,
                color: isHl ? color : textCol,
                opacity: valueOpacity,
                flexShrink: 0,
              }}
            >
              {fmtVal}
              {showPct && (
                <span style={{ fontSize: fontSize - 2, color: mutedCol, marginLeft: 3 }}>
                  ({pct})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
