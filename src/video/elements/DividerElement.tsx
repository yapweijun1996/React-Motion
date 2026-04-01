import { interpolate } from "../animation";
import { useStagger, parseStagger } from "../useStagger";
import type { SceneElement } from "../../types";
import { COLOR_PRIMARY, DIVIDER_WIDTH, DIVIDER_HEIGHT, DIVIDER_RADIUS, DIVIDER_OPACITY } from "../elementDefaults";

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const DividerElement: React.FC<Props> = ({ el, index, primaryColor }) => {
  const targetWidth = (el.width as number) ?? DIVIDER_WIDTH;
  const color = (el.color as string) ?? primaryColor ?? COLOR_PRIMARY;

  const { progress } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "divider",
  });

  const width = interpolate(progress, [0, 1], [0, targetWidth]);

  return (
    <div
      style={{
        width,
        height: (el.height as number) ?? DIVIDER_HEIGHT,
        backgroundColor: color,
        borderRadius: DIVIDER_RADIUS,
        opacity: (el.opacity as number) ?? DIVIDER_OPACITY,
      }}
    />
  );
};
