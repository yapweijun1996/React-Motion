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
import { RhythmDebugPanel } from "./components/RhythmDebugPanel";
import { useAppState } from "./hooks/useAppState";
import type { MountConfig } from "./types";
import "./styles.css";

type AppProps = {
  config: MountConfig;
};

/* ── Sidebar nav icons (inline SVG, 16x16) ── */
const IconGenerate = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

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
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const sceneCount = script?.scenes?.length ?? 0;

  return (
    <div className="rm-app">
      {/* ── Sidebar ── */}
      <aside className="rm-sidebar">
        <div className="rm-sidebar-logo">
          <div className="rm-logo-icon">RM</div>
          <div>
            <span className="rm-logo-text">React-Motion</span>
            <span className="rm-logo-sub">AI Video Generator</span>
          </div>
        </div>

        <nav className="rm-sidebar-nav">
          <button className="rm-nav-item active">
            <IconGenerate /> Generate
          </button>
          <button className="rm-nav-item" onClick={() => setHistoryOpen(true)}>
            <IconHistory size={16} /> History
          </button>
          <button className="rm-nav-item" onClick={() => setLogOpen(true)}>
            <IconClipboard size={16} /> API Log
          </button>
          <button className="rm-nav-item" onClick={() => setSettingsOpen(true)}>
            <IconSettings size={16} /> Settings
          </button>
        </nav>

        <div className="rm-sidebar-footer">
          <span className={`rm-status ${apiReady ? "rm-status-ok" : "rm-status-warn"}`}>
            {apiReady ? "● API Ready" : "● No API Key"}
          </span>
        </div>
      </aside>

      {/* ── Center: Video Preview ── */}
      <main className="rm-center">
        <div className="rm-center-header">
          <span className="rm-center-title">Preview</span>
          <div className="rm-center-badges">
            {script && (
              <>
                <span className="rm-badge rm-badge-success">✓ Generated</span>
                <span className="rm-badge rm-badge-neutral">{sceneCount} scenes</span>
              </>
            )}
            {loading && <span className="rm-badge rm-badge-primary">● Generating</span>}
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

        {script && !loading ? (
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
            <RhythmDebugPanel script={script} />
            {showExportStage && (
              <ExportStage script={script} playerRef={exportPlayerRef} surfaceRef={exportSurfaceRef} />
            )}
          </>
        ) : !loading ? (
          <div className="rm-empty">
            Enter a prompt to generate your data video.
            <br />
            AI will extract, analyze, and create the presentation.
            {!apiReady && (
              <>
                <br /><br />
                <button className="rm-btn rm-btn-primary" onClick={() => setSettingsOpen(true)}>
                  Configure API Key
                </button>
              </>
            )}
          </div>
        ) : null}
      </main>

      {/* ── Right Panel: Prompt + Controls ── */}
      <section className="rm-right-panel">
        <div className="rm-right-header">
          <span className="rm-right-title">Prompt</span>
          <span className="rm-badge rm-badge-primary">AI</span>
        </div>

        <div className="rm-right-body">
          <textarea
            className="rm-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Paste your data and describe what video to generate.\nE.g.: 以下是供应商数据：Hin Kang 27155, Adbery 3150, Abbery 280。帮我做汇报视频。"}
            disabled={loading || isExporting}
            rows={6}
          />

          {!loading && !isExporting && (
            <div className="rm-templates-collapse">
              <button
                className="rm-templates-collapse-toggle"
                onClick={() => setTemplatesOpen(!templatesOpen)}
              >
                <span>{templatesOpen ? "▾" : "▸"} Templates</span>
                <span className="rm-templates-collapse-count">{templatesOpen ? "Hide" : "Show"}</span>
              </button>
              {templatesOpen && (
                <PromptTemplates
                  onSelect={(p) => { setPrompt(p); setTemplatesOpen(false); }}
                  disabled={isExporting}
                />
              )}
            </div>
          )}
        </div>

        <div className="rm-right-footer">
          <button
            className="rm-btn rm-btn-primary"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || isExporting || !apiReady}
          >
            {loading && <span className="rm-spinner" />}
            {loading ? "Generating..." : "▶ Generate Video"}
          </button>
          {script && (
            <div className="rm-export-row">
              <button
                className="rm-btn rm-btn-secondary"
                onClick={handleExport}
                disabled={isExporting || pptxExporting}
              >
                {isExporting ? "Exporting..." : "MP4"}
              </button>
              <button
                className="rm-btn rm-btn-secondary"
                onClick={handleExportPptx}
                disabled={isExporting || pptxExporting}
              >
                {pptxExporting ? "Exporting..." : "PPTX"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Overlays (unchanged) ── */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LogModal open={logOpen} onClose={() => setLogOpen(false)} />
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
        disabled={loading || isExporting}
      />
    </div>
  );
};
