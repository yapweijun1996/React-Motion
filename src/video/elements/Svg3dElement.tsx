/**
 * Svg3dElement — pseudo-3D SVG renderer for premium-web spatial visuals.
 *
 * Delivers Apple/premium-web depth feel using:
 * - Layered <g> groups with deterministic Z-offset transforms
 * - Restrained wrapper perspective tilt
 * - Per-layer parallax drift
 * - Optional floating motion
 * - Shadow depth via SVG filter
 * - Reveal: fade / rise / draw
 *
 * Export-safe: all effects are inline SVG + CSS transforms on a single DOM node.
 */

import { useMemo, useRef, useLayoutEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring, interpolate } from "../animation";
import { useStagger, parseStagger } from "../useStagger";
import { sanitizeSvg } from "./svgSanitize";
import { DrawingSvg } from "./DrawingSvg";
import type { SceneElement } from "../../types";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  depthPreset: "subtle" as const,
  cameraTilt: "left" as const,
  parallax: "subtle" as const,
  float: false,
  shadow: "soft" as const,
  reveal: "fade" as const,
};

// ---------------------------------------------------------------------------
// Depth preset tables — per-layer translateZ (px) for pseudo-3D feel
// Index 0 = deepest (back), higher = closer to viewer
// ---------------------------------------------------------------------------

type DepthPreset = "subtle" | "card-stack" | "exploded";

const DEPTH_TABLE: Record<DepthPreset, number[]> = {
  subtle:     [0,  8,  16, 24],
  "card-stack": [0, 15, 30, 48],
  exploded:   [0, 25, 55, 90],
};

function getLayerDepth(preset: DepthPreset, layerIndex: number, totalLayers: number): number {
  const table = DEPTH_TABLE[preset];
  // Map layer index to table position proportionally
  const pos = totalLayers <= 1 ? 0 : (layerIndex / (totalLayers - 1)) * (table.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, table.length - 1);
  const t = pos - lo;
  return table[lo] * (1 - t) + table[hi] * t;
}

// ---------------------------------------------------------------------------
// Camera tilt — wrapper rotation for spatial perspective
// ---------------------------------------------------------------------------

type CameraTilt = "left" | "right" | "top";

const TILT_MAP: Record<CameraTilt, { rotateY: number; rotateX: number }> = {
  left:  { rotateY: -4, rotateX: 2 },
  right: { rotateY: 4,  rotateX: 2 },
  top:   { rotateY: 0,  rotateX: 6 },
};

// ---------------------------------------------------------------------------
// Parallax drift — per-layer horizontal offset driven by frame
// ---------------------------------------------------------------------------

type ParallaxLevel = "none" | "subtle" | "medium";

const PARALLAX_AMP: Record<ParallaxLevel, number> = {
  none: 0,
  subtle: 3,
  medium: 7,
};

// ---------------------------------------------------------------------------
// Shadow presets — CSS filter drop-shadow
// ---------------------------------------------------------------------------

type ShadowLevel = "soft" | "medium" | "strong";

const SHADOW_MAP: Record<ShadowLevel, string> = {
  soft:   "drop-shadow(0 4px 12px rgba(0,0,0,0.10))",
  medium: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))",
  strong: "drop-shadow(0 12px 36px rgba(0,0,0,0.28))",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = { el: SceneElement; index: number; dark?: boolean };

