import { useCurrentFrame, interpolate } from "remotion";
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
  const frame = useCurrentFrame();
  const items = (el.items as string[]) ?? [];
  const icon = ICON_MAP[(el.icon as string) ?? "bullet"] ?? "\u25cf";
  const color = (el.color as string) ?? primaryColor ?? "#2563eb";
  const textColor = (el.textColor as string) ?? "#1f2937";
  const baseDelay = (el.delay as number) ?? index * 8 + 5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      {items.map((item, i) => {
        const delay = baseDelay + i * 10;

        const opacity = interpolate(frame, [delay, delay + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateX = interpolate(frame, [delay, delay + 14], [-20, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={i}
            style={{
              fontSize: (el.fontSize as number) ?? 24,
              color: textColor,
              opacity,
              transform: `translateX(${translateX}px)`,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              lineHeight: 1.4,
            }}
          >
            <span style={{ color, fontWeight: 700, fontSize: 18, marginTop: 3, flexShrink: 0 }}>
              {icon}
            </span>
            <span>{item}</span>
          </div>
        );
      })}
    </div>
  );
};
