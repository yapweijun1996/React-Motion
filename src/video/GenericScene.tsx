import { AbsoluteFill } from "./AbsoluteFill";
import { useCurrentFrame, useVideoConfig } from "./VideoContext";
import { TextElement } from "./elements/TextElement";
import { MetricElement } from "./elements/MetricElement";
import { BarChartElement } from "./elements/BarChartElement";
import { ListElement } from "./elements/ListElement";
import { DividerElement } from "./elements/DividerElement";
import { CalloutElement } from "./elements/CalloutElement";
import { PieChartElement } from "./elements/PieChartElement";
import { LineChartElement } from "./elements/LineChartElement";
import { SankeyElement } from "./elements/SankeyElement";
import { KawaiiElement } from "./elements/KawaiiElement";
import { LottieElement } from "./elements/LottieElement";
import { IconElement } from "./elements/IconElement";
import { AnnotationElement } from "./elements/AnnotationElement";
import { SvgElement } from "./elements/SvgElement";
import { MapElement } from "./elements/MapElement";
import { ProgressElement } from "./elements/ProgressElement";
import { TimelineElement } from "./elements/TimelineElement";
import { ComparisonElement } from "./elements/ComparisonElement";
import { ParticleBg } from "./ParticleBg";
import { ErrorBoundary } from "./ErrorBoundary";
import { getLayoutTokens, type LayoutTokens } from "./sceneLayout";
import { getSceneColors, type SceneColors } from "./sceneColors";
import { loadSettings } from "../services/settingsStore";
import type { VideoScene, SceneElement } from "../types";

/**
 * Parse any CSS color string to [r, g, b] (0-255).
 * Handles: #hex (3/4/6/8 digit), rgb(), rgba().
 */
function parseColor(color: string): [number, number, number] | null {
  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const hexMatch = color.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let c = hexMatch[1];
    if (c.length === 3 || c.length === 4) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; // expand shorthand
    }
    return [
      parseInt(c.slice(0, 2), 16),
      parseInt(c.slice(2, 4), 16),
      parseInt(c.slice(4, 6), 16),
    ];
  }
  // rgb()/rgba()
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  return null;
}

/** Detect if a CSS color is dark (luminance < 0.4). */
export function isDarkBg(color: string | undefined): boolean {
  if (!color) return false;
  const rgb = parseColor(color.trim());
  if (!rgb) return false;
  const lum = 0.2126 * (rgb[0] / 255) + 0.7152 * (rgb[1] / 255) + 0.0722 * (rgb[2] / 255);
  return lum < 0.4;
}

/** Extract the first color from a CSS gradient string. */
function extractFirstColor(gradient: string): string | undefined {
  // Try hex first
  const hexMatch = gradient.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  // Try rgb()/rgba()
  const rgbMatch = gradient.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/);
  if (rgbMatch) return rgbMatch[0] + ")";
  return undefined;
}

