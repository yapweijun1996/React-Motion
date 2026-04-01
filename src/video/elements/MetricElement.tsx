import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring } from "../animation";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle, type EntranceAnimation } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  COLOR_PRIMARY, SPRING_COUNT_UP,
  METRIC_SUFFIX_ML, METRIC_LABEL_MT, METRIC_SUBTEXT_MT,
  METRIC_LINE_HEIGHT, METRIC_COUNT_OFFSET,
  metricSizeTier, metricGap,
} from "../elementDefaults";

type MetricItem = {
  value: string;
  label: string;
  subtext?: string;
  color?: string;
};

// Adaptive font sizes — delegated to elementDefaults
const metricSizes = metricSizeTier;

// Sub-component — hooks called at legal component top level
type MetricItemCardProps = {
  item: MetricItem;
  i: number;
  index: number;
  stagger: ReturnType<typeof parseStagger>;
  delayOverride?: number;
  animation: EntranceAnimation;
  primaryColor?: string;
  dark?: boolean;
  colors?: SceneColors;
  sizes: ReturnType<typeof metricSizes>;
};

const MetricItemCard: React.FC<MetricItemCardProps> = ({
  item, i, index, stagger, delayOverride, animation, primaryColor, dark, colors, sizes,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { progress, delay } = useStagger({
    elementIndex: index,
    itemIndex: i,
    stagger,
    delayOverride,
    elementType: "metric",
  });

  const countProgress = spring({
    frame: frame - delay - METRIC_COUNT_OFFSET,
    fps,
    config: SPRING_COUNT_UP,
  });

  const numericValue = parseFloat(item.value.replace(/[^0-9.]/g, ""));
  const hasNumeric = isFinite(numericValue);
  const suffix = hasNumeric ? item.value.replace(/[0-9.,]/g, "").trim() : "";
  const displayNum = hasNumeric ? numericValue * countProgress : 0;

  const formatted = hasNumeric
    ? item.value.includes(".")
      ? displayNum.toFixed(1)
      : Math.round(displayNum).toLocaleString()
    : item.value;

  const c = resolveColors(colors, dark);
  const color = item.color ?? primaryColor ?? COLOR_PRIMARY;
  const entrance = computeEntranceStyle(progress, animation);

  return (
    <div
      style={{
        textAlign: "center",
        minWidth: 180,
        opacity: entrance.opacity,
        transform: entrance.transform,
      }}
    >
      <div
        style={{
          fontSize: sizes.value,
          fontWeight: 800,
          color,
          lineHeight: METRIC_LINE_HEIGHT,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatted}
        {suffix && <span style={{ fontSize: sizes.suffix, marginLeft: METRIC_SUFFIX_ML }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: sizes.label, color: c.label, marginTop: METRIC_LABEL_MT, fontWeight: 500 }}>
        {item.label}
      </div>
      {item.subtext && (
        <div style={{ fontSize: sizes.subtext, color: c.muted, marginTop: METRIC_SUBTEXT_MT }}>
          {item.subtext}
        </div>
      )}
    </div>
  );
};

type Props = { el: SceneElement; index: number; primaryColor?: string; dark?: boolean; colors?: SceneColors; fontScale?: number };

export const MetricElement: React.FC<Props> = ({ el, index, primaryColor, dark, colors, fontScale = 1 }) => {
  const items = (el.items as MetricItem[]) ?? [];
  const stagger = parseStagger(el);
  const animation = parseAnimation(el);
  const sizes = metricSizes(items.length);
  // Scale sizes by scene density
  const scaled = {
    value: Math.round(sizes.value * fontScale),
    label: Math.round(sizes.label * fontScale),
    subtext: Math.round(sizes.subtext * fontScale),
    suffix: Math.round(sizes.suffix * fontScale),
  };
  const gap = Math.round(metricGap(items.length) * fontScale);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap,
        flexWrap: "wrap",
      }}
    >
      {items.map((item, i) => (
        <MetricItemCard
          key={i}
          item={item} i={i} index={index} stagger={stagger}
          delayOverride={el.delay} animation={animation}
          primaryColor={primaryColor} dark={dark} colors={colors} sizes={scaled}
        />
      ))}
    </div>
  );
};
