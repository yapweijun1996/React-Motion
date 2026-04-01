/**
 * Core action hooks for generate + export workflows.
 * Extracted from App.tsx to keep it under 300 lines.
 */

import { useCallback, useRef } from "react";
import { generateScript, type GenerationProgress } from "../services/generateScript";
import { saveScript } from "../services/cache";
import { exportToMp4, downloadBlob, type ExportProgress } from "../services/exportVideo";
import { saveToHistory } from "../services/historyStore";
import { saveExportRecord } from "../services/exportStore";
import { getUserMessage, logError, logWarn } from "../services/errors";
import type { PlayerHandle } from "../video/PlayerHandle";
import type { BusinessData, VideoScript } from "../types";

// --- Generate ---

type GenerateOptions = {
  prompt: string;
  data?: BusinessData;
  onScript: (s: VideoScript) => void;
  onStatus: (p: GenerationProgress | null) => void;
  onError: (msg: string) => void;
  onLoadingChange: (v: boolean) => void;
};

export function useGenerate(opts: GenerateOptions) {
  const isRunning = useRef(false);

  return useCallback(async () => {
    if (!opts.prompt.trim() || isRunning.current) return;
    isRunning.current = true;
    opts.onLoadingChange(true);
    opts.onError("");
    opts.onStatus(null);

    try {
      // Old blob URLs are revoked by App's useEffect cleanup when script changes
      const result = await generateScript(opts.prompt, opts.data, (p: GenerationProgress) => {
        opts.onStatus(p);
      });
      opts.onScript(result);

      try {
        await saveScript(result, opts.prompt);
        await saveToHistory(opts.prompt, result);
      } catch (cacheErr) {
        logWarn("App", "CACHE_SAVE_FAILED", "Script generated but cache save failed", { error: cacheErr });
      }
    } catch (err) {
      logError("App", "UNKNOWN", err);
      opts.onError(getUserMessage(err));
    } finally {
      isRunning.current = false;
      opts.onLoadingChange(false);
      opts.onStatus(null);
    }
  }, [opts]);
}

// --- Export ---

type ExportOptions = {
  script: VideoScript | null;
  exportPlayerRef: React.RefObject<PlayerHandle>;
  exportSurfaceRef: React.RefObject<HTMLDivElement>;
  onProgress: (p: ExportProgress | null) => void;
  onShowStage: (v: boolean) => void;
};

export function useExport(opts: ExportOptions) {
  const isRunning = useRef(false);

  return useCallback(async () => {
    const { script } = opts;
    if (!script || isRunning.current) return;
    isRunning.current = true;
    opts.onProgress({ stage: "capturing", percent: 0, message: "Starting..." });

    try {
      opts.onShowStage(true);
      await waitForPaint();
      await waitForPaint();
      await waitForPaint();

      if (!opts.exportPlayerRef.current || !opts.exportSurfaceRef.current) {
        throw new Error("Export surface is not ready");
      }

      const mp4Blob = await exportToMp4(
        opts.exportPlayerRef.current,
        opts.exportSurfaceRef.current,
        script.width, script.height,
        script.durationInFrames, script.fps,
        (p) => opts.onProgress(p),
        script.scenes,
        script.bgMusicUrl,
      );

      const filename = `${script.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`;
      downloadBlob(mp4Blob, filename);

      await saveExportRecord({
        title: script.title,
        filename,
        sizeMB: mp4Blob.size / 1024 / 1024,
        durationSec: script.durationInFrames / script.fps,
        exportedAt: Date.now(),
      });
    } catch (err) {
      logError("Export", "UNKNOWN", err);
      opts.onProgress({ stage: "error", percent: 0, message: getUserMessage(err) });
    } finally {
      isRunning.current = false;
      opts.onShowStage(false);
      // Auto-clear progress state after 5s so error/done alerts don't persist forever
      setTimeout(() => opts.onProgress(null), 5000);
    }
  }, [opts]);
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
