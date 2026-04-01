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
import { IconCheck } from "../../components/Icons";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  SPRING_LINE_DRAW, SPRING_NODE_POP, SPRING_LABEL_FADE,
  TIMELINE_NODE_R, TIMELINE_ACTIVE_R, TIMELINE_NODE_STROKE, TIMELINE_NODE_STROKE_W,
  TIMELINE_GLOW_R, TIMELINE_GLOW_OPACITY,
  TIMELINE_SVG_H, TIMELINE_LABEL_MT, TIMELINE_LABEL_PX, TIMELINE_EDGE_PAD, TIMELINE_TRACK_W,
  TIMELINE_VERT_PX, TIMELINE_VERT_MIN_H, TIMELINE_VERT_GAP, TIMELINE_VERT_COL_W,
  TIMELINE_VERT_LINE_W, TIMELINE_VERT_LINE_MIN_H,
  TIMELINE_LABEL_FONT, TIMELINE_DESC_FONT, TIMELINE_DESC_MT,
  TIMELINE_NODE_STAGGER, TIMELINE_VERT_NODE_STAGGER, TIMELINE_LABEL_DELAY,
  itemScale,
} from "../elementDefaults";

type TimelineItem = {
  label: string;
  description?: string;
  color?: string;
};

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors; fontScale?: number };

const NODE_R = TIMELINE_NODE_R;
const NODE_ACTIVE_R = TIMELINE_ACTIVE_R;

export const TimelineElement: React.FC<Props> = ({ el, index, dark, colors, fontScale = 1 }) => {
  const c = resolveColors(colors, dark);
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
    config: SPRING_LINE_DRAW,
  });

  const textColor = c.text;
  const subColor = c.muted;

  if (items.length === 0) return null;

  // Adaptive: shrink fonts when many items
  const itemSc = itemScale(items.length, 6, 4);
  const fs = fontScale * itemSc;

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
      <svg viewBox={`0 0 1000 ${TIMELINE_SVG_H}`} style={{ width: "100%", height: TIMELINE_SVG_H, overflow: "visible" }}>
        {/* Track line */}
        <line
          x1={nodeX(0, count)} y1={30} x2={nodeX(count - 1, count)} y2={30}
          stroke={lineColor} strokeWidth={TIMELINE_TRACK_W}
        />
        {/* Animated fill line */}
        {count > 1 && (
          <line
            x1={nodeX(0, count)} y1={30}
            x2={nodeX(0, count) + (nodeX(count - 1, count) - nodeX(0, count)) * lineProgress}
            y2={30}
            stroke={items[0].color ?? chartColor(0, palette)} strokeWidth={TIMELINE_TRACK_W}
            strokeLinecap="round"
          />
        )}
        {/* Nodes */}
        {items.map((item, i) => {
          const nodeProgress = spring({
            frame: frame - delay - i * TIMELINE_NODE_STAGGER,
            fps,
            config: SPRING_NODE_POP,
          });
          const isActive = i === activeIndex;
          const cx = nodeX(i, count);
          const r = isActive ? NODE_ACTIVE_R : NODE_R;
          const color = item.color ?? chartColor(i, palette);

          return (
            <g key={i}>
              {/* Glow for active */}
              {isActive && (
                <circle cx={cx} cy={30} r={r + TIMELINE_GLOW_R}
                  fill={color} opacity={TIMELINE_GLOW_OPACITY * nodeProgress}
                />
              )}
              <circle
                cx={cx} cy={30} r={r * nodeProgress}
                fill={color} stroke={TIMELINE_NODE_STROKE} strokeWidth={TIMELINE_NODE_STROKE_W}
              />
              {/* Checkmark inside completed nodes */}
              {i <= activeIndex && activeIndex >= 0 && (
                <g opacity={nodeProgress}>
                  <polyline
                    points={`${cx - 6},${30} ${cx - 1},${36} ${cx + 7},${24}`}
                    fill="none" stroke={TIMELINE_NODE_STROKE} strokeWidth={TIMELINE_NODE_STROKE_W}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Labels below */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: TIMELINE_LABEL_MT, padding: TIMELINE_LABEL_PX }}>
        {items.map((item, i) => {
          const nodeProgress = spring({
            frame: frame - delay - i * TIMELINE_NODE_STAGGER - TIMELINE_LABEL_DELAY,
            fps,
            config: SPRING_LABEL_FADE,
          });
          const isActive = i === activeIndex;

          return (
            <div key={i} style={{
              flex: 1, textAlign: "center", opacity: nodeProgress,
              transform: `translateY(${(1 - nodeProgress) * 12}px)`,
            }}>
              <div style={{
                fontSize: Math.round(TIMELINE_LABEL_FONT * fontScale), fontWeight: isActive ? 700 : 500,
                color: isActive ? (item.color ?? chartColor(i, palette)) : textColor,
              }}>
                {item.label}
              </div>
              {item.description && (
                <div style={{ fontSize: Math.round(TIMELINE_DESC_FONT * fontScale), color: subColor, marginTop: TIMELINE_DESC_MT }}>
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
  const pad = TIMELINE_EDGE_PAD;
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
      width: "100%", padding: TIMELINE_VERT_PX,
    }}>
      {items.map((item, i) => {
        const nodeProgress = spring({
          frame: frame - delay - i * TIMELINE_VERT_NODE_STAGGER,
          fps,
          config: SPRING_NODE_POP,
        });
        const isActive = i === activeIndex;
        const color = item.color ?? chartColor(i, palette);
        const isLast = i === items.length - 1;

        return (
          <div key={i} style={{ display: "flex", gap: TIMELINE_VERT_GAP, minHeight: TIMELINE_VERT_MIN_H }}>
            {/* Node column */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              width: TIMELINE_VERT_COL_W, flexShrink: 0,
            }}>
              {/* Node circle */}
              <div style={{
                width: (isActive ? NODE_ACTIVE_R : NODE_R) * 2 * nodeProgress,
                height: (isActive ? NODE_ACTIVE_R : NODE_R) * 2 * nodeProgress,
                borderRadius: "50%",
                backgroundColor: color,
                border: `${TIMELINE_NODE_STROKE_W}px solid ${TIMELINE_NODE_STROKE}`,
                boxShadow: isActive ? `0 0 12px ${color}44` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "#fff", fontWeight: 700,
                flexShrink: 0,
              }}>
                {i <= activeIndex && activeIndex >= 0 ? <IconCheck size={16} color="#fff" /> : ""}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div style={{
                  flex: 1, width: TIMELINE_VERT_LINE_W, minHeight: TIMELINE_VERT_LINE_MIN_H,
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
                fontSize: Math.round(TIMELINE_LABEL_FONT * fontScale), fontWeight: isActive ? 700 : 500,
                color: isActive ? color : textColor,
                lineHeight: 1.2,
              }}>
                {item.label}
              </div>
              {item.description && (
                <div style={{ fontSize: Math.round(TIMELINE_DESC_FONT * fontScale), color: subColor, marginTop: TIMELINE_DESC_MT }}>
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
