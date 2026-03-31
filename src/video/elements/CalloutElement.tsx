import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const CalloutElement: React.FC<Props> = ({ el, index, primaryColor }) => {
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
            fontSize: 44,
            color: "#6b7280",
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
          fontSize: (el.fontSize as number) ?? 60,
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
