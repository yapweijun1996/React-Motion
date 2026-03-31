import type { VideoScript } from "../types";

const AUDIO_BUFFER_FRAMES = 15; // 0.5s padding after narration ends
const MIN_SCENE_FRAMES = 90;    // 3s minimum per scene
const CJK_DURATION_MULTIPLIER = 1.5; // CJK text needs longer read time

// CJK Unicode ranges: CJK Unified Ideographs, Hiragana, Katakana, Hangul Syllables
const CJK_REGEX = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;

/** Returns true if the text contains CJK characters */
export function hasCJK(text: string): boolean {
  return CJK_REGEX.test(text);
}

/**
 * Recalculate scene durations and startFrames based on TTS audio lengths.
 * Only extends scenes — never shortens. Scenes without audio keep original timing.
 */
export function adjustSceneTimings(script: VideoScript): VideoScript {
  const { fps } = script;

  const adjustedScenes = script.scenes.map((scene) => {
    const isCJK = scene.narration ? hasCJK(scene.narration) : false;
    let requiredFrames = MIN_SCENE_FRAMES;

    if (scene.ttsAudioDurationMs) {
      // TTS-first: audio length drives duration
      const audioFrames =
        Math.ceil((scene.ttsAudioDurationMs / 1000) * fps) + AUDIO_BUFFER_FRAMES;
      requiredFrames = isCJK
        ? Math.ceil(audioFrames * CJK_DURATION_MULTIPLIER)
        : audioFrames;
    } else if (isCJK) {
      // No TTS but CJK narration text — extend original duration for reading
      requiredFrames = Math.ceil(scene.durationInFrames * CJK_DURATION_MULTIPLIER);
    }

    const newDuration = Math.max(scene.durationInFrames, requiredFrames, MIN_SCENE_FRAMES);

    if (newDuration !== scene.durationInFrames) {
      const reason = scene.ttsAudioDurationMs
        ? `audio: ${scene.ttsAudioDurationMs}ms${isCJK ? ", CJK ×1.5" : ""}`
        : "CJK ×1.5 (no audio)";
      console.log(
        `[Timing] Scene "${scene.id}": ${scene.durationInFrames} → ${newDuration} frames (${reason})`,
      );
    }

    return { ...scene, durationInFrames: newDuration };
  });

  // Recalculate startFrames sequentially
  let currentFrame = 0;
  const resequenced = adjustedScenes.map((scene) => {
    const updated = { ...scene, startFrame: currentFrame };
    currentFrame += updated.durationInFrames;
    return updated;
  });

  const totalDuration = currentFrame;

  if (totalDuration !== script.durationInFrames) {
    console.log(
      `[Timing] Total: ${script.durationInFrames} → ${totalDuration} frames ` +
        `(${(totalDuration / fps).toFixed(1)}s)`,
    );
  }

  return {
    ...script,
    scenes: resequenced,
    durationInFrames: totalDuration,
  };
}