/** Determine if scene background is dark — works with bgColor or bgGradient. */
function isSceneDark(scene: { bgColor?: string; bgGradient?: string }): boolean {
  let result = false;

  if (scene.bgGradient) {
    const extracted = extractFirstColor(scene.bgGradient);
    result = isDarkBg(extracted);
    // Gradient set but color extraction failed → try bgColor as fallback
    if (!extracted && scene.bgColor) result = isDarkBg(scene.bgColor);
  } else if (scene.bgColor) {
    result = isDarkBg(scene.bgColor);
  }
  // else: no bgColor, no bgGradient → default white (#fff) → dark=false

  // Only log on first render (avoid 60fps spam)
  const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  if (w && !w.__sceneDarkLogged) {
    w.__sceneDarkLogged = true;
    setTimeout(() => { if (w) w.__sceneDarkLogged = false; }, 2000);
    console.warn(`[Scene] dark=${result} | bg=${scene.bgColor ?? "NONE"} | grad=${scene.bgGradient?.slice(0, 80) ?? "NONE"}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Ken Burns — subtle camera motion for cinematic feel
// ---------------------------------------------------------------------------

const KB_PRESETS = [
  { sf: 1.00, st: 1.03, xf: 0, xt: -8, yf: 0, yt: -5 },  // zoom in + drift left-up
  { sf: 1.03, st: 1.00, xf: -5, xt: 3, yf: -3, yt: 2 },   // zoom out + drift right-down
  { sf: 1.00, st: 1.02, xf: 0, xt: 6, yf: 0, yt: -4 },    // zoom in + drift right-up
  { sf: 1.02, st: 1.00, xf: 4, xt: -4, yf: 2, yt: -2 },   // zoom out + drift left
  { sf: 1.00, st: 1.03, xf: 0, xt: 0, yf: 0, yt: -6 },    // pure zoom in + drift up
  { sf: 1.02, st: 1.00, xf: 0, xt: 0, yf: -4, yt: 4 },    // zoom out + drift down
];

/** Simple hash from scene id → stable preset index */
function sceneHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Smooth ease-in-out cubic */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type GenericSceneProps = {
  scene: VideoScene;
  primaryColor?: string;
};

export const GenericScene: React.FC<GenericSceneProps> = ({
  scene,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const layout = scene.layout ?? "column";
  const dark = isSceneDark(scene);
  const colors = getSceneColors(dark);
  const canvasEffects = loadSettings().canvasEffects;
  const tokens = getLayoutTokens(scene.elements);

  // Ken Burns — subtle camera motion
  const kb = KB_PRESETS[sceneHash(scene.id) % KB_PRESETS.length];
  const t = easeInOut(Math.min(frame / Math.max(durationInFrames - 1, 1), 1));
  const kbScale = kb.sf + (kb.st - kb.sf) * t;
  const kbX = kb.xf + (kb.xt - kb.xf) * t;
  const kbY = kb.yf + (kb.yt - kb.yf) * t;

  const rowGap = Math.round(40 * tokens.fontScale);
  const flexProps: React.CSSProperties =
    layout === "center"
      ? { justifyContent: "center", alignItems: "center" }
      : layout === "row"
        ? { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: rowGap }
        : { flexDirection: "column", justifyContent: "center", alignItems: "stretch" };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.bgGradient ? undefined : (scene.bgColor ?? "#ffffff"),
        background: scene.bgGradient ?? undefined,
      }}
    >
      <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        transform: `scale(${kbScale}) translate(${kbX}px, ${kbY}px)`,
        transformOrigin: "center center",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: scene.padding ?? tokens.padding,
        fontFamily: "Arial, sans-serif",
        ...flexProps,
        gap: layout === "row" ? rowGap : tokens.gap,
        minHeight: 0,
      }}
    >
      {canvasEffects && <ParticleBg color={primaryColor} bgColor={scene.bgColor} />}
      {scene.elements.map((el, i) => (
        <ErrorBoundary key={i} level="element" label={el.type}>
          <ElementRenderer
            el={el}
            index={i}
            primaryColor={primaryColor}
            dark={dark}
            tokens={tokens}
            colors={colors}
          />
        </ErrorBoundary>
      ))}
    </div>
    </AbsoluteFill>
  );
};

type ElementRendererProps = {
  el: SceneElement;
  index: number;
  primaryColor?: string;
  dark?: boolean;
  tokens: LayoutTokens;
  colors: SceneColors;
};

const CHART_TYPES = new Set(["bar-chart", "pie-chart", "line-chart", "sankey", "svg", "map"]);
const DECOR_TYPES = new Set(["annotation", "kawaii", "icon", "lottie"]);

const chartWrapStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flex: 1,
  minHeight: 0,
  overflow: "visible", // AbsoluteFill has overflow:hidden as safety net
};

const ElementRenderer: React.FC<ElementRendererProps> = ({
  el,
  index,
  primaryColor,
  dark,
  tokens,
  colors,
}) => {
  const fs = tokens.fontScale;
  const inner = (() => {
    switch (el.type) {
      case "text":
        return <TextElement el={el} index={index} dark={dark} fontScale={fs} />;
      case "metric":
        return <MetricElement el={el} index={index} primaryColor={primaryColor} dark={dark} colors={colors} fontScale={fs} />;
      case "bar-chart":
        return <BarChartElement el={el} index={index} dark={dark} colors={colors} />;
      case "pie-chart":
        return <PieChartElement el={el} index={index} dark={dark} colors={colors} fontScale={fs} />;
      case "line-chart":
        return <LineChartElement el={el} index={index} dark={dark} colors={colors} />;
      case "sankey":
        return <SankeyElement el={el} index={index} dark={dark} colors={colors} />;
      case "list":
        return <ListElement el={el} index={index} primaryColor={primaryColor} dark={dark} colors={colors} fontScale={fs} />;
      case "divider":
        return <DividerElement el={el} index={index} primaryColor={primaryColor} />;
      case "callout":
        return <CalloutElement el={el} index={index} primaryColor={primaryColor} dark={dark} colors={colors} fontScale={fs} />;
      case "kawaii":
        return <KawaiiElement el={el} index={index} primaryColor={primaryColor} dark={dark} colors={colors} />;
      case "lottie":
        return <LottieElement el={el} index={index} />;
      case "icon":
        return <IconElement el={el} index={index} primaryColor={primaryColor} dark={dark} colors={colors} />;
      case "annotation":
        return <AnnotationElement el={el} index={index} primaryColor={primaryColor} dark={dark} colors={colors} fontScale={fs} />;
      case "svg":
        return <SvgElement el={el} index={index} />;
      case "map":
        return <MapElement el={el} index={index} />;
      case "progress":
        return <ProgressElement el={el} index={index} dark={dark} colors={colors} />;
      case "timeline":
        return <TimelineElement el={el} index={index} dark={dark} colors={colors} fontScale={fs} />;
      case "comparison":
        return <ComparisonElement el={el} index={index} dark={dark} colors={colors} fontScale={fs} />;
      default:
        console.warn(`[GenericScene] Unknown element type: "${el.type}"`);
        return null;
    }
  })();

  if (CHART_TYPES.has(el.type)) {
    if (!inner) return null;
    return <div style={chartWrapStyle}>{inner}</div>;
  }
  // Decoration elements: shrink vertical footprint by absorbing scene gap
  if (DECOR_TYPES.has(el.type)) {
    if (!inner) return null;
    const halfGap = Math.round(tokens.gap / 2);
    return (
      <div style={{ marginTop: -halfGap, marginBottom: -halfGap, alignSelf: "center" }}>
        {inner}
      </div>
    );
  }
  return inner;
};
