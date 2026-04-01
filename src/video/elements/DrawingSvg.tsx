/**
 * DrawingSvg — Apple-style SVG path drawing animation.
 *
 * Drives stroke-dashoffset per-frame via DOM refs to create a sequential
 * path-drawing effect. Each path draws with spring physics, then fill
 * fades in after stroke completes.
 *
 * Extracted from SvgElement.tsx for modularity.
 */

import { useRef, useLayoutEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring, interpolate } from "../animation";

// SVG elements that support getTotalLength() for stroke drawing
const DRAWABLE_SELECTOR = "path, line, polyline, polygon, circle, ellipse, rect";

// Frames each path takes to draw (at 30fps ≈ 1s per path)
const DRAW_DURATION_FRAMES = 30;
// Stagger delay between paths (frames)
const PATH_STAGGER_FRAMES = 6;
// Frames for fill to fade in after stroke completes
const FILL_FADE_FRAMES = 12;

type DrawingSvgProps = {
  html: string;
  delay: number;
  drawSpeed?: number; // multiplier: 0.5 = slow, 1 = normal, 2 = fast
};

/**
 * Approximate total length for SVG elements that don't support getTotalLength().
 * Falls back to bounding box perimeter.
 */
function getApproxLength(el: SVGElement): number {
  if ("getTotalLength" in el && typeof (el as SVGGeometryElement).getTotalLength === "function") {
    try {
      return (el as SVGGeometryElement).getTotalLength();
    } catch {
      // Some elements throw if not rendered yet
    }
  }
  try {
    const bbox = (el as SVGGraphicsElement).getBBox();
    return (bbox.width + bbox.height) * 2;
  } catch {
    return 300;
  }
}

/** Extract fill value from inline style string */
function extractFillFromStyle(style: string): string {
  const match = style.match(/fill\s*:\s*([^;]+)/);
  return match ? match[1].trim() : "";
}

export const DrawingSvg: React.FC<DrawingSvgProps> = ({ html, delay, drawSpeed = 1 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cache path lengths (computed once after mount)
  const pathDataRef = useRef<{ el: SVGElement; length: number; originalFill: string }[]>([]);
  const initRef = useRef(false);

  // Scale draw duration by speed and fps
  const drawFrames = Math.round(DRAW_DURATION_FRAMES * (fps / 30) / Math.max(drawSpeed, 0.1));
  const staggerFrames = Math.round(PATH_STAGGER_FRAMES * (fps / 30));
  const fillFrames = Math.round(FILL_FADE_FRAMES * (fps / 30));

  // Initialize: collect drawable elements and cache their lengths
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || initRef.current) return;

    const elements = container.querySelectorAll(DRAWABLE_SELECTOR);
    const data: typeof pathDataRef.current = [];

    elements.forEach((el) => {
      const svgEl = el as SVGElement;
      const length = getApproxLength(svgEl);
      const style = svgEl.getAttribute("style") ?? "";
      const fillAttr = svgEl.getAttribute("fill") ?? "";
      const originalFill = fillAttr || extractFillFromStyle(style) || "";

      data.push({ el: svgEl, length, originalFill });

      // Initialize: hide fill, set stroke dash
      svgEl.style.strokeDasharray = `${length}`;
      svgEl.style.strokeDashoffset = `${length}`;
      if (!svgEl.getAttribute("stroke") || svgEl.getAttribute("stroke") === "none") {
        svgEl.setAttribute("stroke", originalFill || "currentColor");
        svgEl.setAttribute("data-stroke-added", "true");
      }
      svgEl.style.fill = "transparent";
      svgEl.style.fillOpacity = "0";
    });

    pathDataRef.current = data;
    initRef.current = true;
  }, [html]);

  // Per-frame update: drive stroke-dashoffset and fill opacity
  useLayoutEffect(() => {
    const paths = pathDataRef.current;
    if (paths.length === 0) return;

    const elapsed = Math.max(0, frame - delay);

    paths.forEach((p, i) => {
      const pathStart = i * staggerFrames;
      const pathElapsed = elapsed - pathStart;

      // Stroke drawing progress (spring-driven for natural feel)
      const strokeProgress = pathElapsed <= 0
        ? 0
        : spring({
            frame: pathElapsed,
            fps,
            config: { damping: 18, mass: 0.8, stiffness: 80 },
            durationInFrames: drawFrames,
          });

      const offset = p.length * (1 - strokeProgress);
      p.el.style.strokeDashoffset = `${offset}`;

      // Fill fade-in: starts after stroke is ~80% complete
      const fillStart = pathStart + drawFrames * 0.8;
      const fillElapsed = elapsed - fillStart;
      const fillProgress = fillElapsed <= 0
        ? 0
        : interpolate(
            Math.min(fillElapsed / fillFrames, 1),
            [0, 1],
            [0, 1],
          );

      p.el.style.fillOpacity = `${fillProgress}`;
      if (fillProgress > 0 && p.originalFill && p.originalFill !== "none") {
        p.el.style.fill = p.originalFill;
      }

      if (fillProgress >= 1 && p.el.getAttribute("data-stroke-added") === "true") {
        p.el.setAttribute("stroke", "none");
      }
    });
  }, [frame, delay, fps, drawFrames, staggerFrames, fillFrames]);

  // Container fade-in
  const containerOpacity = interpolate(
    Math.max(0, frame - delay),
    [0, 8],
    [0, 1],
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        minHeight: 0,
        opacity: containerOpacity,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
