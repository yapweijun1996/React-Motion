/**
 * useAppState — all state + callbacks for the main App component.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { PlayerHandle } from "../video/PlayerHandle";
import { loadScript } from "../services/cache";
import { type ExportProgress } from "../services/exportVideo";
import { hasApiKey } from "../services/settingsStore";
import { useGenerate, useExport } from "./useVideoActions";
import { exportToPptx } from "../services/exportPptx";
import { generateSceneTTS } from "../services/tts";
import { adjustSceneTimings } from "../services/adjustTiming";
import { logWarn } from "../services/errors";
import type { GenerationProgress } from "../services/generateScript";
import type { CostSummary } from "../services/costTracker";
import { loadCostFromCache } from "../services/costTracker";
import type { MountConfig, VideoScript } from "../types";
import type { TTSMetadata } from "../services/historyStore";

export function useAppState(config: MountConfig) {
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
  const [lastCost, setLastCost] = useState<CostSummary | null>(() => loadCostFromCache());

  const playerRef = useRef<PlayerHandle>(null);
  const exportPlayerRef = useRef<PlayerHandle>(null);
  const exportSurfaceRef = useRef<HTMLDivElement>(null);
  const ttsSessionRef = useRef(0);

  // Restore cached script on mount
  useEffect(() => {
    let cancelled = false;
    loadScript().then((cached) => {
      if (cancelled) return;
      if (cached) {
        setScript(cached.script);
        setPrompt(cached.prompt);
        console.log("[App] Restored cached video from IndexedDB");
      }
    }).catch((err) => {
      if (cancelled) return;
      logWarn("App", "CACHE_LOAD_FAILED", "Failed to restore cached script", { error: err });
    });
    return () => { cancelled = true; };
  }, []);

  // Re-check API key when settings panel closes
  useEffect(() => {
    if (!settingsOpen) setApiReady(hasApiKey());
  }, [settingsOpen]);

  // Revoke TTS blob URLs when script changes or unmount
  useEffect(() => {
    return () => {
      ttsSessionRef.current += 1;
      script?.scenes.forEach((s) => {
        if (s.ttsAudioUrl) URL.revokeObjectURL(s.ttsAudioUrl);
      });
    };
  }, [script]);

  const handleGenerateStatus = useCallback((p: GenerationProgress | null) => {
    setGenerationStatus(p);
    if (p?.costSummary) setLastCost(p.costSummary);
  }, []);

  const handleGenerate = useGenerate({
    prompt,
    data: config.data,
    onScript: setScript,
    onStatus: handleGenerateStatus,
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

  const handleRestore = useCallback((s: VideoScript, p: string, ttsMetadata: TTSMetadata[], costUsd?: number, costBreakdown?: Record<string, number>) => {
    // Restore cost if available
    if (costUsd != null && costBreakdown) {
      setLastCost({
        totalUsd: costUsd,
        breakdown: costBreakdown as CostSummary["breakdown"],
        totalInputTokens: 0, totalOutputTokens: 0, callCount: 0, entries: [],
      });
    }
    ttsSessionRef.current += 1;
    const sessionId = ttsSessionRef.current;

    const scenesWithNarration = s.scenes.map((scene) => {
      const meta = ttsMetadata.find((m) => m.sceneId === scene.id);
      if (meta && !scene.narration) {
        return { ...scene, narration: meta.narration };
      }
      return scene;
    });
    const restoredScript = { ...s, scenes: scenesWithNarration };

    setScript(restoredScript);
    setPrompt(p);
    setError(null);

    if (ttsMetadata.length > 0) {
      const ttsStart = performance.now();
      const ttsProg = (done: number, total: number): GenerationProgress => ({
        stage: "tts", stageIndex: 2, stageCount: 4, stageLabel: "Narration",
        message: `Regenerating narration (${done}/${total})...`,
        percent: total > 0 ? (done / total) * 100 : 0,
        elapsedMs: Math.round(performance.now() - ttsStart),
        startTime: ttsStart,
        eta: done > 0 ? Math.round(((performance.now() - ttsStart) / done) * (total - done) / 1000) : undefined,
      });
      setGenerationStatus(ttsProg(0, ttsMetadata.length));
      generateSceneTTS(restoredScript.scenes, (prog) => {
        if (sessionId !== ttsSessionRef.current) return;
        setGenerationStatus(ttsProg(prog.scenesProcessed, prog.totalScenes));
      })
        .then((scenesWithTTS) => {
          if (sessionId !== ttsSessionRef.current) return;
          const adjusted = adjustSceneTimings({ ...restoredScript, scenes: scenesWithTTS });
          setScript(adjusted);
          setGenerationStatus(null);
        })
        .catch((err) => {
          if (sessionId !== ttsSessionRef.current) return;
          logWarn("App", "TTS_PARTIAL_FAILURE", "TTS regeneration failed", { error: err });
          setGenerationStatus(null);
        });
    }
  }, []);

  const isExporting = exportProgress !== null && exportProgress.stage !== "done" && exportProgress.stage !== "error";

  return {
    // State
    prompt, setPrompt,
    script,
    loading,
    generationStatus,
    lastCost,
    error, setError,
    exportProgress, setExportProgress,
    showExportStage,
    settingsOpen, setSettingsOpen,
    historyOpen, setHistoryOpen,
    pptxExporting,
    apiReady,
    isExporting,
    // Refs
    playerRef,
    exportPlayerRef,
    exportSurfaceRef,
    // Handlers
    handleGenerate,
    handleExport,
    handleExportPptx,
    handleKeyDown,
    handleRestore,
  };
}
