import { useStagger, parseStagger, parseAnimation, computeEntranceStyle, type EntranceAnimation } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  COLOR_PRIMARY, LIST_FONT_SIZE, LIST_ICON_GAP, LIST_LINE_HEIGHT,
  LIST_ICON_SCALE, LIST_ICON_MARGIN_TOP, LIST_BASE_GAP, itemScale,
} from "../elementDefaults";

const ICON_MAP: Record<string, string> = {
  bullet: "\u25cf",
  check: "\u2713",
  arrow: "\u2192",
  star: "\u2605",
  warning: "\u26a0",
};

// Sub-component — hooks called at legal component top level
type ListItemRowProps = {
  item: string;
  i: number;
  index: number;
  stagger: ReturnType<typeof parseStagger>;
  delayOverride?: number;
  animation: EntranceAnimation;
  fontSize: number;
  color: string;
  textColor: string;
  icon: string;
};

const ListItemRow: React.FC<ListItemRowProps> = ({
  item, i, index, stagger, delayOverride, animation, fontSize, color, textColor, icon,
}) => {
  const { progress } = useStagger({
    elementIndex: index,
    itemIndex: i,
    stagger,
    delayOverride,
    elementType: "list",
  });

  const entrance = computeEntranceStyle(progress, animation);

  return (
    <div
      style={{
        fontSize,
        color: textColor,
        opacity: entrance.opacity,
        transform: entrance.transform,
        display: "flex",
        alignItems: "flex-start",
        gap: LIST_ICON_GAP,
        lineHeight: LIST_LINE_HEIGHT,
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: Math.round(fontSize * LIST_ICON_SCALE), marginTop: LIST_ICON_MARGIN_TOP, flexShrink: 0 }}>
        {icon}
      </span>
      <span>{item}</span>
    </div>
  );
};

type Props = { el: SceneElement; index: number; primaryColor?: string; dark?: boolean; colors?: SceneColors; fontScale?: number };

export const ListElement: React.FC<Props> = ({ el, index, primaryColor, dark, colors, fontScale = 1 }) => {
  const items = (el.items as string[]) ?? [];
  const icon = ICON_MAP[(el.icon as string) ?? "bullet"] ?? "\u25cf";
  const color = (el.color as string) ?? primaryColor ?? COLOR_PRIMARY;
  const c = resolveColors(colors, dark);
  const textColor = c.text;
  const stagger = parseStagger(el);
  const animation = (el.animation as string) ? parseAnimation(el) : "slide-left";
  const baseFontSize = (el.fontSize as number) ?? LIST_FONT_SIZE;
  // Adaptive: shrink font + gap when many items to prevent overflow
  const itemSc = itemScale(items.length);
  const fontSize = Math.round(baseFontSize * fontScale * itemSc);
  const gap = Math.round(LIST_BASE_GAP * fontScale * itemSc);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap, width: "100%" }}>
      {items.map((item, i) => (
        <ListItemRow
          key={i}
          item={item} i={i} index={index} stagger={stagger}
          delayOverride={el.delay} animation={animation}
          fontSize={fontSize} color={color} textColor={textColor} icon={icon}
        />
      ))}
    </div>
  );
};
