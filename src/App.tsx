import { useState } from "react";
import { VideoPlayer } from "./video/VideoPlayer";
import { ReportComposition } from "./video/ReportComposition";
import { ErrorBoundary } from "./video/ErrorBoundary";
import { SettingsPanel } from "./components/SettingsPanel";
import { PromptTemplates } from "./components/PromptTemplates";
import { ExportStage, ExportOverlay } from "./components/ExportStage";
import { GenerationProgressBar } from "./components/GenerationProgressBar";
import { HistoryPanel } from "./components/HistoryPanel";
import { LogModal } from "./components/LogModal";
import { IconHistory, IconClipboard, IconSettings, IconX } from "./components/Icons";
import { useAppState } from "./hooks/useAppState";
import { exportScrollPage } from "./services/exportScrollPage";
import type { MountConfig } from "./types";
import "./styles.css";

type AppProps = {
  config: MountConfig;
};

export const App: React.FC<AppProps> = ({ config }) => {
  const {
    prompt, setPrompt,
    script,
    loading,
    generationStatus,
    error,
    exportProgress, setExportProgress,
    showExportStage,
    settingsOpen, setSettingsOpen,
    historyOpen, setHistoryOpen,
    pptxExporting,
    apiReady,
    isExporting,
    playerRef,
    exportPlayerRef,
    exportSurfaceRef,
    handleGenerate,
    handleExport,
    handleExportPptx,
    handleKeyDown,
    handleRestore,
  } = useAppState(config);

  const [logOpen, setLogOpen] = useState(false);

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
            <IconHistory size={18} />
          </button>
          <button
            className="rm-btn-gear"
            onClick={() => setLogOpen(true)}
            title="API Log"
            aria-label="Open API log"
          >
            <IconClipboard size={18} />
          </button>
          <button
            className="rm-btn-gear"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            aria-label="Open settings"
          >
            <IconSettings size={18} />
          </button>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LogModal open={logOpen} onClose={() => setLogOpen(false)} />

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
              <button
                className="rm-btn rm-btn-outline"
                onClick={() => exportScrollPage(script)}
                disabled={isExporting || pptxExporting}
              >
                Export Scroll
              </button>
            </>
          )}
        </div>
      </div>

      {generationStatus && (
        <GenerationProgressBar progress={generationStatus} />
      )}

      {error && <div className="rm-alert rm-alert-error">{error}</div>}

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
              <IconX size={16} />
            </button>
          )}
          {exportProgress.stage !== "error" && (
            <div className="rm-progress-track">
              <div className="rm-progress-fill" style={{ width: `${exportProgress.percent}%` }} />
            </div>
          )}
        </div>
      )}

      {isExporting && exportProgress && (
        <ExportOverlay progress={exportProgress} />
      )}

      {!loading && !isExporting && (
        <PromptTemplates
          onSelect={(p) => setPrompt(p)}
          disabled={isExporting}
        />
      )}

      {script && !loading && (
        <>
          <div className="rm-player-wrap">
            <ErrorBoundary level="player" label="VideoPlayer">
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
            </ErrorBoundary>
          </div>
          {showExportStage && (
            <ExportStage script={script} playerRef={exportPlayerRef} surfaceRef={exportSurfaceRef} />
          )}
        </>
      )}

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
