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

type GenericSceneProps = {
  scene: VideoScene;
  primaryColor?: string;
};

export const GenericScene: React.FC<GenericSceneProps> = ({
  scene,
  primaryColor,
}) => {
  const layout = scene.layout ?? "column";

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
        />
      ))}
    </AbsoluteFill>
  );
};

type ElementRendererProps = {
  el: SceneElement;
  index: number;
  primaryColor?: string;
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
}) => {
  const inner = (() => {
    switch (el.type) {
      case "text":
        return <TextElement el={el} index={index} />;
      case "metric":
        return <MetricElement el={el} index={index} primaryColor={primaryColor} />;
      case "bar-chart":
        return <BarChartElement el={el} index={index} />;
      case "pie-chart":
        return <PieChartElement el={el} index={index} />;
      case "line-chart":
        return <LineChartElement el={el} index={index} />;
      case "sankey":
        return <SankeyElement el={el} index={index} />;
      case "list":
        return <ListElement el={el} index={index} primaryColor={primaryColor} />;
      case "divider":
        return <DividerElement el={el} index={index} primaryColor={primaryColor} />;
      case "callout":
        return <CalloutElement el={el} index={index} primaryColor={primaryColor} />;
      case "kawaii":
        return <KawaiiElement el={el} index={index} primaryColor={primaryColor} />;
      case "lottie":
        return <LottieElement el={el} index={index} />;
      case "icon":
        return <IconElement el={el} index={index} primaryColor={primaryColor} />;
      case "annotation":
        return <AnnotationElement el={el} index={index} primaryColor={primaryColor} />;
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
