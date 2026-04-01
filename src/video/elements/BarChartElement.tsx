import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring, interpolate } from "../animation";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatValue, formatPercent, extractValue, extractLabel } from "../../services/chartHelpers";
import { usePaletteColors } from "../PaletteContext";
import type { SceneElement } from "../../types";

type BarItem = { label: string; value: number; color?: string };

function normalizeBars(el: SceneElement): BarItem[] {
  const raw = (el.bars as Record<string, unknown>[]) ?? [];
  return raw.map((d) => ({
    label: extractLabel(d),
    value: extractValue(d),
    color: typeof d.color === "string" ? d.color : undefined,
  }));
}

// Dynamic bar sizing — ensures all bars fit within 1920×1080 canvas
const MAX_CHART_H = 880; // 1008px usable height minus ~120px title reserve
const GAP = 10;

function computeBarLayout(count: number) {
  const barHeight = Math.max(28, Math.min(80, Math.floor((MAX_CHART_H - (count - 1) * GAP) / count)));
  const fontSize = barHeight >= 64 ? 42 : barHeight >= 48 ? 36 : barHeight >= 36 ? 30 : 24;
  return { barHeight, fontSize };
}

function computeLabelWidth(bars: BarItem[], fontSize: number): number {
  const maxLen = Math.max(...bars.map((b) => b.label.length), 1);
  const charWidth = fontSize * 0.55;
  return Math.min(400, Math.max(160, Math.round(maxLen * charWidth)));
}

// Sub-component — hooks called at legal component top level
type BarItemRowProps = {
  bar: BarItem;
  i: number;
  index: number;
  stagger: ReturnType<typeof parseStagger>;
  elDelay?: number;
  maxValue: number;
  totalValue: number;
  highlightIndex: number;
  showPct: boolean;
  barHeight: number;
  fontSize: number;
  labelWidth: number;
  textCol: string;
  mutedCol: string;
};

const BarItemRow: React.FC<BarItemRowProps> = ({
  bar, i, index, stagger, elDelay, maxValue, totalValue,
  highlightIndex, showPct, barHeight, fontSize, labelWidth, textCol, mutedCol,
}) => {
  const palette = usePaletteColors();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { delay, springConfig } = useStagger({
    elementIndex: index,
    itemIndex: i,
    stagger,
    delayOverride: elDelay,
    elementType: "bar-chart",
  });

  const color = bar.color ?? chartColor(i, palette);
  const isHl = i === highlightIndex;

  const barProgress = spring({ frame: frame - delay, fps, config: springConfig });
  const barWidth = interpolate(barProgress, [0, 1], [0, (bar.value / maxValue) * 100]);

  const labelOpacity = spring({ frame: frame - delay + 4, fps, config: { damping: 20 } });
  const valueOpacity = spring({ frame: frame - delay - 15, fps, config: { damping: 20 } });

  const pct = totalValue > 0 ? formatPercent((bar.value / totalValue) * 100) : "0%";
  const fmtVal = formatValue(bar.value);

  return (
    <div style={{ display: "flex", alignItems: "center", height: barHeight + 6 }}>
      <div
        style={{
          width: labelWidth,
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
};

type Props = { el: SceneElement; index: number; dark?: boolean };

export const BarChartElement: React.FC<Props> = ({ el, index, dark }) => {
  const bars = normalizeBars(el);
  if (bars.length === 0) return null;

  const highlightIndex = (el.highlightIndex as number) ?? 0;
  const showPct = (el.showPercentage as boolean) ?? false;
  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "zoom");

  const { progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "bar-chart",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const totalValue = bars.reduce((s, b) => s + b.value, 0);

  const { barHeight, fontSize } = computeBarLayout(bars.length);
  const labelWidth = computeLabelWidth(bars, fontSize);
  const textCol = dark ? "#e2e8f0" : "#374151";
  const mutedCol = dark ? "#94a3b8" : "#9ca3af";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP, width: "100%", opacity: entrance.opacity, transform: entrance.transform }}>
      {bars.map((bar, i) => (
        <BarItemRow
          key={i}
          bar={bar} i={i} index={index} stagger={stagger} elDelay={el.delay}
          maxValue={maxValue} totalValue={totalValue} highlightIndex={highlightIndex}
          showPct={showPct} barHeight={barHeight} fontSize={fontSize} labelWidth={labelWidth}
          textCol={textCol} mutedCol={mutedCol}
        />
      ))}
    </div>
  );
};
