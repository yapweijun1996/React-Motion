/**
 * Progress gauge element — circular, semicircle, or linear.
 *
 * Spring-driven arc fill + count-up number. SVG-based, export-safe.
 * AI uses this for percentages, scores, completion rates, targets.
 */

import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring } from "../animation";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  COLOR_PROGRESS, SPRING_FILL_ARC,
  PROGRESS_SIZE as SIZE, PROGRESS_STROKE as STROKE_DEFAULT,
  PROGRESS_MAX, PROGRESS_SUFFIX, PROGRESS_VARIANT,
  PROGRESS_CIRC_NUM, PROGRESS_CIRC_SUFFIX,
  PROGRESS_SEMI_NUM, PROGRESS_SEMI_SUFFIX, PROGRESS_SEMI_PAD,
  PROGRESS_LINEAR_NUM, PROGRESS_LINEAR_SUFFIX, PROGRESS_LINEAR_MIN_H, PROGRESS_LINEAR_MAX_W,
  PROGRESS_LABEL_SIZE, PROGRESS_LABEL_MB,
} from "../elementDefaults";

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors };

type Variant = "circular" | "semicircle" | "linear";

export const ProgressElement: React.FC<Props> = ({ el, index, dark, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const value = Math.max(0, (el.value as number) ?? 0);
  const max = Math.max(1, (el.max as number) ?? PROGRESS_MAX);
  const label = (el.label as string) ?? "";
  const color = (el.color as string) ?? COLOR_PROGRESS;
  const variant: Variant = (["circular", "semicircle", "linear"].includes(el.variant as string)
    ? el.variant : PROGRESS_VARIANT) as Variant;
  const suffix = (el.suffix as string) ?? PROGRESS_SUFFIX;
  const thickness = Math.max(4, Math.min(32, (el.thickness as number) ?? STROKE_DEFAULT));

  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "zoom");

  const { delay, progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "progress",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  // Fill spring (heavier for satisfying arc animation)
  const fillProgress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_FILL_ARC,
  });

  const ratio = Math.min(value / max, 1);
  const animatedRatio = ratio * fillProgress;
  const animatedValue = value * fillProgress;

  // Format display number
  const displayNum = value === Math.floor(value)
    ? Math.round(animatedValue).toLocaleString()
    : animatedValue.toFixed(1);

  const c = resolveColors(colors, dark);
  const textColor = c.text;
  const trackColor = c.track;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 16, opacity: entrance.opacity, transform: entrance.transform,
    }}>
      {variant === "circular" && (
        <CircularGauge
          ratio={animatedRatio} color={color} trackColor={trackColor}
          thickness={thickness} displayNum={displayNum} suffix={suffix}
          textColor={textColor}
        />
      )}
      {variant === "semicircle" && (
        <SemicircleGauge
          ratio={animatedRatio} color={color} trackColor={trackColor}
          thickness={thickness} displayNum={displayNum} suffix={suffix}
          textColor={textColor}
        />
      )}
      {variant === "linear" && (
        <LinearGauge
          ratio={animatedRatio} color={color} trackColor={trackColor}
          thickness={thickness} displayNum={displayNum} suffix={suffix}
          textColor={textColor}
        />
      )}
      {label && (
        <div style={{ fontSize: PROGRESS_LABEL_SIZE, color: c.label, fontWeight: 500, textAlign: "center" }}>
          {label}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Circular gauge
// ---------------------------------------------------------------------------

type GaugeProps = {
  ratio: number;
  color: string;
  trackColor: string;
  thickness: number;
  displayNum: string;
  suffix: string;
  textColor: string;
};

const CircularGauge: React.FC<GaugeProps> = ({
  ratio, color, trackColor, thickness, displayNum, suffix, textColor,
}) => {
  const r = (SIZE - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - ratio);

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: "100%", height: "100%" }}>
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={r}
          fill="none" stroke={trackColor} strokeWidth={thickness}
        />
        {/* Fill */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={r}
          fill="none" stroke={color} strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      {/* Center number */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
      }}>
        <span style={{ fontSize: PROGRESS_CIRC_NUM, fontWeight: 800, color: textColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {displayNum}
          <span style={{ fontSize: PROGRESS_CIRC_SUFFIX }}>{suffix}</span>
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Semicircle gauge
// ---------------------------------------------------------------------------

const SemicircleGauge: React.FC<GaugeProps> = ({
  ratio, color, trackColor, thickness, displayNum, suffix, textColor,
}) => {
  const r = (SIZE - thickness) / 2;
  const halfCirc = Math.PI * r;
  const offset = halfCirc * (1 - ratio);

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE / 2 + PROGRESS_SEMI_PAD }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE / 2 + thickness}`} style={{ width: "100%", height: "auto" }}>
        {/* Track (half circle) */}
        <path
          d={describeArc(SIZE / 2, SIZE / 2, r, 180, 360)}
          fill="none" stroke={trackColor} strokeWidth={thickness} strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={describeArc(SIZE / 2, SIZE / 2, r, 180, 360)}
          fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={halfCirc}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Number below arc center */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "center",
      }}>
        <span style={{ fontSize: PROGRESS_SEMI_NUM, fontWeight: 800, color: textColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {displayNum}
          <span style={{ fontSize: PROGRESS_SEMI_SUFFIX }}>{suffix}</span>
        </span>
      </div>
    </div>
  );
};

/** SVG arc path from startAngle to endAngle (degrees). */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ---------------------------------------------------------------------------
// Linear gauge
// ---------------------------------------------------------------------------

const LinearGauge: React.FC<GaugeProps> = ({
  ratio, color, trackColor, thickness, displayNum, suffix, textColor,
}) => {
  const barHeight = Math.max(thickness, PROGRESS_LINEAR_MIN_H);

  return (
    <div style={{ width: "100%", maxWidth: PROGRESS_LINEAR_MAX_W }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: PROGRESS_LABEL_MB,
      }}>
        <span style={{ fontSize: PROGRESS_LINEAR_NUM, fontWeight: 800, color: textColor, fontVariantNumeric: "tabular-nums" }}>
          {displayNum}
          <span style={{ fontSize: PROGRESS_LINEAR_SUFFIX }}>{suffix}</span>
        </span>
      </div>
      {/* Track */}
      <div style={{
        width: "100%", height: barHeight, borderRadius: barHeight / 2,
        backgroundColor: trackColor, overflow: "hidden",
      }}>
        {/* Fill */}
        <div style={{
          width: `${ratio * 100}%`, height: "100%", borderRadius: barHeight / 2,
          backgroundColor: color,
        }} />
      </div>
    </div>
  );
};
