/**
 * WebCodecs streaming video encoder.
 *
 * Provides a StreamingEncoder that accepts frames one at a time during capture,
 * encoding to H.264 via hardware VideoEncoder and muxing into MP4 via mp4-muxer.
 * This avoids storing all frames in memory — each frame is encoded and discarded.
 *
 * Audio muxing is handled separately (FFmpeg.wasm in Phase 1).
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { WEBCODECS_CODEC } from "./webCodecsSupport";

/**
 * Adaptive queue size — scale with available hardware.
 * More cores → GPU can pipeline more frames → larger queue = fewer stalls.
 * Minimum 8 (low-end), max 30 (high-end 16+ core machines).
 */
const MAX_QUEUE_SIZE = Math.min(30, Math.max(8, (navigator.hardwareConcurrency ?? 4) * 2));
/** Insert keyframe every N seconds. */
const KEYFRAME_INTERVAL_SEC = 2;

export type StreamingEncoder = {
  /** Feed one frame (from canvas). Handles backpressure + GPU memory. */
  feedFrame: (canvas: HTMLCanvasElement, frameIndex: number) => Promise<void>;
  /** Flush encoder + finalize MP4. Returns video-only blob. */
  finalize: () => Promise<Blob>;
  /** Clean up on error (safe to call multiple times). */
  close: () => void;
};

/**
 * Create a streaming WebCodecs encoder.
 * Call feedFrame() for each captured frame, then finalize() to get the MP4 blob.
 */
export function createStreamingEncoder(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): StreamingEncoder {
  // H.264 requires even dimensions
  const w = width % 2 === 0 ? width : width - 1;
  const h = height % 2 === 0 ? height : height - 1;

  console.log(`[WebCodecs] Streaming encoder: ${w}x${h} @ ${fps}fps, ${(bitrate / 1_000_000).toFixed(1)}Mbps`);

  // --- mp4-muxer ---
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: w, height: h },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  // --- VideoEncoder ---
  let encodingError: Error | null = null;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encodingError = e; },
  });

  encoder.configure({
    codec: WEBCODECS_CODEC,
    width: w,
    height: h,
    bitrate,
    bitrateMode: "variable",
    hardwareAcceleration: "prefer-hardware",
    framerate: fps,
    latencyMode: "quality",
    avc: { format: "avc" },
  });

  const keyframeEvery = Math.round(fps * KEYFRAME_INTERVAL_SEC);

  const feedFrame = async (canvas: HTMLCanvasElement, frameIndex: number) => {
    if (encodingError) throw encodingError;

    // Backpressure — event-driven wait instead of busy-polling
    if (encoder.encodeQueueSize > MAX_QUEUE_SIZE) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (encoder.encodeQueueSize <= MAX_QUEUE_SIZE) resolve();
          else encoder.addEventListener("dequeue", check, { once: true });
        };
        encoder.addEventListener("dequeue", check, { once: true });
      });
    }

    // Canvas → ImageBitmap → VideoFrame (no PNG encoding!)
    const bitmap = await createImageBitmap(canvas);
    const timestamp = Math.round((frameIndex * 1_000_000) / fps);
    const duration = Math.round(1_000_000 / fps);

    const videoFrame = new VideoFrame(bitmap, { timestamp, duration });
    bitmap.close();

    const keyFrame = frameIndex % keyframeEvery === 0;
    encoder.encode(videoFrame, { keyFrame });
    videoFrame.close(); // CRITICAL: free GPU memory
  };

  const finalize = async (): Promise<Blob> => {
    await encoder.flush();
    if (encoder.state !== "closed") encoder.close();
    if (encodingError) throw encodingError;

    muxer.finalize();
    const sizeKB = (target.buffer.byteLength / 1024).toFixed(0);
    console.log(`[WebCodecs] Finalized MP4: ${sizeKB}KB`);
    return new Blob([target.buffer], { type: "video/mp4" });
  };

  const close = () => {
    if (encoder.state !== "closed") {
      try { encoder.close(); } catch { /* ignore */ }
    }
  };

  return { feedFrame, finalize, close };
}
