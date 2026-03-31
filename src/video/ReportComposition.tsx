import { AbsoluteFill, Audio, useCurrentFrame } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { GenericScene } from "./GenericScene";
import type { VideoScript, VideoScene } from "../types";

const TRANSITION_FRAMES = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPresentation(scene: VideoScene): any {
  const type = scene.transition;
  switch (type) {
    case "slide": return slide();
    case "wipe": return wipe();
    case "clock-wipe": return clockWipe({ width: 1920, height: 1080 });
    default: return fade();
  }
}

type ReportCompositionProps = {
  script: VideoScript;
};

export const ReportComposition: React.FC<ReportCompositionProps> = ({
  script,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <TransitionSeries>
        {script.scenes.map((scene, i) => {
          const isLast = i === script.scenes.length - 1;

          return [
            <TransitionSeries.Sequence
              key={`scene-${scene.id}`}
              durationInFrames={scene.durationInFrames}
            >
              <GenericScene
                scene={scene}
                primaryColor={script.theme?.primaryColor}
              />
              {scene.ttsAudioUrl && (
                <Audio src={scene.ttsAudioUrl} volume={1} />
              )}
            </TransitionSeries.Sequence>,

            !isLast && (
              <TransitionSeries.Transition
                key={`trans-${scene.id}`}
                presentation={getPresentation(script.scenes[i + 1])}
                timing={springTiming({
                  config: { damping: 120 },
                  durationInFrames: TRANSITION_FRAMES,
                  durationRestThreshold: 0.001,
                })}
              />
            ),
          ];
        })}
      </TransitionSeries>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 4,
          backgroundColor: "rgba(0,0,0,0.1)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: `${(frame / script.durationInFrames) * 100}%`,
            height: "100%",
            backgroundColor: script.theme?.primaryColor ?? "#2563eb",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
