import { useCurrentFrame, interpolate } from "remotion";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number };

export const TextElement: React.FC<Props> = ({ el, index }) => {
  const frame = useCurrentFrame();
  const delay = (el.delay as number) ?? index * 8;
  const animation = (el.animation as string) ?? "fade";

  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY =
    animation === "slide-up"
      ? interpolate(frame, [delay, delay + 18], [40, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const scale =
    animation === "zoom"
      ? interpolate(frame, [delay, delay + 18], [0.8, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  return (
    <div
      style={{
        fontSize: (el.fontSize as number) ?? 24,
        color: (el.color as string) ?? "#ffffff",
        fontWeight: (el.fontWeight as number) ?? 400,
        textAlign: (el.align as "left" | "center" | "right") ?? "left",
        letterSpacing: (el.letterSpacing as number) ?? 0,
        textTransform: (el.textTransform as string) as React.CSSProperties["textTransform"],
        lineHeight: 1.3,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
      }}
    >
      {el.content as string}
    </div>
  );
};
