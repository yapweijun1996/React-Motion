import { AbsoluteFill } from "remotion";
import { TextElement } from "./elements/TextElement";
import { MetricElement } from "./elements/MetricElement";
import { BarChartElement } from "./elements/BarChartElement";
import { ListElement } from "./elements/ListElement";
import { DividerElement } from "./elements/DividerElement";
import { CalloutElement } from "./elements/CalloutElement";
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
        : { flexDirection: "column", justifyContent: "center" };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.bgColor ?? "#ffffff",
        padding: scene.padding ?? "48px 64px",
        fontFamily: "Arial, sans-serif",
        ...flexProps,
        gap: layout === "row" ? 40 : 16,
      }}
    >
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

const ElementRenderer: React.FC<ElementRendererProps> = ({
  el,
  index,
  primaryColor,
}) => {
  switch (el.type) {
    case "text":
      return <TextElement el={el} index={index} />;
    case "metric":
      return <MetricElement el={el} index={index} primaryColor={primaryColor} />;
    case "bar-chart":
      return <BarChartElement el={el} index={index} />;
    case "list":
      return <ListElement el={el} index={index} primaryColor={primaryColor} />;
    case "divider":
      return <DividerElement el={el} index={index} primaryColor={primaryColor} />;
    case "callout":
      return <CalloutElement el={el} index={index} primaryColor={primaryColor} />;
    default:
      return null;
  }
};
