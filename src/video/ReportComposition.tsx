import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { GenericScene } from "./GenericScene";
import type { VideoScript } from "../types";

const CROSSFADE = 15;

type ReportCompositionProps = {
  script: VideoScript;
};

export const ReportComposition: React.FC<ReportCompositionProps> = ({
  script,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {script.scenes.map((scene, i) => {
        const next = script.scenes[i + 1];
        const fadeOutStart = next
          ? next.startFrame - CROSSFADE
          : scene.startFrame + scene.durationInFrames;
        const fadeOutEnd = next
          ? next.startFrame
          : scene.startFrame + scene.durationInFrames;

        const fadeIn = interpolate(
          frame,
          [scene.startFrame, scene.startFrame + CROSSFADE],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        // Last scene: no fade out (fadeOutStart === fadeOutEnd), keep opacity 1
        const fadeOut = fadeOutStart < fadeOutEnd
          ? interpolate(
              frame,
              [fadeOutStart, fadeOutEnd],
              [1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          : 1;

        return (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
              <GenericScene
                scene={scene}
                primaryColor={script.theme?.primaryColor}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 4,
          backgroundColor: "rgba(0,0,0,0.1)",
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
