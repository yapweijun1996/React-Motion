import { useMemo } from "react";
import rough from "roughjs";
import { useStagger, parseStagger } from "../useStagger";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { SceneElement } from "../../types";

// --- Shape registry ---

type AnnotationShape = "circle" | "underline" | "arrow" | "box" | "cross" | "highlight" | "bracket";

export const VALID_ANNOTATION_SHAPES: AnnotationShape[] = [
  "circle", "underline", "arrow", "box", "cross", "highlight", "bracket",
];

// viewBox [width, height] per shape
const VIEWBOX: Record<AnnotationShape, [number, number]> = {
  circle: [120, 120],
  underline: [200, 40],
  arrow: [200, 60],
  box: [160, 120],
  cross: [100, 100],
  highlight: [200, 60],
  bracket: [50, 120],
};

const generator = rough.generator();

type RoughOp = { op: string; data: number[] };

function opsToPathD(ops: RoughOp[]): string {
  return ops
    .map((op) => {
      const d = op.data;
      switch (op.op) {
        case "move": return `M${d[0]} ${d[1]}`;
        case "lineTo": return `L${d[0]} ${d[1]}`;
        case "bcurveTo": return `C${d[0]} ${d[1]} ${d[2]} ${d[3]} ${d[4]} ${d[5]}`;
        default: return "";
      }
    })
    .join(" ");
}

type PathInfo = { d: string; stroke: string; fill: string; isFill: boolean };

function generatePaths(
  shape: AnnotationShape,
  color: string,
  strokeWidth: number,
  roughness: number,
  fillColor?: string,
): PathInfo[] {
  const opts = { roughness, strokeWidth, stroke: color };
  const paths: PathInfo[] = [];

  const extract = (drawable: { sets: { type: string; ops: RoughOp[] }[] }, stroke: string, fill: string) => {
    for (const set of drawable.sets) {
      paths.push({
        d: opsToPathD(set.ops),
        stroke: set.type === "fillSketch" ? fill : stroke,
        fill: set.type === "fillPath" ? fill : "none",
        isFill: set.type !== "path",
      });
    }
  };

  switch (shape) {
    case "circle":
      extract(generator.circle(60, 60, 100, opts), color, "none");
      break;
    case "underline":
      extract(generator.line(10, 25, 190, 25, opts), color, "none");
      break;
    case "arrow":
      extract(generator.line(10, 30, 170, 30, opts), color, "none");
      extract(generator.linearPath([[170, 30], [150, 16]], opts), color, "none");
      extract(generator.linearPath([[170, 30], [150, 44]], opts), color, "none");
      break;
    case "box":
      extract(
        generator.rectangle(10, 10, 140, 100, { ...opts, fill: fillColor ?? `${color}20`, fillStyle: "solid" }),
        color,
        fillColor ?? `${color}20`,
      );
      break;
    case "cross":
      extract(generator.line(15, 15, 85, 85, opts), color, "none");
      extract(generator.line(85, 15, 15, 85, opts), color, "none");
      break;
    case "highlight":
      extract(
        generator.rectangle(5, 10, 190, 40, { ...opts, fill: fillColor ?? `${color}30`, fillStyle: "solid" }),
        color,
        fillColor ?? `${color}30`,
      );
      break;
    case "bracket":
      extract(
        generator.path("M 35 10 Q 10 10, 10 30 Q 10 55, 25 60 Q 10 65, 10 90 Q 10 110, 35 110", opts),
        color,
        "none",
      );
      break;
  }

  return paths;
}

// --- Component ---

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const AnnotationElement: React.FC<Props> = ({ el, index, primaryColor }) => {
  const shape = (VALID_ANNOTATION_SHAPES.includes(el.shape as AnnotationShape)
    ? el.shape : "circle") as AnnotationShape;
  const color = (el.color as string) ?? primaryColor ?? "#ef4444";
  const fillColor = el.fillColor as string | undefined;
  const strokeWidth = (el.strokeWidth as number) ?? 2.5;
  const roughness = Math.max(0.5, Math.min(3, (el.roughness as number) ?? 1.5));
  const size = (el.size as number) ?? 120;
  const label = el.label as string | undefined;
  const labelColor = (el.labelColor as string) ?? "#374151";
  const labelSize = (el.labelSize as number) ?? 18;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { delay } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "annotation",
  });

  // Spring for stroke drawing effect (0→1)
  const drawProgress = spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.8 } });

  const [vbW, vbH] = VIEWBOX[shape];

  // Generate rough paths once (deterministic per shape+params)
  const paths = useMemo(
    () => generatePaths(shape, color, strokeWidth, roughness, fillColor),
    [shape, color, strokeWidth, roughness, fillColor],
  );

  // Scale SVG to fit desired size while keeping aspect ratio
  const aspect = vbW / vbH;
  const svgW = aspect >= 1 ? size : size * aspect;
  const svgH = aspect >= 1 ? size / aspect : size;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: Math.min(drawProgress * 3, 1) }}>
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ overflow: "visible" }}
      >
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.stroke}
            fill={p.fill}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Drawing animation: stroke reveals progressively
            {...(!p.isFill ? {
              pathLength: 1,
              strokeDasharray: 1,
              strokeDashoffset: 1 - drawProgress,
            } : {
              opacity: drawProgress,
            })}
          />
        ))}
      </svg>
      {label && (
        <div style={{ fontSize: labelSize, color: labelColor, fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>
          {label}
        </div>
      )}
    </div>
  );
};
