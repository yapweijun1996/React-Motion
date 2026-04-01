import { useStagger, parseStagger, parseAnimation, computeEntranceStyle, type EntranceAnimation } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";

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
        gap: 20,
        lineHeight: 1.4,
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: Math.round(fontSize * 0.9), marginTop: 4, flexShrink: 0 }}>
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
  const color = (el.color as string) ?? primaryColor ?? "#2563eb";
  // Body text always uses high-contrast defaults — AI-set textColor is unreliable
  const textColor = colors?.text ?? (dark ? "#e2e8f0" : "#1e293b");
  const stagger = parseStagger(el);
  const animation = (el.animation as string) ? parseAnimation(el) : "slide-left";
  const baseFontSize = (el.fontSize as number) ?? 56;
  // Adaptive: shrink font + gap when many items to prevent overflow
  const itemScale = items.length > 8 ? 0.75 : items.length > 6 ? 0.85 : 1;
  const fontSize = Math.round(baseFontSize * fontScale * itemScale);
  const gap = Math.round(28 * fontScale * itemScale);

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
