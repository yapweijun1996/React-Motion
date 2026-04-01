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

type Props = { el: SceneElement; index: number; dark?: boolean };

type Variant = "circular" | "semicircle" | "linear";

const SIZE = 320;        // SVG viewport for circular/semicircle
const STROKE_DEFAULT = 14;

export const ProgressElement: React.FC<Props> = ({ el, index, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const value = Math.max(0, (el.value as number) ?? 0);
  const max = Math.max(1, (el.max as number) ?? 100);
  const label = (el.label as string) ?? "";
  const color = (el.color as string) ?? "#3b82f6";
  const variant: Variant = (["circular", "semicircle", "linear"].includes(el.variant as string)
    ? el.variant : "circular") as Variant;
  const suffix = (el.suffix as string) ?? "%";
  const thickness = Math.max(4, Math.min(32, (el.thickness as number) ?? STROKE_DEFAULT));

  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "zoom");

  const { delay, springConfig, progress: containerProgress } = useStagger({
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
    config: { damping: 18, mass: 0.8 },
  });

  const ratio = Math.min(value / max, 1);
  const animatedRatio = ratio * fillProgress;
  const animatedValue = value * fillProgress;

  // Format display number
  const displayNum = value === Math.floor(value)
    ? Math.round(animatedValue).toLocaleString()
    : animatedValue.toFixed(1);

  const textColor = dark ? "#e2e8f0" : "#1e293b";
  const trackColor = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

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
        <div style={{ fontSize: 56, color: dark ? "#cbd5e1" : "#64748b", fontWeight: 500, textAlign: "center" }}>
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
        <span style={{ fontSize: 96, fontWeight: 800, color: textColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {displayNum}
          <span style={{ fontSize: 48 }}>{suffix}</span>
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
    <div style={{ position: "relative", width: SIZE, height: SIZE / 2 + 32 }}>
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
        <span style={{ fontSize: 80, fontWeight: 800, color: textColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {displayNum}
          <span style={{ fontSize: 42 }}>{suffix}</span>
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
  const barHeight = Math.max(thickness, 20);

  return (
    <div style={{ width: "100%", maxWidth: 800 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 80, fontWeight: 800, color: textColor, fontVariantNumeric: "tabular-nums" }}>
          {displayNum}
          <span style={{ fontSize: 42 }}>{suffix}</span>
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
