import { AbsoluteFill } from "./AbsoluteFill";
import { AudioTrack } from "./AudioTrack";
import { useCurrentFrame } from "./VideoContext";
import { FrameProvider } from "./VideoContext";
import { SceneRenderer } from "./SceneRenderer";
import { GenericScene } from "./GenericScene";
import type { VideoScript } from "../types";

type ReportCompositionProps = {
  script: VideoScript;
};

export const ReportComposition: React.FC<ReportCompositionProps> = ({
  script,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <SceneRenderer
        frame={frame}
        scenes={script.scenes}
        renderScene={(scene, localFrame) => (
          <FrameProvider frame={localFrame}>
            <GenericScene
              scene={scene}
              primaryColor={script.theme?.primaryColor}
            />
            {scene.ttsAudioUrl && <AudioTrack src={scene.ttsAudioUrl} />}
          </FrameProvider>
        )}
      />

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
