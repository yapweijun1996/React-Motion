import { useCurrentFrame, interpolate } from "remotion";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const DividerElement: React.FC<Props> = ({ el, index, primaryColor }) => {
  const frame = useCurrentFrame();
  const delay = (el.delay as number) ?? index * 8;
  const targetWidth = (el.width as number) ?? 120;
  const color = (el.color as string) ?? primaryColor ?? "#2563eb";

  const width = interpolate(frame, [delay, delay + 20], [0, targetWidth], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height: (el.height as number) ?? 3,
        backgroundColor: color,
        borderRadius: 2,
        opacity: (el.opacity as number) ?? 0.7,
      }}
    />
  );
};
