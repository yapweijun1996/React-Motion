import { useMemo } from "react";
import { AbsoluteFill } from "./AbsoluteFill";
import { AudioTrack } from "./AudioTrack";
import { useCurrentFrame } from "./VideoContext";
import { FrameProvider } from "./VideoContext";
import { SceneRenderer } from "./SceneRenderer";
import { GenericScene } from "./GenericScene";
import type { VideoScript } from "../types";

/** BGM volume when narration is playing vs silent */
const BGM_VOLUME_FULL = 0.35;
const BGM_VOLUME_DUCKED = 0.1;

type ReportCompositionProps = {
  script: VideoScript;
};

export const ReportComposition: React.FC<ReportCompositionProps> = ({
  script,
}) => {
  const frame = useCurrentFrame();

  // Auto-ducking: lower BGM volume when current scene has TTS narration
  const bgmVolume = useMemo(() => {
    if (!script.bgMusicUrl) return 0;
    const currentScene = script.scenes.find((s) => {
      const end = s.startFrame + s.durationInFrames;
      return frame >= s.startFrame && frame < end;
    });
    return currentScene?.ttsAudioUrl ? BGM_VOLUME_DUCKED : BGM_VOLUME_FULL;
  }, [frame, script.bgMusicUrl, script.scenes]);

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

      {/* Background music — global track with auto-ducking */}
      {script.bgMusicUrl && (
        <AudioTrack src={script.bgMusicUrl} volume={bgmVolume} />
      )}

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
