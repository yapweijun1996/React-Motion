import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  console.log("[Export] Loading FFmpeg.wasm...");
  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    console.log(`[Export] FFmpeg progress: ${(progress * 100).toFixed(0)}%`);
  });

  await ffmpeg.load();
  console.log("[Export] FFmpeg.wasm loaded");
  return ffmpeg;
}

export type ExportProgress = {
  stage: "recording" | "converting" | "done" | "error";
  percent: number;
  message: string;
};

export async function exportToMp4(
  durationMs: number,
  onProgress: (p: ExportProgress) => void,
): Promise<Blob> {
  // --- Step 1: Capture current tab via getDisplayMedia ---
  onProgress({ stage: "recording", percent: 0, message: "Please allow screen recording..." });

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        // @ts-expect-error — preferCurrentTab is a Chrome hint
        preferCurrentTab: true,
        frameRate: 30,
        width: 1280,
        height: 720,
      },
      audio: false,
    });
  } catch {
    throw new Error("Screen recording permission denied");
  }

  onProgress({ stage: "recording", percent: 1, message: "Recording video..." });

  // --- Step 2: Record as WebM ---
  const webmBlob = await recordStream(stream, durationMs, (pct) => {
    onProgress({ stage: "recording", percent: pct, message: `Recording... ${pct}%` });
  });

  // Stop all tracks
  stream.getTracks().forEach((t) => t.stop());

  console.log("[Export] WebM recorded:", (webmBlob.size / 1024 / 1024).toFixed(2), "MB");

  // --- Step 3: Convert WebM to MP4 ---
  onProgress({ stage: "converting", percent: 0, message: "Loading FFmpeg..." });

  const ff = await getFFmpeg();

  onProgress({ stage: "converting", percent: 20, message: "Converting to MP4..." });

  await ff.writeFile("input.webm", await fetchFile(webmBlob));

  await ff.exec([
    "-i", "input.webm",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-movflags", "+faststart",
    "-pix_fmt", "yuv420p",
    "output.mp4",
  ]);

  onProgress({ stage: "converting", percent: 90, message: "Finalizing..." });

  const data = await ff.readFile("output.mp4");
  const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });

  await ff.deleteFile("input.webm");
  await ff.deleteFile("output.mp4");

  console.log("[Export] MP4 ready:", (mp4Blob.size / 1024 / 1024).toFixed(2), "MB");
  onProgress({ stage: "done", percent: 100, message: "Export complete!" });

  return mp4Blob;
}

function recordStream(
  stream: MediaStream,
  durationMs: number,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    const mimeType = getSupportedMimeType();

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };

    recorder.onerror = () => reject(new Error("MediaRecorder error"));

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 99);
      onProgress(pct);
    }, 500);

    recorder.start(100);

    setTimeout(() => {
      clearInterval(interval);
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, durationMs + 500);
  });
}

function getSupportedMimeType(): string {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
