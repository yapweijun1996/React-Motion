import { toPng, toCanvas } from "html-to-image";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { PlayerHandle } from "../video/PlayerHandle";
import type { VideoScene } from "../types";
import { muxAudioIntoVideo } from "./exportAudio";
import { ClassifiedError, normalizeError, logError, logWarn } from "./errors";
import { trackEvent } from "./metrics";
import { loadSettings, type ExportQuality } from "./settingsStore";
import { canUseWebCodecs, WEBCODECS_QUALITY } from "./webCodecsSupport";
import { createStreamingEncoder } from "./exportVideoWebCodecs";

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

  // --- Step 1: Detect WebCodecs support ---
  const useWebCodecs = await canUseWebCodecs();
  const quality = loadSettings().exportQuality;
  console.log(`[Export] Encoding path: ${useWebCodecs ? "WebCodecs (HW)" : "FFmpeg.wasm (SW)"}, quality: ${quality}`);

  // --- Common capture options ---
  const captureOpts = {
    width, height, canvasWidth: width, canvasHeight: height,
    skipFonts: true,
    filter: (node: HTMLElement) => {
      const tag = node.tagName;
      return tag !== "AUDIO" && tag !== "VIDEO";
    },
  };

  const captureStart = performance.now();
  let capturedCount = 0;
  let failedCount = 0;
  let mp4Blob: Blob;
  let encoderUsed: "webcodecs" | "ffmpeg";

  if (useWebCodecs) {
    // ================================================================
    // WebCodecs path: toCanvas → streaming encode (no PNG, no memory buffer)
    // ================================================================
    const { bitrate } = WEBCODECS_QUALITY[quality];
    const streamEnc = createStreamingEncoder(width, height, fps, bitrate);

    onProgress({ stage: "capturing", percent: 0, message: "Capturing + encoding (WebCodecs HW)..." });
    playerRef.pause();
    console.log(`[Export] WebCodecs streaming: capture + encode in one pass | cores=${navigator.hardwareConcurrency} queueSize=${Math.min(30, Math.max(8, (navigator.hardwareConcurrency ?? 4) * 2))} yieldEvery=${Math.min(16, Math.max(4, navigator.hardwareConcurrency ?? 4))}`);

    // Adaptive yield interval — more cores = fewer yields needed
    const yieldEvery = Math.min(16, Math.max(4, navigator.hardwareConcurrency ?? 4));

    // Pipeline: fire-and-forget encode promises, collect for error checking
    let encodeInFlight: Promise<void> = Promise.resolve();

    try {
      for (let i = 0; i < totalFrames; i++) {
        playerRef.seekTo(i);
        // Wait for full paint cycle so React renders the correct frame before capture.
        // waitMicrotask() was faster (~0-4ms) but caused frame skips → audio/video desync.
        await waitFrame();

        try {
          const canvas = await toCanvas(captureTarget, captureOpts);
          // Pipeline: don't await encode — let GPU work while we capture next frame
          // Backpressure is handled inside feedFrame (dequeue event)
          encodeInFlight = streamEnc.feedFrame(canvas, capturedCount);
          capturedCount++;
        } catch (err) {
          logWarn("Export", "EXPORT_TOO_MANY_FAILED", `Frame ${i} capture failed`, { error: err });
          failedCount++;
          continue;
        }

        // Progress update — only emit every 8 frames to reduce overhead
        if (i % 8 === 0 || i === totalFrames - 1) {
          const pct = Math.round(((i + 1) / totalFrames) * 100);
          const elapsed = (performance.now() - captureStart) / 1000;
          const etaSec = Math.round((elapsed / (i + 1)) * (totalFrames - i - 1));

          onProgress({
            stage: "capturing",
            percent: pct,
            message: `Frame ${capturedCount}/${totalFrames} (WebCodecs HW)`,
            eta: etaSec,
          });
        }

        // Yield to browser — adaptive based on hardware
        if (i % yieldEvery === 0) await new Promise<void>((r) => setTimeout(r, 0));
      }

      // Wait for last encode to finish before finalizing
      await encodeInFlight;

      if (capturedCount === 0) {
        streamEnc.close();
        console.groupEnd();
        throw new ClassifiedError("EXPORT_NO_FRAMES", "No frames captured");
      }

      mp4Blob = await streamEnc.finalize();
      encoderUsed = "webcodecs";
    } catch (wcErr) {
      streamEnc.close();

      // If it's our own ClassifiedError (no frames), just rethrow
      if (wcErr instanceof ClassifiedError) throw wcErr;

      // Fallback to FFmpeg full path
      logWarn("Export", "EXPORT_WEBCODECS_ENCODE", "WebCodecs failed, falling back to FFmpeg", { error: wcErr });
      const result = await ffmpegFullExport(
        playerRef, captureTarget, width, height, totalFrames, fps, quality, onProgress, captureOpts,
      );
      mp4Blob = result.blob;
      capturedCount = result.capturedCount;
      failedCount = result.failedCount;
      encoderUsed = "ffmpeg";
    }

    // Audio mux (load FFmpeg only if needed)
    const hasAudio = (scenes && scenes.some((s) => s.ttsAudioUrl)) || bgMusicUrl;
    if (hasAudio && scenes && encoderUsed === "webcodecs") {
      onProgress({ stage: "muxing", percent: 0, message: "Mixing audio..." });
      const ff = await getFFmpeg(() => {});
      const mp4Data = new Uint8Array(await mp4Blob.arrayBuffer());
      await ff.writeFile("output.mp4", mp4Data);
      await muxAudioIntoVideo(ff, scenes, fps, bgMusicUrl);
      const muxedData = await ff.readFile("output.mp4");
      mp4Blob = new Blob([new Uint8Array(muxedData as Uint8Array)], { type: "video/mp4" });
      await ff.deleteFile("output.mp4").catch(() => undefined);
    }
  } else {
    // ================================================================
    // FFmpeg legacy path (unchanged)
    // ================================================================
    const result = await ffmpegFullExport(
      playerRef, captureTarget, width, height, totalFrames, fps, quality, onProgress, captureOpts,
    );
    mp4Blob = result.blob;
    capturedCount = result.capturedCount;
    failedCount = result.failedCount;
    encoderUsed = "ffmpeg";

    // Audio mux
    const hasAudio = (scenes && scenes.some((s) => s.ttsAudioUrl)) || bgMusicUrl;
    if (hasAudio && scenes) {
      onProgress({ stage: "muxing", percent: 0, message: "Mixing audio..." });
      const ff = await getFFmpeg(() => {});
      await muxAudioIntoVideo(ff, scenes, fps, bgMusicUrl);
      const data = await ff.readFile("output.mp4");
      mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
    }
  }

  if (failedCount > totalFrames * 0.2) {
    logWarn("Export", "EXPORT_TOO_MANY_FAILED", `${failedCount}/${totalFrames} frames failed (>20%)`);
  }

  // --- Done ---
  const totalDuration = ((performance.now() - captureStart) / 1000).toFixed(1);
  console.log("[Export] === DONE ===");
  console.log(`[Export] Encoder: ${encoderUsed}, MP4: ${(mp4Blob.size / 1024 / 1024).toFixed(2)} MB, time: ${totalDuration}s`);

  onProgress({ stage: "done", percent: 100, message: "Export complete!" });
  trackEvent("export", true, Math.round(performance.now() - captureStart), {
    frames: capturedCount, totalFrames, encoder: encoderUsed,
    multiThread: ffmpegIsMultiThread,
    sizeMB: +(mp4Blob.size / 1024 / 1024).toFixed(2),
  });
  console.groupEnd();
  return mp4Blob;
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

