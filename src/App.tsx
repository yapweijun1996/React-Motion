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

  const playerRef = useRef<PlayerRef>(null);

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

  const playerContainerRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!script || !playerRef.current || !playerContainerRef.current) return;

    setExportProgress({ stage: "capturing", percent: 0, message: "Starting..." });

    try {
      const mp4Blob = await exportToMp4(
        playerRef.current,
        playerContainerRef.current,
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

      {/* Video player */}
      {script && (
        <div ref={playerContainerRef}>
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
        </div>
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
