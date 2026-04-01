import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring, interpolate } from "../animation";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatValue, formatPercent, extractValue, extractLabel } from "../../services/chartHelpers";
import { usePaletteColors } from "../PaletteContext";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  BAR_MAX_H, BAR_GAP, BAR_MIN_H, BAR_MAX_BAR_H, BAR_RADIUS,
  BAR_CHAR_WIDTH, BAR_LABEL_MIN_W, BAR_LABEL_MAX_W, BAR_LABEL_PR,
  BAR_VALUE_MIN_W, BAR_VALUE_PCT_MIN_W,
  SPRING_BAR_REVEAL, BAR_LABEL_ADVANCE, BAR_VALUE_DELAY,
  barFontSize,
} from "../elementDefaults";

type BarItem = { label: string; value: number; color?: string };

function normalizeBars(el: SceneElement): BarItem[] {
  const raw = (el.bars as Record<string, unknown>[]) ?? [];
  return raw.map((d) => ({
    label: extractLabel(d),
    value: extractValue(d),
    color: typeof d.color === "string" ? d.color : undefined,
  }));
}

function computeBarLayout(count: number) {
  const barHeight = Math.max(BAR_MIN_H, Math.min(BAR_MAX_BAR_H, Math.floor((BAR_MAX_H - (count - 1) * BAR_GAP) / count)));
  const fontSize = barFontSize(barHeight);
  return { barHeight, fontSize };
}

function computeLabelWidth(bars: BarItem[], fontSize: number): number {
  const maxLen = Math.max(...bars.map((b) => b.label.length), 1);
  const charWidth = fontSize * BAR_CHAR_WIDTH;
  return Math.min(BAR_LABEL_MAX_W, Math.max(BAR_LABEL_MIN_W, Math.round(maxLen * charWidth)));
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

  const labelOpacity = spring({ frame: frame - delay + BAR_LABEL_ADVANCE, fps, config: SPRING_BAR_REVEAL });
  const valueOpacity = spring({ frame: frame - delay - BAR_VALUE_DELAY, fps, config: SPRING_BAR_REVEAL });

  const pct = totalValue > 0 ? formatPercent((bar.value / totalValue) * 100) : "0%";
  const fmtVal = formatValue(bar.value);

  return (
    <div style={{ display: "flex", alignItems: "center", height: barHeight + 6 }}>
      <div
        style={{
          width: labelWidth,
          textAlign: "right",
          paddingRight: BAR_LABEL_PR,
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
            borderRadius: BAR_RADIUS,
            boxShadow: isHl ? `0 2px 8px ${color}66` : "none",
          }}
        />
      </div>
      <div
        style={{
          minWidth: showPct ? BAR_VALUE_PCT_MIN_W : BAR_VALUE_MIN_W,
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

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors };

export const BarChartElement: React.FC<Props> = ({ el, index, dark, colors }) => {
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
  const c = resolveColors(colors, dark);
  const textCol = c.text;
  const mutedCol = c.muted;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: BAR_GAP, width: "100%", opacity: entrance.opacity, transform: entrance.transform }}>
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
