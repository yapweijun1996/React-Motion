/**
 * Comparison element — side-by-side cards with VS divider.
 *
 * Two spring-animated cards slide in from opposite sides.
 * AI uses this for: before/after, A vs B, old/new, plan comparison.
 */

import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring, interpolate } from "../animation";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  COLOR_COMPARE_LEFT, COLOR_COMPARE_RIGHT,
  SPRING_CARD_SLIDE, SPRING_VS_POP,
  COMPARE_RIGHT_OFFSET, COMPARE_VS_OFFSET,
  COMPARE_SLIDE_LEFT, COMPARE_SLIDE_RIGHT, COMPARE_VS_SCALE_FROM,
  COMPARE_GAP, COMPARE_VS_W, COMPARE_VS_SPACING, COMPARE_VS_SIZE,
  COMPARE_CARD_MAX_W, COMPARE_CARD_RADIUS, COMPARE_BORDER_TOP,
  COMPARE_CARD_PADDING, COMPARE_CARD_GAP,
  COMPARE_TITLE_SIZE, COMPARE_VALUE_SIZE, COMPARE_SUB_SIZE,
  COMPARE_ITEM_SIZE, COMPARE_ITEM_GAP, COMPARE_DOT_SIZE,
} from "../elementDefaults";

type ComparisonSide = {
  title: string;
  value?: string;
  subtitle?: string;
  color?: string;
  items?: string[];
};

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors; fontScale?: number };

export const ComparisonElement: React.FC<Props> = ({ el, index, dark, colors, fontScale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const left = (el.left as ComparisonSide) ?? { title: "A" };
  const right = (el.right as ComparisonSide) ?? { title: "B" };
  const vsLabel = (el.label as string) ?? "VS";

  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "fade");

  const { delay, progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "comparison",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  // Left card slides in from left, right from right
  const leftProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CARD_SLIDE,
  });
  const rightProgress = spring({
    frame: frame - delay - COMPARE_RIGHT_OFFSET,
    fps,
    config: SPRING_CARD_SLIDE,
  });

  // VS label pops after both cards
  const vsProgress = spring({
    frame: frame - delay - COMPARE_VS_OFFSET,
    fps,
    config: SPRING_VS_POP,
  });

  const leftX = interpolate(leftProgress, [0, 1], [COMPARE_SLIDE_LEFT, 0]);
  const rightX = interpolate(rightProgress, [0, 1], [COMPARE_SLIDE_RIGHT, 0]);

  const c = resolveColors(colors, dark);
  const textColor = c.text;
  const subColor = c.muted;
  const cardBg = c.cardBg;

  const leftColor = left.color ?? COLOR_COMPARE_LEFT;
  const rightColor = right.color ?? COLOR_COMPARE_RIGHT;

  return (
    <div style={{
      display: "flex", alignItems: "stretch", justifyContent: "center",
      gap: COMPARE_GAP, width: "100%",
      opacity: entrance.opacity, transform: entrance.transform,
    }}>
      {/* Left card */}
      <Card
        side={left}
        color={leftColor}
        cardBg={cardBg}
        textColor={textColor}
        subColor={subColor}
        progress={leftProgress}
        translateX={leftX}
        fontScale={fontScale}
      />

      {/* VS divider */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, width: COMPARE_VS_W,
        opacity: vsProgress,
        transform: `scale(${interpolate(vsProgress, [0, 1], [COMPARE_VS_SCALE_FROM, 1])})`,
      }}>
        <div style={{
          fontSize: Math.round(COMPARE_VS_SIZE * fontScale), fontWeight: 800, color: c.muted,
          letterSpacing: COMPARE_VS_SPACING, textTransform: "uppercase",
        }}>
          {vsLabel}
        </div>
      </div>

      {/* Right card */}
      <Card
        side={right}
        color={rightColor}
        cardBg={cardBg}
        textColor={textColor}
        subColor={subColor}
        progress={rightProgress}
        translateX={rightX}
        fontScale={fontScale}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Card sub-component
// ---------------------------------------------------------------------------

type CardProps = {
  side: ComparisonSide;
  color: string;
  cardBg: string;
  textColor: string;
  subColor: string;
  progress: number;
  translateX: number;
  fontScale: number;
};

const Card: React.FC<CardProps> = ({
  side, color, cardBg, textColor, subColor, progress, translateX, fontScale,
}) => {
  return (
    <div style={{
      flex: 1, maxWidth: COMPARE_CARD_MAX_W,
      backgroundColor: cardBg,
      borderRadius: COMPARE_CARD_RADIUS,
      borderTop: `${COMPARE_BORDER_TOP}px solid ${color}`,
      padding: COMPARE_CARD_PADDING,
      opacity: progress,
      transform: `translateX(${translateX}px)`,
      display: "flex", flexDirection: "column", gap: COMPARE_CARD_GAP,
    }}>
      {/* Title */}
      <div style={{
        fontSize: Math.round(COMPARE_TITLE_SIZE * fontScale), fontWeight: 700, color,
        lineHeight: 1.2,
      }}>
        {side.title}
      </div>

      {/* Value (big number) */}
      {side.value && (
        <div style={{
          fontSize: Math.round(COMPARE_VALUE_SIZE * fontScale), fontWeight: 800, color: textColor,
          lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
        }}>
          {side.value}
        </div>
      )}

      {/* Subtitle */}
      {side.subtitle && (
        <div style={{
          fontSize: Math.round(COMPARE_SUB_SIZE * fontScale), color: subColor,
          lineHeight: 1.3,
        }}>
          {side.subtitle}
        </div>
      )}

      {/* Optional bullet items */}
      {side.items && side.items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {side.items.map((item, i) => (
            <div key={i} style={{
              fontSize: Math.round(COMPARE_ITEM_SIZE * fontScale), color: textColor,
              display: "flex", alignItems: "baseline", gap: COMPARE_ITEM_GAP,
            }}>
              <span style={{ color, fontSize: Math.round(COMPARE_DOT_SIZE * fontScale), lineHeight: 1 }}>●</span>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
