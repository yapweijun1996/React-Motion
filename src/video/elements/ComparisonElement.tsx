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
    config: { damping: 15, mass: 0.6 },
  });
  const rightProgress = spring({
    frame: frame - delay - 6, // slight stagger
    fps,
    config: { damping: 15, mass: 0.6 },
  });

  // VS label pops after both cards
  const vsProgress = spring({
    frame: frame - delay - 14,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  const leftX = interpolate(leftProgress, [0, 1], [-60, 0]);
  const rightX = interpolate(rightProgress, [0, 1], [60, 0]);

  const textColor = colors?.text ?? (dark ? "#e2e8f0" : "#1e293b");
  const subColor = colors?.muted ?? (dark ? "#94a3b8" : "#6b7280");
  const cardBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";

  const leftColor = left.color ?? "#3b82f6";
  const rightColor = right.color ?? "#ef4444";

  return (
    <div style={{
      display: "flex", alignItems: "stretch", justifyContent: "center",
      gap: 32, width: "100%",
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
        flexShrink: 0, width: 100,
        opacity: vsProgress,
        transform: `scale(${interpolate(vsProgress, [0, 1], [0.5, 1])})`,
      }}>
        <div style={{
          fontSize: Math.round(56 * fontScale), fontWeight: 800, color: colors?.muted ?? (dark ? "#94a3b8" : "#6b7280"),
          letterSpacing: 4, textTransform: "uppercase",
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
      flex: 1, maxWidth: 700,
      backgroundColor: cardBg,
      borderRadius: 16,
      borderTop: `5px solid ${color}`,
      padding: "40px 44px",
      opacity: progress,
      transform: `translateX(${translateX}px)`,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* Title */}
      <div style={{
        fontSize: Math.round(52 * fontScale), fontWeight: 700, color,
        lineHeight: 1.2,
      }}>
        {side.title}
      </div>

      {/* Value (big number) */}
      {side.value && (
        <div style={{
          fontSize: Math.round(120 * fontScale), fontWeight: 800, color: textColor,
          lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
        }}>
          {side.value}
        </div>
      )}

      {/* Subtitle */}
      {side.subtitle && (
        <div style={{
          fontSize: Math.round(44 * fontScale), color: subColor,
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
              fontSize: Math.round(40 * fontScale), color: textColor,
              display: "flex", alignItems: "baseline", gap: 12,
            }}>
              <span style={{ color, fontSize: Math.round(28 * fontScale), lineHeight: 1 }}>●</span>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
