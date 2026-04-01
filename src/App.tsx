import { useState, useCallback, useRef, useEffect } from "react";
import { VideoPlayer } from "./video/VideoPlayer";
import type { PlayerHandle } from "./video/PlayerHandle";
import { ReportComposition } from "./video/ReportComposition";
import { loadScript } from "./services/cache";
import { type ExportProgress } from "./services/exportVideo";
import { hasApiKey } from "./services/settingsStore";
import { SettingsPanel } from "./components/SettingsPanel";
import { PromptTemplates } from "./components/PromptTemplates";
import { ExportStage, ExportOverlay } from "./components/ExportStage";
import { GenerationProgressBar } from "./components/GenerationProgressBar";
import { HistoryPanel } from "./components/HistoryPanel";
import { useGenerate, useExport } from "./hooks/useVideoActions";
import { exportToPptx } from "./services/exportPptx";
import { generateSceneTTS } from "./services/tts";
import { adjustSceneTimings } from "./services/adjustTiming";
import { logWarn } from "./services/errors";
import type { GenerationProgress } from "./services/generateScript";
import type { MountConfig, VideoScript } from "./types";
import type { TTSMetadata } from "./services/historyStore";
import "./styles.css";

type AppProps = {
  config: MountConfig;
};

export const App: React.FC<AppProps> = ({ config }) => {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [showExportStage, setShowExportStage] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pptxExporting, setPptxExporting] = useState(false);
  const [apiReady, setApiReady] = useState(hasApiKey);

  const playerRef = useRef<PlayerHandle>(null);
  const exportPlayerRef = useRef<PlayerHandle>(null);
  const exportSurfaceRef = useRef<HTMLDivElement>(null);

  // Restore cached script on mount
  useEffect(() => {
    loadScript().then((cached) => {
      if (cached) {
        setScript(cached.script);
        setPrompt(cached.prompt);
        console.log("[App] Restored cached video from IndexedDB");
      }
    }).catch((err) => {
      logWarn("App", "CACHE_LOAD_FAILED", "Failed to restore cached script", { error: err });
    });
  }, []);

  // Re-check API key when settings panel closes
  useEffect(() => {
    if (!settingsOpen) setApiReady(hasApiKey());
  }, [settingsOpen]);

  // Revoke TTS blob URLs on unmount
  useEffect(() => {
    return () => {
      script?.scenes.forEach((s) => {
        if (s.ttsAudioUrl) URL.revokeObjectURL(s.ttsAudioUrl);
      });
    };
  }, [script]);

  const handleGenerate = useGenerate({
    prompt,
    data: config.data,
    currentScript: script,
    onScript: setScript,
    onStatus: setGenerationStatus,
    onError: setError,
    onLoadingChange: setLoading,
  });

  const handleExport = useExport({
    script,
    exportPlayerRef,
    exportSurfaceRef,
    onProgress: setExportProgress,
    onShowStage: setShowExportStage,
  });

  const handleExportPptx = useCallback(async () => {
    if (!script) return;
    setPptxExporting(true);
    try {
      await exportToPptx(script);
    } catch (err) {
      logWarn("App", "PPTX_EXPORT_FAILED", "PPT export failed", { error: err });
      setError("PPT export failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPptxExporting(false);
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

  const handleRestore = useCallback((s: VideoScript, p: string, ttsMetadata: TTSMetadata[]) => {
    // Revoke old blob URLs
    script?.scenes.forEach((sc) => { if (sc.ttsAudioUrl) URL.revokeObjectURL(sc.ttsAudioUrl); });

    // Restore narration text from ttsMetadata back into scenes
    const scenesWithNarration = s.scenes.map((scene) => {
      const meta = ttsMetadata.find((m) => m.sceneId === scene.id);
      if (meta && !scene.narration) {
        return { ...scene, narration: meta.narration };
      }
      return scene;
    });
    const restoredScript = { ...s, scenes: scenesWithNarration };

    // Show video immediately (no audio yet)
    setScript(restoredScript);
    setPrompt(p);
    setError(null);

    // Regenerate TTS in background if there is narration
    if (ttsMetadata.length > 0) {
      const ttsStart = performance.now();
      const ttsProg = (done: number, total: number): GenerationProgress => ({
        stage: "tts", stageIndex: 2, stageCount: 4, stageLabel: "Narration",
        message: `Regenerating narration (${done}/${total})...`,
        percent: total > 0 ? (done / total) * 100 : 0,
        elapsedMs: Math.round(performance.now() - ttsStart),
        eta: done > 0 ? Math.round(((performance.now() - ttsStart) / done) * (total - done) / 1000) : undefined,
      });
      setGenerationStatus(ttsProg(0, ttsMetadata.length));
      generateSceneTTS(restoredScript.scenes, (prog) => {
        setGenerationStatus(ttsProg(prog.scenesProcessed, prog.totalScenes));
      })
        .then((scenesWithTTS) => {
          const adjusted = adjustSceneTimings({ ...restoredScript, scenes: scenesWithTTS });
          setScript(adjusted);
          setGenerationStatus(null);
        })
        .catch((err) => {
          logWarn("App", "TTS_PARTIAL_FAILURE", "TTS regeneration failed", { error: err });
          setGenerationStatus(null);
        });
    }
  }, [script]);

  const isExporting = exportProgress !== null && exportProgress.stage !== "done" && exportProgress.stage !== "error";

  return (
    <div className="rm-app">
      {/* Header */}
      <header className="rm-header">
        <div className="rm-logo">
          <div className="rm-logo-icon">RM</div>
          <div>
            <div className="rm-logo-text">
              React-Motion <span className="rm-logo-sub">AI Video Generator</span>
            </div>
          </div>
        </div>
        <div className="rm-header-actions">
          <span className={`rm-status ${apiReady ? "rm-status-ok" : "rm-status-warn"}`}>
            {apiReady ? "API Ready" : "No API Key"}
          </span>
          <button
            className="rm-btn-gear"
            onClick={() => setHistoryOpen(true)}
            title="History"
            aria-label="Open history"
          >
            ↻
          </button>
          <button
            className="rm-btn-gear"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            aria-label="Open settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Settings panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* History panel */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
        disabled={loading || isExporting}
      />

      {/* Prompt input */}
      <div className="rm-input-area">
        <textarea
          className="rm-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"Paste your data and describe what video to generate.\nE.g.: 以下是供应商数据：Hin Kang 27155, Adbery 3150, Abbery 280。帮我做汇报视频。"}
          disabled={loading || isExporting}
          rows={4}
        />
        <div className="rm-actions">
          <button
            className="rm-btn rm-btn-primary"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || isExporting || !apiReady}
          >
            {loading && <span className="rm-spinner" />}
            {loading ? "Generating..." : "Generate"}
          </button>
          {script && (
            <>
              <button
                className="rm-btn rm-btn-success"
                onClick={handleExport}
                disabled={isExporting || pptxExporting}
              >
                {isExporting ? "Exporting..." : "Export MP4"}
              </button>
              <button
                className="rm-btn rm-btn-outline"
                onClick={handleExportPptx}
                disabled={isExporting || pptxExporting}
              >
                {pptxExporting ? "Exporting..." : "Export PPT"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generation / TTS progress */}
      {generationStatus && (
        <GenerationProgressBar progress={generationStatus} />
      )}

      {/* Error display */}
      {error && <div className="rm-alert rm-alert-error">{error}</div>}

      {/* Export progress */}
      {exportProgress && exportProgress.stage !== "done" && (
        <div className={`rm-alert ${exportProgress.stage === "error" ? "rm-alert-error" : "rm-alert-info"}`}>
          {exportProgress.message}
          {exportProgress.eta != null && exportProgress.eta > 0 && (
            <span className="rm-eta">
              {" "}— ~{exportProgress.eta >= 60
                ? `${Math.floor(exportProgress.eta / 60)}m ${exportProgress.eta % 60}s`
                : `${exportProgress.eta}s`} remaining
            </span>
          )}
          {exportProgress.stage === "error" && (
            <button
              className="rm-alert-dismiss"
              onClick={() => setExportProgress(null)}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          )}
          {exportProgress.stage !== "error" && (
            <div className="rm-progress-track">
              <div className="rm-progress-fill" style={{ width: `${exportProgress.percent}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Export modal overlay */}
      {isExporting && exportProgress && (
        <ExportOverlay progress={exportProgress} />
      )}

      {/* Prompt templates — near input for easy access */}
      {!loading && !isExporting && (
        <PromptTemplates
          onSelect={(p) => setPrompt(p)}
          disabled={isExporting}
        />
      )}

      {/* Video player — hide during generation so user focuses on progress */}
      {script && !loading && (
        <>
          <div className="rm-player-wrap">
            <VideoPlayer
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
          {showExportStage && (
            <ExportStage script={script} playerRef={exportPlayerRef} surfaceRef={exportSurfaceRef} />
          )}
        </>
      )}

      {/* Empty state */}
      {!script && !loading && (
        <div className="rm-empty">
          Pick a template above, or paste your own data + describe the video.
          <br />
          AI will extract, analyze, and generate the presentation.
          {!apiReady && (
            <>
              <br /><br />
              <button className="rm-btn rm-btn-primary" onClick={() => setSettingsOpen(true)}>
                Configure API Key
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
