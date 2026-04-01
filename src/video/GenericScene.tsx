import { AbsoluteFill } from "./AbsoluteFill";
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
import { getLayoutTokens, type LayoutTokens } from "./sceneLayout";
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
  if (scene.bgGradient) {
    return isDarkBg(extractFirstColor(scene.bgGradient));
  }
  return isDarkBg(scene.bgColor);
}

type GenericSceneProps = {
  scene: VideoScene;
  primaryColor?: string;
};

export const GenericScene: React.FC<GenericSceneProps> = ({
  scene,
  primaryColor,
}) => {
  const layout = scene.layout ?? "column";
  const dark = isSceneDark(scene);
  const canvasEffects = loadSettings().canvasEffects;
  const tokens = getLayoutTokens(scene.elements);

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
        padding: scene.padding ?? tokens.padding,
        fontFamily: "Arial, sans-serif",
        ...flexProps,
        gap: layout === "row" ? rowGap : tokens.gap,
        minHeight: 0,
      }}
    >
      {canvasEffects && <ParticleBg color={primaryColor} bgColor={scene.bgColor} />}
      {scene.elements.map((el, i) => (
        <ElementRenderer
          key={i}
          el={el}
          index={i}
          primaryColor={primaryColor}
          dark={dark}
          tokens={tokens}
        />
      ))}
    </AbsoluteFill>
  );
};

type ElementRendererProps = {
  el: SceneElement;
  index: number;
  primaryColor?: string;
  dark?: boolean;
  tokens: LayoutTokens;
};

const CHART_TYPES = new Set(["bar-chart", "pie-chart", "line-chart", "sankey", "svg", "map"]);

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
}) => {
  const fs = tokens.fontScale;
  const inner = (() => {
    switch (el.type) {
      case "text":
        return <TextElement el={el} index={index} dark={dark} fontScale={fs} />;
      case "metric":
        return <MetricElement el={el} index={index} primaryColor={primaryColor} dark={dark} fontScale={fs} />;
      case "bar-chart":
        return <BarChartElement el={el} index={index} dark={dark} />;
      case "pie-chart":
        return <PieChartElement el={el} index={index} dark={dark} fontScale={fs} />;
      case "line-chart":
        return <LineChartElement el={el} index={index} dark={dark} />;
      case "sankey":
        return <SankeyElement el={el} index={index} dark={dark} />;
      case "list":
        return <ListElement el={el} index={index} primaryColor={primaryColor} dark={dark} fontScale={fs} />;
      case "divider":
        return <DividerElement el={el} index={index} primaryColor={primaryColor} />;
      case "callout":
        return <CalloutElement el={el} index={index} primaryColor={primaryColor} dark={dark} fontScale={fs} />;
      case "kawaii":
        return <KawaiiElement el={el} index={index} primaryColor={primaryColor} dark={dark} />;
      case "lottie":
        return <LottieElement el={el} index={index} />;
      case "icon":
        return <IconElement el={el} index={index} primaryColor={primaryColor} dark={dark} />;
      case "annotation":
        return <AnnotationElement el={el} index={index} primaryColor={primaryColor} dark={dark} />;
      case "svg":
        return <SvgElement el={el} index={index} />;
      case "map":
        return <MapElement el={el} index={index} />;
      case "progress":
        return <ProgressElement el={el} index={index} dark={dark} />;
      case "timeline":
        return <TimelineElement el={el} index={index} dark={dark} fontScale={fs} />;
      case "comparison":
        return <ComparisonElement el={el} index={index} dark={dark} fontScale={fs} />;
      default:
        console.warn(`[GenericScene] Unknown element type: "${el.type}"`);
        return null;
    }
  })();

  if (CHART_TYPES.has(el.type)) {
    if (!inner) return null;
    return <div style={chartWrapStyle}>{inner}</div>;
  }
  return inner;
};
