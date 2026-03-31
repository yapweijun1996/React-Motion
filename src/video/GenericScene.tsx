import { AbsoluteFill } from "remotion";
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
import { NoiseBackground } from "./NoiseBackground";
import type { VideoScene, SceneElement } from "../types";

/** Detect if a hex color is dark (luminance < 0.4). */
function isDarkBg(hex: string | undefined): boolean {
  if (!hex) return false;
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  // Relative luminance (sRGB)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.4;
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
  const dark = isDarkBg(scene.bgColor);

  const flexProps: React.CSSProperties =
    layout === "center"
      ? { justifyContent: "center", alignItems: "center" }
      : layout === "row"
        ? { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 40 }
        : { flexDirection: "column", justifyContent: "center", alignItems: "stretch" };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.bgColor ?? "#ffffff",
        padding: scene.padding ?? "36px 48px",
        fontFamily: "Arial, sans-serif",
        ...flexProps,
        gap: layout === "row" ? 40 : 20,
      }}
    >
      <NoiseBackground color={primaryColor} />
      {scene.elements.map((el, i) => (
        <ElementRenderer
          key={i}
          el={el}
          index={i}
          primaryColor={primaryColor}
          dark={dark}
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
};

const CHART_TYPES = new Set(["bar-chart", "pie-chart", "line-chart", "sankey", "svg", "map"]);

const chartWrapStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

const ElementRenderer: React.FC<ElementRendererProps> = ({
  el,
  index,
  primaryColor,
  dark,
}) => {
  const inner = (() => {
    switch (el.type) {
      case "text":
        return <TextElement el={el} index={index} dark={dark} />;
      case "metric":
        return <MetricElement el={el} index={index} primaryColor={primaryColor} dark={dark} />;
      case "bar-chart":
        return <BarChartElement el={el} index={index} dark={dark} />;
      case "pie-chart":
        return <PieChartElement el={el} index={index} dark={dark} />;
      case "line-chart":
        return <LineChartElement el={el} index={index} dark={dark} />;
      case "sankey":
        return <SankeyElement el={el} index={index} dark={dark} />;
      case "list":
        return <ListElement el={el} index={index} primaryColor={primaryColor} dark={dark} />;
      case "divider":
        return <DividerElement el={el} index={index} primaryColor={primaryColor} />;
      case "callout":
        return <CalloutElement el={el} index={index} primaryColor={primaryColor} dark={dark} />;
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
      default:
        console.warn(`[GenericScene] Unknown element type: "${el.type}"`);
        return null;
    }
  })();

  if (CHART_TYPES.has(el.type)) {
    return <div style={chartWrapStyle}>{inner}</div>;
  }
  return inner;
};
