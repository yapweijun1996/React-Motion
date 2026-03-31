import { AbsoluteFill, Sequence } from "remotion";
import { TitleScene } from "./TitleScene";
import { ChartScene, type BarItem } from "./ChartScene";
import { HighlightScene } from "./HighlightScene";
import { SummaryScene } from "./SummaryScene";
import type { VideoScript, VideoScene } from "../types";

type ReportCompositionProps = {
  script: VideoScript;
};

export const ReportComposition: React.FC<ReportCompositionProps> = ({
  script,
}) => {
  return (
    <AbsoluteFill>
      {script.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
        >
          <SceneRenderer scene={scene} script={script} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

type SceneRendererProps = {
  scene: VideoScene;
  script: VideoScript;
};

const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, script }) => {
  switch (scene.type) {
    case "title":
      return (
        <TitleScene
          title={(scene.props.title as string) ?? script.title}
          subtitle={scene.props.subtitle as string | undefined}
          primaryColor={script.theme?.primaryColor}
        />
      );
    case "chart":
      return (
        <ChartScene
          title={(scene.props.title as string) ?? ""}
          bars={(scene.props.bars as BarItem[]) ?? []}
          primaryColor={script.theme?.primaryColor}
        />
      );
    case "highlight":
      return (
        <HighlightScene
          title={(scene.props.title as string) ?? ""}
          points={(scene.props.points as string[]) ?? []}
          icon={scene.props.icon as "trend-up" | "trend-down" | "warning" | "info" | undefined}
          primaryColor={script.theme?.primaryColor}
        />
      );
    case "summary":
      return (
        <SummaryScene
          title={(scene.props.title as string) ?? "Summary"}
          points={(scene.props.points as string[]) ?? []}
          recommendation={scene.props.recommendation as string | undefined}
          primaryColor={script.theme?.primaryColor}
        />
      );
    default:
      return null;
  }
};
