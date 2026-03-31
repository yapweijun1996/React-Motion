import { Player, type PlayerRef } from "@remotion/player";
import { ReportComposition } from "../video/ReportComposition";
import type { VideoScript } from "../types";

// --- Export overlay (modal dialog during export) ---

type ExportOverlayProps = {
  message: string;
};

export function ExportOverlay({ message }: ExportOverlayProps) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="export-modal-title" className="rm-export-overlay">
      <div className="rm-export-modal">
        <h3 id="export-modal-title" className="rm-export-title">Export in progress</h3>
        <p className="rm-export-desc">
          Keep this tab open and active until the MP4 export finishes.
          Switching tabs or minimizing the browser may interrupt capture.
        </p>
        <div className="rm-export-status">{message}</div>
      </div>
    </div>
  );
}

// --- Export stage (full-screen capture surface) ---

type ExportStageProps = {
  script: VideoScript;
  playerRef: React.RefObject<PlayerRef>;
  surfaceRef: React.RefObject<HTMLDivElement>;
};

export function ExportStage({ script, playerRef, surfaceRef }: ExportStageProps) {
  const scale = Math.min(window.innerWidth / script.width, window.innerHeight / script.height, 1);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        zIndex: 9999,
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
        <div
          ref={surfaceRef}
          style={{
            width: script.width,
            height: script.height,
            overflow: "hidden",
            backgroundColor: "#000",
          }}
        >
          <Player
            ref={playerRef}
            component={ReportComposition}
            inputProps={{ script }}
            durationInFrames={script.durationInFrames}
            fps={script.fps}
            compositionWidth={script.width}
            compositionHeight={script.height}
            style={{ width: script.width, height: script.height }}
            controls={false}
          />
        </div>
      </div>
    </div>
  );
}
