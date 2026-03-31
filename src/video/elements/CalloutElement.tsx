import { useCurrentFrame, interpolate } from "remotion";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const CalloutElement: React.FC<Props> = ({ el, index, primaryColor }) => {
  const frame = useCurrentFrame();
  const delay = (el.delay as number) ?? index * 8 + 10;
  const borderColor = (el.borderColor as string) ?? primaryColor ?? "#2563eb";

  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [delay, delay + 18], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        padding: "18px 22px",
        backgroundColor: (el.bgColor as string) ?? `${borderColor}10`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8,
        opacity,
        transform: `translateY(${translateY}px)`,
        width: "100%",
      }}
    >
      {typeof el.title === "string" && (
        <div
          style={{
            fontSize: 14,
            color: "#6b7280",
            marginBottom: 6,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {el.title as string}
        </div>
      )}
      <div
        style={{
          fontSize: (el.fontSize as number) ?? 20,
          color: (el.color as string) ?? borderColor,
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        {el.content as string}
      </div>
    </div>
  );
};
