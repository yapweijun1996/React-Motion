import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; dark?: boolean };

export const TextElement: React.FC<Props> = ({ el, index, dark }) => {
  const animation = parseAnimation(el);

  const { progress } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "text",
  });

  const { opacity, transform } = computeEntranceStyle(progress, animation);

  return (
    <div
      style={{
        fontSize: (el.fontSize as number) ?? 80,
        color: (el.color as string) ?? (dark ? "#f1f5f9" : "#1e293b"),
        fontWeight: (el.fontWeight as number) ?? 400,
        textAlign: (el.align as "left" | "center" | "right") ?? "left",
        letterSpacing: (el.letterSpacing as number) ?? 0,
        textTransform: (el.textTransform as string) as React.CSSProperties["textTransform"],
        lineHeight: 1.3,
        opacity,
        transform,
      }}
    >
      {el.content as string}
    </div>
  );
};
