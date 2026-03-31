import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { VideoScene } from "../types";
import { logError, logWarn } from "./errors";

type AudioEntry = {
  index: number;
  filename: string;
  delayMs: number;
  volume: number;
};

/**
 * Mux TTS audio tracks into the silent output.mp4 already in FFmpeg FS.
 * Uses adelay + amix filters to position each scene's narration at the correct time.
 * Video stream is copied (not re-encoded). Audio is encoded as AAC.
 *
 * Returns true if audio was muxed, false if no audio tracks were found.
 */
export async function muxAudioIntoVideo(
  ff: FFmpeg,
  scenes: VideoScene[],
  fps: number,
): Promise<boolean> {
  const audioScenes = scenes.filter((s) => s.ttsAudioUrl);

  if (audioScenes.length === 0) {
    console.log("[ExportAudio] No audio tracks, skipping mux");
    return false;
  }

  console.log(`[ExportAudio] Muxing ${audioScenes.length} audio tracks`);

  // Write each WAV to FFmpeg FS
  const entries: AudioEntry[] = [];

  for (let i = 0; i < audioScenes.length; i++) {
    const scene = audioScenes[i];
    const filename = `audio_${i}.wav`;
    const delayMs = Math.round(((scene.startFrame ?? 0) / fps) * 1000);

    try {
      const response = await fetch(scene.ttsAudioUrl!);
      const blob = await response.blob();
      const data = await fetchFile(blob);
      await ff.writeFile(filename, data);

      entries.push({ index: i, filename, delayMs, volume: 1.0 });
      console.log(`[ExportAudio] Wrote ${filename} (delay: ${delayMs}ms)`);
    } catch (err) {
      logWarn("ExportAudio", "TTS_PARTIAL_FAILURE", `Failed to fetch audio for scene "${scene.id}"`, { error: err });
    }
  }

  if (entries.length === 0) {
    console.warn("[ExportAudio] No audio files written, skipping mux");
    return false;
  }

  // Build FFmpeg command
  const args = buildMuxArgs(entries);
  console.log("[ExportAudio] FFmpeg args:", args.join(" "));

  const exitCode = await ff.exec(args);

  // Clean up audio files
  for (const entry of entries) {
    await ff.deleteFile(entry.filename).catch(() => {
      logWarn("ExportAudio", "UNKNOWN", `Failed to clean up ${entry.filename}`);
    });
  }

  if (exitCode !== 0) {
    logError("ExportAudio", "EXPORT_FFMPEG_ENCODE", `FFmpeg mux failed with code ${exitCode}`, { exitCode });
    // Non-fatal: silent video is still usable
    return false;
  }

  // Replace output.mp4 with the muxed version (FFmpeg.wasm has no rename())
  try {
    const muxedData = await ff.readFile("output_with_audio.mp4");
    await ff.deleteFile("output.mp4").catch(() => undefined);
    await ff.writeFile("output.mp4", muxedData);
    await ff.deleteFile("output_with_audio.mp4").catch(() => undefined);
    console.log("[ExportAudio] Audio muxing complete");
    return true;
  } catch (err) {
    logError("ExportAudio", "EXPORT_FFMPEG_ENCODE", err, { step: "readFile output_with_audio.mp4" });
    // Non-fatal: original silent MP4 is still usable
    return false;
  }
}

function buildMuxArgs(entries: AudioEntry[]): string[] {
  const args: string[] = ["-i", "output.mp4"];

  // Add audio inputs
  for (const entry of entries) {
    args.push("-i", entry.filename);
  }

  if (entries.length === 1) {
    // Single audio — simple mux, apply delay if needed
    const e = entries[0];
    if (e.delayMs > 0) {
      args.push(
        "-filter_complex",
        `[1:a]adelay=${e.delayMs}|${e.delayMs}[aout]`,
        "-map", "0:v",
        "-map", "[aout]",
      );
    } else {
      args.push("-map", "0:v", "-map", "1:a");
    }
  } else {
    // Multiple audio — adelay each, then amix
    const filters = entries.map((e, i) => {
      const inputIdx = i + 1; // 0 is video
      return `[${inputIdx}:a]adelay=${e.delayMs}|${e.delayMs},volume=${e.volume}[a${i}]`;
    });

    const mixInputs = entries.map((_, i) => `[a${i}]`).join("");
    const filterStr =
      filters.join(";") +
      `;${mixInputs}amix=inputs=${entries.length}:duration=longest:normalize=0[aout]`;

    args.push("-filter_complex", filterStr, "-map", "0:v", "-map", "[aout]");
  }

  args.push(
    "-c:v", "copy",       // Don't re-encode video
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-shortest",
    "output_with_audio.mp4",
  );

  return args;
}
