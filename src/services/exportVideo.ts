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
  // --- Step 1: Capture screen via getDisplayMedia ---
  onProgress({ stage: "recording", percent: 0, message: "Please allow screen recording..." });

  let displayStream: MediaStream;
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        // @ts-expect-error — preferCurrentTab is a Chrome hint
        preferCurrentTab: true,
        frameRate: 30,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  } catch {
    throw new Error("Screen recording permission denied");
  }

  console.log("[Export] Display stream tracks:", displayStream.getTracks().map((t) => `${t.kind}:${t.readyState}`));

  // --- Step 2: Route through Canvas (sample project pattern) ---
  onProgress({ stage: "recording", percent: 1, message: "Recording video..." });

  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;

  const videoEl = document.createElement("video");
  videoEl.srcObject = displayStream;
  videoEl.muted = true;
  await videoEl.play();

  // Draw display stream to canvas via requestAnimationFrame
  let drawing = true;
  function drawFrame() {
    if (!drawing) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(drawFrame);
  }
  drawFrame();

  // Capture canvas stream
  const canvasStream = canvas.captureStream(30);
  console.log("[Export] Canvas stream ready, tracks:", canvasStream.getTracks().length);

  // --- Step 3: Record canvas stream with MediaRecorder ---
  const webmBlob = await recordStream(canvasStream, durationMs, (pct) => {
    onProgress({ stage: "recording", percent: pct, message: `Recording... ${pct}%` });
  });

  // Cleanup recording
  drawing = false;
  displayStream.getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null;

  console.log("[Export] WebM recorded:", (webmBlob.size / 1024 / 1024).toFixed(2), "MB");

  // --- Step 4: Convert WebM to MP4 ---
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
    console.log("[Export] MediaRecorder mimeType:", mimeType);

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    } catch {
      console.warn("[Export] Fallback to default MediaRecorder");
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      console.log("[Export] Recording stopped, chunks:", chunks.length);
      resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };

    recorder.onerror = (event) => {
      console.error("[Export] MediaRecorder error:", event);
      reject(new Error("MediaRecorder error"));
    };

    // Handle user stopping screen share
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      console.log("[Export] Stream ended by user");
      if (recorder.state === "recording") {
        recorder.requestData(); // flush remaining data
        recorder.stop();
      }
    });

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 99);
      onProgress(pct);
    }, 500);

    recorder.start(1000);
    console.log("[Export] Recording started for", durationMs, "ms");

    setTimeout(() => {
      clearInterval(interval);
      if (recorder.state === "recording") {
        recorder.requestData(); // flush before stop — prevents data loss
        recorder.stop();
      }
    }, durationMs + 1000);
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
  return "";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
