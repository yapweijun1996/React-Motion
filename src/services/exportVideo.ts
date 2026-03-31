import { toPng } from "html-to-image";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { PlayerRef } from "@remotion/player";
import coreURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url";
import coreWasmURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url";
import coreMtURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js?url";
import coreMtWasmURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm?url";
import coreMtWorkerURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js?url";

let ffmpeg: FFmpeg | null = null;
let progressListener: ((event: { progress: number }) => void) | null = null;
const LOAD_TIMEOUT_MS = 20000;

function canUseMultithreadCore(): boolean {
  // The current ffmpeg.wasm multi-thread path is not stable in our Vite dev/runtime setup.
  // Keep export on the single-thread core until we wire a browser-specific worker strategy.
  return false;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : JSON.stringify(error));
}

async function getFFmpeg(
  onProgress: (progress: number) => void,
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    console.log("[Export] FFmpeg already loaded, reusing");
    if (progressListener) {
      ffmpeg.off("progress", progressListener);
    }

    progressListener = ({ progress }) => onProgress(progress);
    ffmpeg.on("progress", progressListener);
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();
  progressListener = ({ progress }) => onProgress(progress);
  ffmpeg.on("progress", progressListener);
  ffmpeg.on("log", ({ message }) => {
    console.log("[FFmpeg]", message);
  });

  const useMultithreadCore = canUseMultithreadCore();
  console.log("[Export] Loading FFmpeg.wasm...");
  console.log("[Export] SharedArrayBuffer available:", typeof SharedArrayBuffer !== "undefined");
  console.log("[Export] crossOriginIsolated:", window.crossOriginIsolated);
  console.log("[Export] hardwareConcurrency:", navigator.hardwareConcurrency);
  console.log("[Export] Core mode:", useMultithreadCore ? "multi-thread" : "single-thread");

  const t0 = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

  try {
    await ffmpeg.load(
      useMultithreadCore
        ? {
            coreURL: await toBlobURL(coreMtURL, "text/javascript"),
            wasmURL: await toBlobURL(coreMtWasmURL, "application/wasm"),
            workerURL: await toBlobURL(coreMtWorkerURL, "text/javascript"),
          }
        : {
            coreURL: await toBlobURL(coreURL, "text/javascript"),
            wasmURL: await toBlobURL(coreWasmURL, "application/wasm"),
          },
      { signal: controller.signal },
    );
  } catch (error) {
    ffmpeg.terminate();
    ffmpeg = null;
    progressListener = null;
    throw normalizeError(error);
  } finally {
    window.clearTimeout(timeout);
  }

  console.log(`[Export] FFmpeg.wasm loaded in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

  return ffmpeg;
}

export type ExportProgress = {
  stage: "capturing" | "writing" | "encoding" | "done" | "error";
  percent: number;
  message: string;
};

export async function exportToMp4(
  playerRef: PlayerRef,
  captureTarget: HTMLElement,
  width: number,
  height: number,
  totalFrames: number,
  fps: number,
  onProgress: (p: ExportProgress) => void,
): Promise<Blob> {
  console.group("[Export] exportToMp4");
  console.log("[Export] Config:", { totalFrames, fps, width, height });
  console.log("[Export] Browser:", navigator.userAgent);
  console.log("[Export] Capture target size:", captureTarget.offsetWidth, "x", captureTarget.offsetHeight);

  // --- Step 2: Capture frames ---
  onProgress({ stage: "capturing", percent: 0, message: "Capturing frames..." });
  playerRef.pause();

  const frameStep = 3;
  const framesToCapture = Math.ceil(totalFrames / frameStep);
  const pngDataUrls: string[] = [];

  console.log("[Export] Frame plan:", { frameStep, framesToCapture, totalFrames });
  const captureStart = performance.now();

  for (let i = 0; i < totalFrames; i += frameStep) {
    playerRef.seekTo(i);
    await waitFrame();
    await waitFrame();

    try {
      const dataUrl = await toPng(captureTarget, {
        width,
        height,
        canvasWidth: width,
        canvasHeight: height,
        skipFonts: true,
      });

      pngDataUrls.push(dataUrl);
    } catch (err) {
      console.error(`[Export] Frame ${i} capture failed:`, err);
      // Skip failed frame, continue
      continue;
    }

    const pct = Math.round((pngDataUrls.length / framesToCapture) * 100);
    onProgress({
      stage: "capturing",
      percent: pct,
      message: `Capturing frame ${pngDataUrls.length} / ${framesToCapture}`,
    });
  }

  const captureDuration = ((performance.now() - captureStart) / 1000).toFixed(1);
  const avgFrameTime = ((performance.now() - captureStart) / pngDataUrls.length).toFixed(0);
  console.log(`[Export] Captured ${pngDataUrls.length} frames in ${captureDuration}s (avg ${avgFrameTime}ms/frame)`);

  if (pngDataUrls.length === 0) {
    console.groupEnd();
    throw new Error("No frames captured — html-to-image failed for all frames");
  }

  // --- Step 3: Load FFmpeg + write frames ---
  // Free memory — we no longer need the player
  onProgress({ stage: "writing", percent: 0, message: "Loading FFmpeg..." });

  const ff = await getFFmpeg((p) => {
    const pct = Math.round(p * 100);
    onProgress({
      stage: "encoding",
      percent: pct,
      message: `Encoding MP4 (${pct}%)...`,
    });
  });

  const writeStart = performance.now();
  let totalBytes = 0;

  for (let i = 0; i < pngDataUrls.length; i++) {
    const pngData = await fetchFile(pngDataUrls[i]);
    totalBytes += pngData.byteLength;
    await ff.writeFile(`frame${String(i).padStart(5, "0")}.png`, pngData);

    const pct = Math.round(((i + 1) / pngDataUrls.length) * 100);
    onProgress({
      stage: "writing",
      percent: pct,
      message: `Preparing frame ${i + 1} / ${pngDataUrls.length}`,
    });
  }

  console.log(`[Export] Wrote ${pngDataUrls.length} frames (${(totalBytes / 1024 / 1024).toFixed(1)}MB) in ${((performance.now() - writeStart) / 1000).toFixed(1)}s`);

  // --- Step 4: Encode MP4 ---
  const inputFps = Math.max(Math.round(fps / frameStep), 5);
  const ffmpegArgs = [
    "-framerate", String(inputFps),
    "-i", "frame%05d.png",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-tune", "stillimage",
    "-r", String(fps),
    "output.mp4",
  ];

  console.log("[Export] FFmpeg args:", ffmpegArgs.join(" "));
  console.log("[Export] Input fps:", inputFps, "→ Output fps:", fps);

  onProgress({ stage: "encoding", percent: 0, message: "Encoding MP4 (0%)..." });
  const encodeStart = performance.now();

  const exitCode = await ff.exec(ffmpegArgs);
  if (exitCode !== 0) {
    throw new Error(`FFmpeg exited with code ${exitCode}`);
  }

  const encodeDuration = ((performance.now() - encodeStart) / 1000).toFixed(1);
  console.log(`[Export] Encoding completed in ${encodeDuration}s`);

  try {
    const data = await ff.readFile("output.mp4");
    const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
    const totalDuration = ((performance.now() - captureStart) / 1000).toFixed(1);

    console.log("[Export] === DONE ===");
    console.log(`[Export] MP4 size: ${(mp4Blob.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[Export] Total time: ${totalDuration}s (capture: ${captureDuration}s, write: ${((performance.now() - writeStart) / 1000).toFixed(1)}s, encode: ${encodeDuration}s)`);
    console.log(`[Export] Frames: ${pngDataUrls.length}, Input PNG: ${(totalBytes / 1024 / 1024).toFixed(1)}MB -> Output MP4: ${(mp4Blob.size / 1024 / 1024).toFixed(2)}MB`);

    onProgress({ stage: "done", percent: 100, message: "Export complete!" });
    return mp4Blob;
  } catch (error) {
    throw normalizeError(error);
  } finally {
    for (let i = 0; i < pngDataUrls.length; i++) {
      await ff.deleteFile(`frame${String(i).padStart(5, "0")}.png`).catch(() => undefined);
    }

    await ff.deleteFile("output.mp4").catch(() => undefined);
    console.groupEnd();
  }
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
