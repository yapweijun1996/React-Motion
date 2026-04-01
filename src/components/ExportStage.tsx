import { VideoSurface } from "../video/VideoSurface";
import { ReportComposition } from "../video/ReportComposition";
import type { PlayerHandle } from "../video/PlayerHandle";
import type { VideoScript } from "../types";
import type { ExportProgress } from "../services/exportVideo";

// --- Export overlay (modal dialog during export) ---

type ExportOverlayProps = {
  progress: ExportProgress;
};

function formatEta(eta: number): string {
  if (eta >= 60) return `~${Math.floor(eta / 60)}m ${eta % 60}s remaining`;
  return `~${eta}s remaining`;
}

export function ExportOverlay({ progress }: ExportOverlayProps) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="export-modal-title" className="rm-export-overlay">
      <div className="rm-export-modal">
        <h3 id="export-modal-title" className="rm-export-title">Export in progress</h3>
        <p className="rm-export-desc">
          Keep this tab open and active until the MP4 export finishes.
          Switching tabs or minimizing the browser may interrupt capture.
        </p>
        <div className="rm-export-status">{progress.message}</div>
        {progress.eta != null && progress.eta > 0 && (
          <div className="rm-export-eta">{formatEta(progress.eta)}</div>
        )}
        {progress.stage !== "error" && (
          <div className="rm-progress-track" style={{ marginTop: 12 }}>
            <div className="rm-progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Export stage (full-screen capture surface) ---

type ExportStageProps = {
  script: VideoScript;
  playerRef: React.RefObject<PlayerHandle>;
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
          <VideoSurface
            ref={playerRef}
            component={ReportComposition}
            inputProps={{ script }}
            durationInFrames={script.durationInFrames}
            fps={script.fps}
            compositionWidth={script.width}
            compositionHeight={script.height}
          />
        </div>
      </div>
    </div>
  );
}