export const Svg3dElement: React.FC<Props> = ({ el, index }) => {
  const markup   = (el.markup as string) ?? "";
  const layers   = (el.layers as string[] | undefined) ?? [];
  const depthPreset = ((el.depthPreset as string) ?? DEFAULTS.depthPreset) as DepthPreset;
  const cameraTilt  = ((el.cameraTilt as string) ?? DEFAULTS.cameraTilt) as CameraTilt;
  const parallax    = ((el.parallax as string) ?? DEFAULTS.parallax) as ParallaxLevel;
  const doFloat     = (el.float as boolean) ?? DEFAULTS.float;
  const shadow      = ((el.shadow as string) ?? DEFAULTS.shadow) as ShadowLevel;
  const reveal      = ((el.reveal as string) ?? DEFAULTS.reveal) as "fade" | "rise" | "draw";

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { progress, delay } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "svg-3d",
  });

  // Sanitize SVG
  const isDraw = reveal === "draw";
  const sanitizedHtml = useMemo(() => sanitizeSvg(markup, isDraw), [markup, isDraw]);

  // Resolve matched layers from the sanitized SVG
  const layerIds = useMemo(() => {
    if (!sanitizedHtml || layers.length === 0) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedHtml, "image/svg+xml");
      const svg = doc.documentElement;
      const matched: string[] = [];
      for (const id of layers) {
        const found = svg.querySelector(`#${CSS.escape(id)}`) ??
                      svg.querySelector(`[data-layer="${id}"]`);
        if (found) matched.push(id);
      }
      return matched;
    } catch {
      return [];
    }
  }, [sanitizedHtml, layers]);

  // --- Draw reveal delegates to DrawingSvg ---
  if (isDraw && sanitizedHtml) {
    return (
      <div style={wrapperStyle(cameraTilt, shadow, progress, frame, fps, doFloat)}>
        <DrawingSvg
          html={sanitizedHtml}
          delay={delay}
          drawSpeed={el.drawSpeed as number | undefined}
        />
      </div>
    );
  }

  // --- Apply per-layer transforms via DOM refs ---
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || layerIds.length === 0) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    const elapsed = Math.max(0, frame - delay);
    const totalLayers = layerIds.length;
    const parallaxAmp = PARALLAX_AMP[parallax];

    layerIds.forEach((id, i) => {
      const el = svg.querySelector(`#${CSS.escape(id)}`) ??
                 svg.querySelector(`[data-layer="${id}"]`);
      if (!el) return;

      const depth = getLayerDepth(depthPreset, i, totalLayers);

      // Parallax drift: sinusoidal horizontal shift proportional to depth
      const drift = parallaxAmp > 0
        ? Math.sin(elapsed / fps * 0.6) * parallaxAmp * (depth / 30)
        : 0;

      // Layer reveal stagger
      const layerProgress = spring({
        frame: elapsed - i * 4,
        fps,
        config: { damping: 16, mass: 0.7 },
      });

      const yOffset = interpolate(layerProgress, [0, 1], [depth * 0.5, 0]);

      (el as SVGElement).style.transform =
        `translate(${drift.toFixed(1)}px, ${(-depth + yOffset).toFixed(1)}px)`;
      (el as SVGElement).style.opacity = `${layerProgress}`;
    });
  }, [frame, delay, fps, layerIds, depthPreset, parallax]);

  if (!sanitizedHtml) return null;

  // Entrance
  const revealOpacity = reveal === "rise"
    ? interpolate(progress, [0, 1], [0, 1])
    : progress;
  const revealY = reveal === "rise"
    ? interpolate(progress, [0, 1], [30, 0])
    : 0;

  return (
    <div style={wrapperStyle(cameraTilt, shadow, progress, frame, fps, doFloat)}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          maxHeight: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: revealOpacity,
          transform: revealY !== 0 ? `translateY(${revealY}px)` : "none",
        }}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Wrapper style — perspective tilt + float + shadow
// ---------------------------------------------------------------------------

function wrapperStyle(
  tilt: CameraTilt,
  shadow: ShadowLevel,
  progress: number,
  frame: number,
  fps: number,
  doFloat: boolean,
): React.CSSProperties {
  const t = TILT_MAP[tilt];
  const tiltProgress = Math.min(progress * 1.2, 1); // tilt settles slightly before full entrance

  const rotY = interpolate(tiltProgress, [0, 1], [0, t.rotateY]);
  const rotX = interpolate(tiltProgress, [0, 1], [0, t.rotateX]);

  // Subtle floating motion (sinusoidal, ~3px amplitude)
  const floatY = doFloat ? Math.sin(frame / fps * 1.2) * 3 : 0;
  const floatX = doFloat ? Math.cos(frame / fps * 0.8) * 1.5 : 0;

  return {
    width: "100%",
    maxHeight: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    perspective: "900px",
    filter: SHADOW_MAP[shadow],
    transform: [
      `rotateY(${rotY.toFixed(2)}deg)`,
      `rotateX(${rotX.toFixed(2)}deg)`,
      floatY !== 0 ? `translate(${floatX.toFixed(1)}px, ${floatY.toFixed(1)}px)` : "",
    ].filter(Boolean).join(" "),
    transformStyle: "preserve-3d" as const,
    willChange: "transform",
  };
}
