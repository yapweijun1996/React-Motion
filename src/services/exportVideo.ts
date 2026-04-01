import { toPng } from "html-to-image";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { PlayerHandle } from "../video/PlayerHandle";
import type { VideoScene } from "../types";
import { muxAudioIntoVideo } from "./exportAudio";
import { ClassifiedError, normalizeError, logError, logWarn } from "./errors";
import { trackEvent } from "./metrics";
import { loadSettings, type ExportQuality } from "./settingsStore";
import { canUseWebCodecs, WEBCODECS_QUALITY } from "./webCodecsSupport";
import { encodeVideoWithWebCodecs } from "./exportVideoWebCodecs";

const QUALITY_PROFILES: Record<ExportQuality, { crf: string; preset: string }> = {
  draft:    { crf: "28", preset: "ultrafast" },
  standard: { crf: "24", preset: "fast" },
  high:     { crf: "20", preset: "medium" },
};
import coreURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url";
import coreWasmURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url";

// Multi-thread: UMD build served from public/ to bypass Vite's ESM transformation.
// Vite dev server transforms JS → adds static `import` statements → breaks classic
// pthread workers created by emscripten. Files in public/ are served as-is.
const FFMPEG_MT_BASE = "/ffmpeg-mt";

let ffmpeg: FFmpeg | null = null;
let ffmpegIsMultiThread = false;
let progressListener: ((event: { progress: number }) => void) | null = null;

/** Exported for testing only. */
export function canUseMultithreadCore(): boolean {
  if (typeof SharedArrayBuffer === "undefined") {
    console.log("[Export] SharedArrayBuffer not available — single-thread");
    return false;
  }
  if (!window.crossOriginIsolated) {
    console.log("[Export] Not cross-origin isolated — single-thread");
    return false;
  }
  return true;
}


function initFFmpegListeners(
  ff: FFmpeg,
  onProgress: (progress: number) => void,
): void {
  progressListener = ({ progress }) => onProgress(progress);
  ff.on("progress", progressListener);
  ff.on("log", ({ message }) => {
    console.log("[FFmpeg]", message);
  });
}

