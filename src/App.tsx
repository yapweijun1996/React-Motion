import { useState, useCallback, useRef, useEffect } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { ReportComposition } from "./video/ReportComposition";
import { generateScript } from "./services/generateScript";
import { saveScript, loadScript } from "./services/cache";
import { exportToMp4, downloadBlob, type ExportProgress } from "./services/exportVideo";
import type { MountConfig, VideoScript } from "./types";

type AppProps = {
  config: MountConfig;
};

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Unknown error");
}

export const App: React.FC<AppProps> = ({ config }) => {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [showExportStage, setShowExportStage] = useState(false);

  const playerRef = useRef<PlayerRef>(null);
  const exportPlayerRef = useRef<PlayerRef>(null);

  // Restore cached script on mount
  useEffect(() => {
    loadScript().then((cached) => {
      if (cached) {
        setScript(cached.script);
        setPrompt(cached.prompt);
        console.log("[App] Restored cached video from IndexedDB");
      }
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generateScript(prompt, config.data);
      setScript(result);
      // Cache to IndexedDB
      await saveScript(result, prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, config.data]);

  const exportSurfaceRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!script) return;

    setExportProgress({ stage: "capturing", percent: 0, message: "Starting..." });

    try {
      setShowExportStage(true);
      await waitForPaint();
      await waitForPaint();
      await waitForPaint();

      if (!exportPlayerRef.current || !exportSurfaceRef.current) {
        throw new Error("Export surface is not ready");
      }

      const mp4Blob = await exportToMp4(
        exportPlayerRef.current,
        exportSurfaceRef.current,
        script.width,
        script.height,
        script.durationInFrames,
        script.fps,
        setExportProgress,
      );

      const filename = `${script.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`;
      downloadBlob(mp4Blob, filename);
    } catch (err) {
      const error = normalizeError(err);
      setExportProgress({ stage: "error", percent: 0, message: error.message });
      console.error("[Export] Failed:", error);
    } finally {
      setShowExportStage(false);
    }
  }, [script]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  const isExporting = exportProgress !== null && exportProgress.stage !== "done" && exportProgress.stage !== "error";

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      {/* Prompt input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"Paste your data and describe what video to generate.\nE.g.: 以下是供应商数据：Hin Kang 27155, Adbery 3150, Abbery 280。帮我做汇报视频。"}
          disabled={loading || isExporting}
          rows={4}
          style={{
            flex: 1,
            padding: "10px 14px",
            fontSize: 15,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignSelf: "flex-end" }}>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || isExporting}
            style={{
              padding: "10px 24px",
              fontSize: 16,
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: loading ? "#9ca3af" : "#2563eb",
              border: "none",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
          {script && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                padding: "10px 24px",
                fontSize: 16,
                fontWeight: 600,
                color: "#ffffff",
                backgroundColor: isExporting ? "#9ca3af" : "#059669",
                border: "none",
                borderRadius: 8,
                cursor: isExporting ? "not-allowed" : "pointer",
              }}
            >
              {isExporting ? "Exporting..." : "Export MP4"}
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{ padding: "10px 14px", marginBottom: 16, backgroundColor: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Export progress */}
      {exportProgress && exportProgress.stage !== "done" && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 16,
            backgroundColor: exportProgress.stage === "error" ? "#fef2f2" : "#eff6ff",
            color: exportProgress.stage === "error" ? "#dc2626" : "#1e40af",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {exportProgress.message}
          {exportProgress.stage !== "error" && (
            <div
              style={{
                marginTop: 6,
                height: 4,
                backgroundColor: "#dbeafe",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${exportProgress.percent}%`,
                  height: "100%",
                  backgroundColor: "#2563eb",
                  transition: "width 0.3s",
                }}
              />
            </div>
          )}
        </div>
      )}

      {isExporting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15, 23, 42, 0.58)",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              padding: "24px 24px 20px",
              borderRadius: 16,
              backgroundColor: "#ffffff",
              boxShadow: "0 30px 80px rgba(15, 23, 42, 0.28)",
            }}
          >
            <div
              id="export-modal-title"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 10,
              }}
            >
              Export in progress
            </div>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: "#334155",
                marginBottom: 16,
              }}
            >
              Keep this tab open and active until the MP4 export finishes. Switching tabs, minimizing the browser, or closing this page may interrupt capture or slow it down.
            </div>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {exportProgress?.message ?? "Preparing export..."}
            </div>
          </div>
        </div>
      )}

      {/* Video player */}
      {script && (
        <>
          <Player
            ref={playerRef}
            component={ReportComposition}
            inputProps={{ script }}
            durationInFrames={script.durationInFrames}
            fps={script.fps}
            compositionWidth={script.width}
            compositionHeight={script.height}
            style={{ width: "100%" }}
            controls
          />
          {showExportStage && (
            <ExportStage
              script={script}
              playerRef={exportPlayerRef}
              surfaceRef={exportSurfaceRef}
            />
          )}
        </>
      )}

      {/* Empty state */}
      {!script && !loading && (
        <div
          style={{
            padding: "60px 40px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 16,
            border: "2px dashed #e5e7eb",
            borderRadius: 12,
            lineHeight: 1.6,
          }}
        >
          Paste your data + describe the video you want.
          <br />
          AI will extract, analyze, and generate the presentation.
        </div>
      )}
    </div>
  );
};

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

type ExportStageProps = {
  script: VideoScript;
  playerRef: React.RefObject<PlayerRef>;
  surfaceRef: React.RefObject<HTMLDivElement>;
};

function ExportStage({ script, playerRef, surfaceRef }: ExportStageProps) {
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
        backgroundColor: "#000000",
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
            backgroundColor: "#000000",
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
