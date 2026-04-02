import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { readableColor } from "../../services/chartHelpers";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  COLOR_PRIMARY, CALLOUT_FONT_SIZE, CALLOUT_TITLE_SIZE,
  CALLOUT_PADDING, CALLOUT_BORDER_WIDTH, CALLOUT_BORDER_RADIUS,
  CALLOUT_TITLE_MB, CALLOUT_TITLE_SPACING,
} from "../elementDefaults";

type Props = { el: SceneElement; index: number; primaryColor?: string; dark?: boolean; colors?: SceneColors; fontScale?: number };

export const CalloutElement: React.FC<Props> = ({ el, index, primaryColor, dark, colors, fontScale = 1 }) => {
  const c = resolveColors(colors, dark);
  const borderColor = (el.borderColor as string) ?? primaryColor ?? COLOR_PRIMARY;
  const animation = parseAnimation(el);

  const { progress } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "callout",
  });

  const entrance = computeEntranceStyle(progress, animation);

  // Auto-shrink font when content is long to prevent overflow
  const content = (el.content as string) ?? "";
  const baseFontSize = (el.fontSize as number) ?? CALLOUT_FONT_SIZE;
  const contentFontSize = content.length > 80 ? Math.min(baseFontSize, 48)
    : content.length > 50 ? Math.min(baseFontSize, 56)
    : baseFontSize;

  return (
    <div
      style={{
        padding: CALLOUT_PADDING,
        backgroundColor: (el.bgColor as string) ?? `${borderColor}10`,
        borderLeft: `${CALLOUT_BORDER_WIDTH}px solid ${borderColor}`,
        borderRadius: CALLOUT_BORDER_RADIUS,
        opacity: entrance.opacity,
        transform: entrance.transform,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {typeof el.title === "string" && (
        <div
          style={{
            fontSize: Math.round(CALLOUT_TITLE_SIZE * fontScale),
            color: c.label,
            marginBottom: CALLOUT_TITLE_MB,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: CALLOUT_TITLE_SPACING,
          }}
        >
          {el.title as string}
        </div>
      )}
      <div
        style={{
          fontSize: Math.round(contentFontSize * fontScale),
          color: readableColor((el.color as string) ?? borderColor, dark),
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        {content}
      </div>
    </div>
  );
};
