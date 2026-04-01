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

/** BGM volume levels — match ReportComposition preview values */
const BGM_VOLUME_FULL = 0.35;
const BGM_VOLUME_DUCKED = 0.1;

/**
 * Mux TTS audio tracks + optional BGM into the silent output.mp4 already in FFmpeg FS.
 * Uses adelay + amix filters to position each scene's narration at the correct time.
 * BGM gets auto-ducked during narration scenes via volume filter.
 * Video stream is copied (not re-encoded). Audio is encoded as AAC.
 *
 * Returns true if audio was muxed, false if no audio tracks were found.
 */
export async function muxAudioIntoVideo(
  ff: FFmpeg,
  scenes: VideoScene[],
  fps: number,
  bgMusicUrl?: string,
): Promise<boolean> {
  const audioScenes = scenes.filter((s) => s.ttsAudioUrl);
  const hasTTS = audioScenes.length > 0;
  const hasBGM = !!bgMusicUrl;

  if (!hasTTS && !hasBGM) {
    console.log("[ExportAudio] No audio tracks, skipping mux");
    return false;
  }

  console.log(`[ExportAudio] Muxing: ${audioScenes.length} TTS tracks, BGM: ${hasBGM}`);

  // Write each TTS WAV to FFmpeg FS
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

  // Write BGM to FFmpeg FS
  if (hasBGM) {
    try {
      const response = await fetch(bgMusicUrl!);
      const blob = await response.blob();
      const data = await fetchFile(blob);
      await ff.writeFile("bgm.mp3", data);
      console.log("[ExportAudio] Wrote bgm.mp3");
    } catch (err) {
      logWarn("ExportAudio", "BGM_GENERATION_FAILED", "Failed to fetch BGM audio", { error: err });
    }
  }

  const bgmWritten = hasBGM && await fileExists(ff, "bgm.mp3");

  if (entries.length === 0 && !bgmWritten) {
    console.warn("[ExportAudio] No audio files written, skipping mux");
    return false;
  }

  // Build FFmpeg command
  const args = buildMuxArgs(entries, scenes, fps, bgmWritten);
  console.log("[ExportAudio] FFmpeg args:", args.join(" "));

  const exitCode = await ff.exec(args);

  // Clean up audio files
  for (const entry of entries) {
    await ff.deleteFile(entry.filename).catch(() => {
      logWarn("ExportAudio", "UNKNOWN", `Failed to clean up ${entry.filename}`);
    });
  }
  if (bgmWritten) {
    await ff.deleteFile("bgm.mp3").catch(() => {});
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

async function fileExists(ff: FFmpeg, name: string): Promise<boolean> {
  try {
    const data = await ff.readFile(name);
    return (data as Uint8Array).length > 0;
  } catch {
    return false;
  }
}

/**
 * Build FFmpeg args for muxing TTS + optional BGM.
 *
 * BGM auto-ducking: The BGM track gets volume segments — lower during scenes
 * with narration, normal otherwise. This is done via FFmpeg's volume filter
 * with enable expressions based on time ranges.
 */
function buildMuxArgs(
  entries: AudioEntry[],
  scenes: VideoScene[],
  fps: number,
  hasBGM: boolean,
): string[] {
  const args: string[] = ["-i", "output.mp4"];

  // Add TTS audio inputs
  for (const entry of entries) {
    args.push("-i", entry.filename);
  }

  // Add BGM input (always last input)
  const bgmInputIdx = entries.length + 1; // 0=video, 1..N=TTS, N+1=BGM
  if (hasBGM) {
    args.push("-i", "bgm.mp3");
  }

  // --- Build filter_complex ---
  const ttsCount = entries.length;

  if (ttsCount === 0 && hasBGM) {
    // BGM only — simple volume
    args.push(
      "-filter_complex",
      `[${bgmInputIdx}:a]volume=${BGM_VOLUME_FULL}[aout]`,
      "-map", "0:v",
      "-map", "[aout]",
    );
  } else if (ttsCount > 0 && !hasBGM) {
    // TTS only — original logic
    if (ttsCount === 1) {
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
      const filters = entries.map((e, i) => {
        const inputIdx = i + 1;
        return `[${inputIdx}:a]adelay=${e.delayMs}|${e.delayMs},volume=${e.volume}[a${i}]`;
      });
      const mixInputs = entries.map((_, i) => `[a${i}]`).join("");
      const filterStr =
        filters.join(";") +
        `;${mixInputs}amix=inputs=${ttsCount}:duration=longest:normalize=0[aout]`;
      args.push("-filter_complex", filterStr, "-map", "0:v", "-map", "[aout]");
    }
  } else {
    // TTS + BGM — build combined filter with auto-ducking
    const filters: string[] = [];

    // TTS tracks: adelay each
    entries.forEach((e, i) => {
      const inputIdx = i + 1;
      filters.push(`[${inputIdx}:a]adelay=${e.delayMs}|${e.delayMs},volume=${e.volume}[a${i}]`);
    });

    // Mix all TTS into one track
    if (ttsCount === 1) {
      filters.push(`[a0]acopy[tts_mix]`);
    } else {
      const mixInputs = entries.map((_, i) => `[a${i}]`).join("");
      filters.push(`${mixInputs}amix=inputs=${ttsCount}:duration=longest:normalize=0[tts_mix]`);
    }

    // BGM with auto-ducking: build volume enable expressions
    const bgmVolumeFilter = buildBgmDuckingFilter(scenes, fps, bgmInputIdx);
    filters.push(bgmVolumeFilter);

    // Final mix: TTS + BGM
    filters.push(`[tts_mix][bgm_duck]amix=inputs=2:duration=longest:normalize=0[aout]`);

    args.push("-filter_complex", filters.join(";"), "-map", "0:v", "-map", "[aout]");
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

/**
 * Build FFmpeg volume filter for BGM with auto-ducking.
 * Uses time-based volume enable expressions to lower BGM during narration.
 *
 * Example: volume='if(between(t,2,8),0.1,if(between(t,12,18),0.1,0.35))'
 */
function buildBgmDuckingFilter(
  scenes: VideoScene[],
  fps: number,
  bgmInputIdx: number,
): string {
  const narrationRanges = scenes
    .filter((s) => s.ttsAudioUrl)
    .map((s) => {
      const startSec = (s.startFrame / fps).toFixed(3);
      const endSec = ((s.startFrame + s.durationInFrames) / fps).toFixed(3);
      return { startSec, endSec };
    });

  if (narrationRanges.length === 0) {
    return `[${bgmInputIdx}:a]volume=${BGM_VOLUME_FULL}[bgm_duck]`;
  }

  // Build nested if(between(...)) expression
  // Start from innermost (default volume) and wrap with between checks
  let expr = String(BGM_VOLUME_FULL);
  for (const range of narrationRanges.reverse()) {
    expr = `if(between(t\\,${range.startSec}\\,${range.endSec})\\,${BGM_VOLUME_DUCKED}\\,${expr})`;
  }

  return `[${bgmInputIdx}:a]volume='${expr}':eval=frame[bgm_duck]`;
}
