import { interpolate } from "../animation";
import { useStagger, parseStagger } from "../useStagger";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const DividerElement: React.FC<Props> = ({ el, index, primaryColor }) => {
  const targetWidth = (el.width as number) ?? 400;
  const color = (el.color as string) ?? primaryColor ?? "#2563eb";

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
        height: (el.height as number) ?? 4,
        backgroundColor: color,
        borderRadius: 2,
        opacity: (el.opacity as number) ?? 0.7,
      }}
    />
  );
};
