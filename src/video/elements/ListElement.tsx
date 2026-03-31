import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";

const ICON_MAP: Record<string, string> = {
  bullet: "\u25cf",
  check: "\u2713",
  arrow: "\u2192",
  star: "\u2605",
  warning: "\u26a0",
};

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const ListElement: React.FC<Props> = ({ el, index, primaryColor }) => {
  const items = (el.items as string[]) ?? [];
  const icon = ICON_MAP[(el.icon as string) ?? "bullet"] ?? "\u25cf";
  const color = (el.color as string) ?? primaryColor ?? "#2563eb";
  const textColor = (el.textColor as string) ?? "#1f2937";
  const stagger = parseStagger(el);
  // List defaults to slide-left if no animation specified (natural for staggered items)
  const animation = (el.animation as string) ? parseAnimation(el) : "slide-left";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%" }}>
      {items.map((item, i) => {
        const { progress } = useStagger({
          elementIndex: index,
          itemIndex: i,
          stagger,
          delayOverride: el.delay,
          elementType: "list",
        });

        const entrance = computeEntranceStyle(progress, animation);

        return (
          <div
            key={i}
            style={{
              fontSize: (el.fontSize as number) ?? 56,
              color: textColor,
              opacity: entrance.opacity,
              transform: entrance.transform,
              display: "flex",
              alignItems: "flex-start",
              gap: 20,
              lineHeight: 1.4,
            }}
          >
            <span style={{ color, fontWeight: 700, fontSize: 50, marginTop: 4, flexShrink: 0 }}>
              {icon}
            </span>
            <span>{item}</span>
          </div>
        );
      })}
    </div>
  );
};