/** Exported for testing only. */
export async function getFFmpeg(
  onProgress: (progress: number) => void,
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    console.log("[Export] FFmpeg already loaded, reusing (multi-thread:", ffmpegIsMultiThread, ")");
    if (progressListener) {
      ffmpeg.off("progress", progressListener);
    }

    progressListener = ({ progress }) => onProgress(progress);
    ffmpeg.on("progress", progressListener);
    return ffmpeg;
  }

  const wantMultiThread = canUseMultithreadCore();
  console.log("[Export] Loading FFmpeg.wasm...");
  console.log("[Export] SharedArrayBuffer available:", typeof SharedArrayBuffer !== "undefined");
  console.log("[Export] crossOriginIsolated:", window.crossOriginIsolated);
  console.log("[Export] hardwareConcurrency:", navigator.hardwareConcurrency);
  console.log("[Export] Core mode:", wantMultiThread ? "multi-thread" : "single-thread");

  const t0 = performance.now();

  const stConfig = {
    coreURL: await toBlobURL(coreURL, "text/javascript"),
    wasmURL: await toBlobURL(coreWasmURL, "application/wasm"),
  };

  // --- Try multi-thread first, fallback to single-thread ---
  if (wantMultiThread) {
    ffmpeg = new FFmpeg();
    initFFmpegListeners(ffmpeg, onProgress);

    try {
      const mtConfig = {
        coreURL: await toBlobURL(`${FFMPEG_MT_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_MT_BASE}/ffmpeg-core.wasm`, "application/wasm"),
        workerURL: await toBlobURL(`${FFMPEG_MT_BASE}/ffmpeg-core.worker.js`, "text/javascript"),
      };

      await ffmpeg.load(mtConfig);
      ffmpegIsMultiThread = true;
      console.log(`[Export] FFmpeg.wasm (multi-thread) loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      return ffmpeg;
    } catch (mtError) {
      logWarn("Export", "EXPORT_FFMPEG_LOAD", "Multi-thread load failed, falling back to single-thread", { error: mtError });
      if (progressListener) ffmpeg.off("progress", progressListener);
      ffmpeg.terminate();
      ffmpeg = null;
      progressListener = null;
    }
  }

  // --- Single-thread path (direct or fallback) ---
  ffmpeg = new FFmpeg();
  initFFmpegListeners(ffmpeg, onProgress);

  try {
    await ffmpeg.load(stConfig);
  } catch (error) {
    logError("Export", "EXPORT_FFMPEG_LOAD", error);
    ffmpeg.terminate();
    ffmpeg = null;
    progressListener = null;
    throw new ClassifiedError("EXPORT_FFMPEG_LOAD", normalizeError(error).message);
  }

  ffmpegIsMultiThread = false;
  console.log(`[Export] FFmpeg.wasm (single-thread) loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

  return ffmpeg;
}

export type ExportProgress = {
  stage: "capturing" | "writing" | "encoding" | "muxing" | "done" | "error";
  percent: number;
  message: string;
  /** Estimated seconds remaining (undefined = unknown) */
  eta?: number;
};

export async function exportToMp4(
  playerRef: PlayerHandle,
  captureTarget: HTMLElement,
  width: number,
  height: number,
  totalFrames: number,
  fps: number,
  onProgress: (p: ExportProgress) => void,
  scenes?: VideoScene[],
  bgMusicUrl?: string,
): Promise<Blob> {
  console.group("[Export] exportToMp4");
  console.log("[Export] Config:", { totalFrames, fps, width, height });
  console.log("[Export] Browser:", navigator.userAgent);
  console.log("[Export] Capture target size:", captureTarget.offsetWidth, "x", captureTarget.offsetHeight);

  // --- Step 2: Load FFmpeg first (so we can stream frames directly) ---
  onProgress({ stage: "writing", percent: 0, message: "Loading FFmpeg..." });

  const encodeEtaStart = performance.now();
  const ff = await getFFmpeg((p) => {
    const pct = Math.round(p * 100);
    let eta: number | undefined;
    if (p > 0.01) {
      const encElapsed = (performance.now() - encodeEtaStart) / 1000;
      eta = Math.round(encElapsed * (1 - p) / p);
    }
    onProgress({
      stage: "encoding",
      percent: pct,
      message: `Encoding MP4 (${pct}%)...`,
      eta,
    });
  });

  // --- Step 3: Capture frames + stream write to FFmpeg FS ---
  onProgress({ stage: "capturing", percent: 0, message: "Capturing frames..." });
  playerRef.pause();

  console.log("[Export] Frame plan:", { frameStep: 1, framesToCapture: totalFrames, totalFrames });
  const captureStart = performance.now();

  let capturedCount = 0;
  let failedCount = 0;
  let totalBytes = 0;

  for (let i = 0; i < totalFrames; i++) {
    playerRef.seekTo(i);
    await waitFrame();

    try {
      const dataUrl = await toPng(captureTarget, {
        width,
        height,
        canvasWidth: width,
        canvasHeight: height,
        skipFonts: true,
        // Skip <audio>/<video> — they have blob: URLs that html-to-image
        // tries to fetch during DOM clone, causing ERR_FILE_NOT_FOUND
        filter: (node: HTMLElement) => {
          const tag = node.tagName;
          return tag !== "AUDIO" && tag !== "VIDEO";
        },
      });

      // Stream: write to FFmpeg FS immediately, then discard data URL
      const pngData = await fetchFile(dataUrl);
      totalBytes += pngData.byteLength;
      await ff.writeFile(`frame${String(capturedCount).padStart(5, "0")}.png`, pngData);
      capturedCount++;
    } catch (err) {
      logWarn("Export", "EXPORT_TOO_MANY_FAILED", `Frame ${i} capture failed`, { error: err });
      failedCount++;
      continue;
    }

    const pct = Math.round(((i + 1) / totalFrames) * 100);
    const elapsed = (performance.now() - captureStart) / 1000;
    const avgPerFrame = elapsed / (i + 1);
    const remaining = totalFrames - (i + 1);
    const etaSec = Math.round(avgPerFrame * remaining);

    onProgress({
      stage: "capturing",
      percent: pct,
      message: `Capturing frame ${capturedCount} / ${totalFrames}`,
      eta: etaSec,
    });

    // Yield to main thread so the browser can repaint the progress bar
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  const captureDuration = ((performance.now() - captureStart) / 1000).toFixed(1);
  const avgFrameTime = capturedCount > 0 ? ((performance.now() - captureStart) / capturedCount).toFixed(0) : "N/A";
  console.log(`[Export] Captured ${capturedCount} frames in ${captureDuration}s (avg ${avgFrameTime}ms/frame)`);
  console.log(`[Export] Streamed ${(totalBytes / 1024 / 1024).toFixed(1)}MB to FFmpeg FS`);

  if (capturedCount === 0) {
    console.groupEnd();
    throw new ClassifiedError("EXPORT_NO_FRAMES", "No frames captured — html-to-image failed for all frames");
  }
  if (failedCount > totalFrames * 0.2) {
    logWarn("Export", "EXPORT_TOO_MANY_FAILED", `${failedCount}/${totalFrames} frames failed (>${20}%) — continuing with available frames`);
  }

  // --- Step 4: Encode MP4 ---
  const inputFps = fps;
  const quality = loadSettings().exportQuality;
  const { crf, preset } = QUALITY_PROFILES[quality];
  const threadCount = ffmpegIsMultiThread
    ? Math.min(navigator.hardwareConcurrency || 4, 4)
    : 1;
  const ffmpegArgs = [
    "-framerate", String(inputFps),
    "-i", "frame%05d.png",
    "-c:v", "libx264",
    "-preset", preset,
    "-crf", crf,
    "-threads", String(threadCount),
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-tune", "stillimage",
    "-r", String(fps),
    "output.mp4",
  ];

  console.log("[Export] Quality:", quality, `(CRF ${crf}, preset ${preset})`);
  console.log("[Export] FFmpeg args:", ffmpegArgs.join(" "));
  console.log("[Export] Input fps:", inputFps, "→ Output fps:", fps);
  console.log("[Export] Threads:", threadCount, ffmpegIsMultiThread ? "(multi-thread)" : "(single-thread)");

  onProgress({ stage: "encoding", percent: 0, message: "Encoding MP4 (0%)..." });
  const encodeStart = performance.now();

  const exitCode = await ff.exec(ffmpegArgs);
  if (exitCode !== 0) {
    logError("Export", "EXPORT_FFMPEG_ENCODE", `FFmpeg exited with code ${exitCode}`, { exitCode, args: ffmpegArgs.join(" ") });
    throw new ClassifiedError("EXPORT_FFMPEG_ENCODE", `FFmpeg exited with code ${exitCode}`);
  }

  const encodeDuration = ((performance.now() - encodeStart) / 1000).toFixed(1);
  console.log(`[Export] Encoding completed in ${encodeDuration}s`);

  // --- Step 5: Mux audio (TTS + optional BGM) ---
  const hasAudio = (scenes && scenes.some((s) => s.ttsAudioUrl)) || bgMusicUrl;
  if (hasAudio && scenes) {
    onProgress({ stage: "muxing", percent: 0, message: "Mixing audio..." });
    await muxAudioIntoVideo(ff, scenes, fps, bgMusicUrl);
  }

  try {
    const data = await ff.readFile("output.mp4");
    const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
    const totalDuration = ((performance.now() - captureStart) / 1000).toFixed(1);

    console.log("[Export] === DONE ===");
    console.log(`[Export] MP4 size: ${(mp4Blob.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[Export] Total time: ${totalDuration}s (capture+write: ${captureDuration}s, encode: ${encodeDuration}s)`);
    console.log(`[Export] Frames: ${capturedCount}, Input PNG: ${(totalBytes / 1024 / 1024).toFixed(1)}MB -> Output MP4: ${(mp4Blob.size / 1024 / 1024).toFixed(2)}MB`);

    onProgress({ stage: "done", percent: 100, message: "Export complete!" });
    trackEvent("export", true, Math.round(performance.now() - captureStart), {
      frames: capturedCount,
      totalFrames,
      multiThread: ffmpegIsMultiThread,
      sizeMB: +(mp4Blob.size / 1024 / 1024).toFixed(2),
    });
    return mp4Blob;
  } catch (error) {
    throw normalizeError(error);
  } finally {
    for (let i = 0; i < capturedCount; i++) {
      await ff.deleteFile(`frame${String(i).padStart(5, "0")}.png`).catch(() => undefined);
    }

    await ff.deleteFile("output.mp4").catch(() => undefined);
    console.groupEnd();
  }
}

/** Reset module-level FFmpeg state between tests. */
export function _resetFFmpegForTest(): void {
  if (ffmpeg) {
    try { ffmpeg.terminate(); } catch { /* ignore */ }
  }
  ffmpeg = null;
  ffmpegIsMultiThread = false;
  progressListener = null;
}

/** Expose ffmpegIsMultiThread for test assertions. */
export function _isMultiThread(): boolean {
  return ffmpegIsMultiThread;
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
