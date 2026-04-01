/**
 * Timeline element — horizontal or vertical milestones.
 *
 * SVG line draw + staggered spring node pop-in.
 * AI uses this for chronological events, project phases, process steps.
 */

import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring } from "../animation";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor } from "../../services/chartHelpers";
import { usePaletteColors } from "../PaletteContext";
import type { SceneElement } from "../../types";

type TimelineItem = {
  label: string;
  description?: string;
  color?: string;
};

type Props = { el: SceneElement; index: number; dark?: boolean; fontScale?: number };

const NODE_R = 16;
const NODE_ACTIVE_R = 20;

export const TimelineElement: React.FC<Props> = ({ el, index, dark, fontScale = 1 }) => {
  const palette = usePaletteColors();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (el.items as TimelineItem[]) ?? [];
  const activeIndex = (el.activeIndex as number) ?? -1;
  const orientation = (el.orientation as string) === "vertical" ? "vertical" : "horizontal";
  const lineColor = (el.lineColor as string) ?? (dark ? "rgba(255,255,255,0.15)" : "#e5e7eb");

  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "fade");

  const { delay, progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "timeline",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  // Line draw progress (spring)
  const lineProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, mass: 0.7 },
  });

  const textColor = dark ? "#e2e8f0" : "#1e293b";
  const subColor = dark ? "#94a3b8" : "#6b7280";

  if (items.length === 0) return null;

  // Adaptive: shrink fonts when many items
  const itemScale = items.length > 6 ? 0.75 : items.length > 4 ? 0.85 : 1;
  const fs = fontScale * itemScale;

  if (orientation === "vertical") {
    return (
      <VerticalTimeline
        items={items} activeIndex={activeIndex} lineColor={lineColor}
        lineProgress={lineProgress} frame={frame} delay={delay} fps={fps}
        textColor={textColor} subColor={subColor} dark={dark}
        entrance={entrance} fontScale={fs} palette={palette}
      />
    );
  }

  return (
    <HorizontalTimeline
      items={items} activeIndex={activeIndex} lineColor={lineColor}
      lineProgress={lineProgress} frame={frame} delay={delay} fps={fps}
      textColor={textColor} subColor={subColor} dark={dark}
      entrance={entrance} fontScale={fs} palette={palette}
    />
  );
};

// ---------------------------------------------------------------------------
// Horizontal layout
// ---------------------------------------------------------------------------

type LayoutProps = {
  items: TimelineItem[];
  activeIndex: number;
  lineColor: string;
  lineProgress: number;
  frame: number;
  delay: number;
  fps: number;
  textColor: string;
  subColor: string;
  dark?: boolean;
  entrance: { opacity: number; transform: string };
  fontScale: number;
  palette: readonly string[] | null;
};

