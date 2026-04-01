import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { readableColor } from "../../services/chartHelpers";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; primaryColor?: string; dark?: boolean; fontScale?: number };

export const CalloutElement: React.FC<Props> = ({ el, index, primaryColor, dark, fontScale = 1 }) => {
  const borderColor = (el.borderColor as string) ?? primaryColor ?? "#2563eb";
  const animation = parseAnimation(el);

  const { progress } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "callout",
  });

  const entrance = computeEntranceStyle(progress, animation);

  return (
    <div
      style={{
        padding: "36px 40px",
        backgroundColor: (el.bgColor as string) ?? `${borderColor}10`,
        borderLeft: `5px solid ${borderColor}`,
        borderRadius: 8,
        opacity: entrance.opacity,
        transform: entrance.transform,
        width: "100%",
      }}
    >
      {typeof el.title === "string" && (
        <div
          style={{
            fontSize: Math.round(44 * fontScale),
            color: dark ? "#cbd5e1" : "#6b7280",
            marginBottom: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {el.title as string}
        </div>
      )}
      <div
        style={{
          fontSize: Math.round(((el.fontSize as number) ?? 60) * fontScale),
          color: readableColor((el.color as string) ?? borderColor, dark),
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        {el.content as string}
      </div>
    </div>
  );
};