/** Complete FFmpeg path: capture frames + encode. Used as legacy path and WebCodecs fallback. */
async function ffmpegFullExport(
  playerRef: PlayerHandle,
  captureTarget: HTMLElement,
  _width: number,
  _height: number,
  totalFrames: number,
  fps: number,
  quality: ExportQuality,
  onProgress: (p: ExportProgress) => void,
  captureOpts: Record<string, unknown>,
): Promise<{ blob: Blob; capturedCount: number; failedCount: number }> {
  onProgress({ stage: "writing", percent: 0, message: "Loading FFmpeg..." });
  const ff = await getFFmpeg(() => {});
  const captureStart = performance.now();

  onProgress({ stage: "capturing", percent: 0, message: "Capturing frames..." });
  playerRef.pause();

  let capturedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < totalFrames; i++) {
    playerRef.seekTo(i);
    await waitFrame();

    try {
      const dataUrl = await toPng(captureTarget, captureOpts);
      const pngData = await fetchFile(dataUrl);
      await ff.writeFile(`frame${String(capturedCount).padStart(5, "0")}.png`, pngData);
      capturedCount++;
    } catch (err) {
      logWarn("Export", "EXPORT_TOO_MANY_FAILED", `Frame ${i} capture failed`, { error: err });
      failedCount++;
      continue;
    }

    const pct = Math.round(((i + 1) / totalFrames) * 100);
    const elapsed = (performance.now() - captureStart) / 1000;
    const etaSec = Math.round((elapsed / (i + 1)) * (totalFrames - i - 1));
    onProgress({ stage: "capturing", percent: pct, message: `Capturing frame ${capturedCount}/${totalFrames}`, eta: etaSec });
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  if (capturedCount === 0) {
    throw new ClassifiedError("EXPORT_NO_FRAMES", "No frames captured");
  }

  const blob = await ffmpegEncode(ff, fps, quality, onProgress);

  // Clean up frame files
  for (let i = 0; i < capturedCount; i++) {
    await ff.deleteFile(`frame${String(i).padStart(5, "0")}.png`).catch(() => undefined);
  }

  return { blob, capturedCount, failedCount };
}

/** Run FFmpeg libx264 encoding on frames already in the virtual FS. */
async function ffmpegEncode(
  ff: FFmpeg,
  fps: number,
  quality: ExportQuality,
  onProgress: (p: ExportProgress) => void,
): Promise<Blob> {
  const { crf, preset } = QUALITY_PROFILES[quality];
  const threadCount = ffmpegIsMultiThread
    ? Math.min(navigator.hardwareConcurrency || 4, 4)
    : 1;

  const args = [
    "-framerate", String(fps),
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

  console.log("[Export] FFmpeg args:", args.join(" "));
  console.log("[Export] Quality:", quality, `(CRF ${crf}, preset ${preset})`);
  console.log("[Export] Threads:", threadCount, ffmpegIsMultiThread ? "(multi-thread)" : "(single-thread)");

  onProgress({ stage: "encoding", percent: 0, message: "Encoding MP4 (0%)..." });
  const exitCode = await ff.exec(args);

  if (exitCode !== 0) {
    logError("Export", "EXPORT_FFMPEG_ENCODE", `FFmpeg exited with code ${exitCode}`, { exitCode });
    throw new ClassifiedError("EXPORT_FFMPEG_ENCODE", `FFmpeg exited with code ${exitCode}`);
  }

  const data = await ff.readFile("output.mp4");
  return new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
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
