import { toPng } from "html-to-image";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { PlayerRef } from "@remotion/player";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(
  onProgress: (progress: number) => void,
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    console.log("[Export] FFmpeg already loaded, reusing");
    ffmpeg.on("progress", ({ progress }) => onProgress(progress));
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => onProgress(progress));
  ffmpeg.on("log", ({ message }) => {
    console.log("[FFmpeg]", message);
  });

  console.log("[Export] Loading FFmpeg.wasm (single-thread)...");
  console.log("[Export] SharedArrayBuffer available:", typeof SharedArrayBuffer !== "undefined");
  console.log("[Export] hardwareConcurrency:", navigator.hardwareConcurrency);

  const t0 = performance.now();
  await ffmpeg.load();
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
  playerContainer: HTMLElement,
  totalFrames: number,
  fps: number,
  onProgress: (p: ExportProgress) => void,
): Promise<Blob> {
  const width = 1280;
  const height = 720;

  console.group("[Export] exportToMp4");
  console.log("[Export] Config:", { totalFrames, fps, width, height });
  console.log("[Export] Browser:", navigator.userAgent);

  // --- Step 1: Find capture target ---
  const compositionEl = playerContainer.querySelector(
    ".__remotion-player > div:first-child > .__remotion-player"
  ) as HTMLElement | null;

  const captureTarget = compositionEl ?? playerContainer;
  console.log("[Export] Capture target:", compositionEl ? "composition only (no controls)" : "FULL PLAYER (controls included!)");
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

  await ff.exec(ffmpegArgs);

  const encodeDuration = ((performance.now() - encodeStart) / 1000).toFixed(1);
  console.log(`[Export] Encoding completed in ${encodeDuration}s`);

  const data = await ff.readFile("output.mp4");
  const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });

  // Cleanup
  for (let i = 0; i < pngDataUrls.length; i++) {
    await ff.deleteFile(`frame${String(i).padStart(5, "0")}.png`);
  }
  await ff.deleteFile("output.mp4");

  const totalDuration = ((performance.now() - captureStart) / 1000).toFixed(1);
  console.log(`[Export] === DONE ===`);
  console.log(`[Export] MP4 size: ${(mp4Blob.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[Export] Total time: ${totalDuration}s (capture: ${captureDuration}s, write: ${((performance.now() - writeStart) / 1000).toFixed(1)}s, encode: ${encodeDuration}s)`);
  console.log(`[Export] Frames: ${pngDataUrls.length}, Input PNG: ${(totalBytes / 1024 / 1024).toFixed(1)}MB → Output MP4: ${(mp4Blob.size / 1024 / 1024).toFixed(2)}MB`);
  console.groupEnd();

  onProgress({ stage: "done", percent: 100, message: "Export complete!" });
  return mp4Blob;
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