const HorizontalTimeline: React.FC<LayoutProps> = ({
  items, activeIndex, lineColor, lineProgress, frame, delay, fps,
  textColor, subColor, entrance, fontScale, palette,
}) => {
  const count = items.length;

  return (
    <div style={{
      width: "100%", opacity: entrance.opacity, transform: entrance.transform,
      padding: "20px 0",
    }}>
      {/* Line + nodes (SVG overlay) */}
      <svg viewBox="0 0 1000 60" style={{ width: "100%", height: 60, overflow: "visible" }}>
        {/* Track line */}
        <line
          x1={nodeX(0, count)} y1={30} x2={nodeX(count - 1, count)} y2={30}
          stroke={lineColor} strokeWidth={3}
        />
        {/* Animated fill line */}
        {count > 1 && (
          <line
            x1={nodeX(0, count)} y1={30}
            x2={nodeX(0, count) + (nodeX(count - 1, count) - nodeX(0, count)) * lineProgress}
            y2={30}
            stroke={items[0].color ?? chartColor(0, palette)} strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        {/* Nodes */}
        {items.map((item, i) => {
          const nodeProgress = spring({
            frame: frame - delay - i * 8,
            fps,
            config: { damping: 14, mass: 0.5 },
          });
          const isActive = i === activeIndex;
          const cx = nodeX(i, count);
          const r = isActive ? NODE_ACTIVE_R : NODE_R;
          const color = item.color ?? chartColor(i, palette);

          return (
            <g key={i}>
              {/* Glow for active */}
              {isActive && (
                <circle cx={cx} cy={30} r={r + 8}
                  fill={color} opacity={0.2 * nodeProgress}
                />
              )}
              <circle
                cx={cx} cy={30} r={r * nodeProgress}
                fill={color} stroke="#fff" strokeWidth={3}
              />
              {/* Checkmark inside completed nodes */}
              {i <= activeIndex && activeIndex >= 0 && (
                <text x={cx} y={36} textAnchor="middle" fontSize={18}
                  fill="#fff" fontWeight={700} opacity={nodeProgress}>
                  ✓
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Labels below */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: "0 20px" }}>
        {items.map((item, i) => {
          const nodeProgress = spring({
            frame: frame - delay - i * 8 - 4,
            fps,
            config: { damping: 16, mass: 0.6 },
          });
          const isActive = i === activeIndex;

          return (
            <div key={i} style={{
              flex: 1, textAlign: "center", opacity: nodeProgress,
              transform: `translateY(${(1 - nodeProgress) * 12}px)`,
            }}>
              <div style={{
                fontSize: Math.round(48 * fontScale), fontWeight: isActive ? 700 : 500,
                color: isActive ? (item.color ?? chartColor(i, palette)) : textColor,
              }}>
                {item.label}
              </div>
              {item.description && (
                <div style={{ fontSize: Math.round(36 * fontScale), color: subColor, marginTop: 4 }}>
                  {item.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** X position for node i out of count nodes in a 1000-wide SVG. */
function nodeX(i: number, count: number): number {
  if (count <= 1) return 500;
  const pad = 60; // padding from edges
  return pad + (i / (count - 1)) * (1000 - pad * 2);
}

// ---------------------------------------------------------------------------
// Vertical layout
// ---------------------------------------------------------------------------

const VerticalTimeline: React.FC<LayoutProps> = ({
  items, activeIndex, lineColor, lineProgress, frame, delay, fps,
  textColor, subColor, entrance, fontScale, palette,
}) => {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      opacity: entrance.opacity, transform: entrance.transform,
      width: "100%", padding: "0 48px",
    }}>
      {items.map((item, i) => {
        const nodeProgress = spring({
          frame: frame - delay - i * 10,
          fps,
          config: { damping: 14, mass: 0.5 },
        });
        const isActive = i === activeIndex;
        const color = item.color ?? chartColor(i, palette);
        const isLast = i === items.length - 1;

        return (
          <div key={i} style={{ display: "flex", gap: 24, minHeight: 80 }}>
            {/* Node column */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              width: 48, flexShrink: 0,
            }}>
              {/* Node circle */}
              <div style={{
                width: (isActive ? NODE_ACTIVE_R : NODE_R) * 2 * nodeProgress,
                height: (isActive ? NODE_ACTIVE_R : NODE_R) * 2 * nodeProgress,
                borderRadius: "50%",
                backgroundColor: color,
                border: "3px solid #fff",
                boxShadow: isActive ? `0 0 12px ${color}44` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "#fff", fontWeight: 700,
                flexShrink: 0,
              }}>
                {i <= activeIndex && activeIndex >= 0 ? "✓" : ""}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div style={{
                  flex: 1, width: 3, minHeight: 32,
                  background: lineProgress > (i + 1) / items.length
                    ? color
                    : lineColor,
                }} />
              )}
            </div>
            {/* Content */}
            <div style={{
              paddingBottom: 24,
              opacity: nodeProgress,
              transform: `translateX(${(1 - nodeProgress) * 20}px)`,
            }}>
              <div style={{
                fontSize: Math.round(48 * fontScale), fontWeight: isActive ? 700 : 500,
                color: isActive ? color : textColor,
                lineHeight: 1.2,
              }}>
                {item.label}
              </div>
              {item.description && (
                <div style={{ fontSize: Math.round(36 * fontScale), color: subColor, marginTop: 4 }}>
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
