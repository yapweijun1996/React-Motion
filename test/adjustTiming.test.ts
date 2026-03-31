import { describe, it, expect } from "vitest";
import { adjustSceneTimings, hasCJK } from "../src/services/adjustTiming";
import type { VideoScript, VideoScene } from "../src/types";

function makeScript(scenes: Partial<VideoScene>[]): VideoScript {
  let startFrame = 0;
  const fullScenes: VideoScene[] = scenes.map((s, i) => {
    const scene: VideoScene = {
      id: s.id ?? `scene-${i}`,
      startFrame,
      durationInFrames: s.durationInFrames ?? 150,
      elements: s.elements ?? [{ type: "text" as const }],
      ...s,
    };
    startFrame += scene.durationInFrames;
    return scene;
  });

  return {
    id: "test",
    title: "Test",
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: startFrame,
    scenes: fullScenes,
    narrative: "",
  };
}

describe("adjustSceneTimings", () => {
  it("does not change scenes without audio", () => {
    const script = makeScript([
      { durationInFrames: 100 },
      { durationInFrames: 200 },
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(100);
    expect(adjusted.scenes[1].durationInFrames).toBe(200);
    expect(adjusted.durationInFrames).toBe(300);
  });

  it("extends scene when audio is longer than original duration", () => {
    const script = makeScript([
      { durationInFrames: 100, ttsAudioDurationMs: 5000 }, // 5s = 150 frames + 15 buffer = 165
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(165);
  });

  it("never shortens a scene", () => {
    const script = makeScript([
      { durationInFrames: 300, ttsAudioDurationMs: 1000 }, // 1s = 30 frames + 15 = 45, but original 300 is bigger
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(300);
  });

  it("enforces minimum scene frames (90)", () => {
    const script = makeScript([
      { durationInFrames: 30, ttsAudioDurationMs: 500 }, // 0.5s = 15 frames + 15 = 30, but min is 90
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(90);
  });

  it("recalculates startFrames sequentially", () => {
    const script = makeScript([
      { durationInFrames: 100 },
      { durationInFrames: 100, ttsAudioDurationMs: 5000 }, // extends to 165
      { durationInFrames: 100 },
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].startFrame).toBe(0);
    expect(adjusted.scenes[1].startFrame).toBe(100);
    expect(adjusted.scenes[2].startFrame).toBe(265); // 100 + 165
  });

  it("updates total durationInFrames", () => {
    const script = makeScript([
      { durationInFrames: 100, ttsAudioDurationMs: 10000 }, // 10s = 300 + 15 = 315
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.durationInFrames).toBe(315);
  });

  it("handles empty scenes array", () => {
    const script = makeScript([]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes).toHaveLength(0);
    expect(adjusted.durationInFrames).toBe(0);
  });

  // RM-48: CJK duration tests
  it("extends CJK narration scene by 1.5×", () => {
    const script = makeScript([
      {
        durationInFrames: 100,
        ttsAudioDurationMs: 5000,
        narration: "这是一段中文旁白",
      }, // 5s = 150 + 15 buffer = 165 → ×1.5 = 248
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(248); // ceil(165 * 1.5)
  });

  it("does not apply CJK multiplier to English narration", () => {
    const script = makeScript([
      {
        durationInFrames: 100,
        ttsAudioDurationMs: 5000,
        narration: "This is an English narration",
      },
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(165); // no CJK boost
  });

  it("applies CJK multiplier to Japanese text", () => {
    const script = makeScript([
      {
        durationInFrames: 100,
        ttsAudioDurationMs: 2000,
        narration: "これはテストです",
      }, // 2s = 60 + 15 = 75 → ×1.5 = 113
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(113);
  });

  it("applies CJK multiplier to Korean text", () => {
    const script = makeScript([
      {
        durationInFrames: 100,
        ttsAudioDurationMs: 2000,
        narration: "한국어 테스트",
      }, // 75 → ×1.5 = 113
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(113);
  });

  it("does not apply CJK multiplier when narration is missing", () => {
    const script = makeScript([
      { durationInFrames: 100, ttsAudioDurationMs: 5000 },
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(165);
  });

  it("extends CJK scene without TTS audio (read time only)", () => {
    const script = makeScript([
      { durationInFrames: 100, narration: "这是没有音频的中文场景" },
    ]);
    const adjusted = adjustSceneTimings(script);
    // 100 × 1.5 = 150 (CJK read time extension)
    expect(adjusted.scenes[0].durationInFrames).toBe(150);
  });

  it("does not extend non-CJK scene without TTS audio", () => {
    const script = makeScript([
      { durationInFrames: 100, narration: "English scene without audio" },
    ]);
    const adjusted = adjustSceneTimings(script);
    expect(adjusted.scenes[0].durationInFrames).toBe(100);
  });
});

describe("hasCJK", () => {
  it("detects Chinese characters", () => {
    expect(hasCJK("这是中文")).toBe(true);
  });

  it("detects Japanese hiragana", () => {
    expect(hasCJK("これはテスト")).toBe(true);
  });

  it("detects Korean hangul", () => {
    expect(hasCJK("한국어")).toBe(true);
  });

  it("returns false for English text", () => {
    expect(hasCJK("Hello world")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasCJK("")).toBe(false);
  });

  it("detects CJK in mixed text", () => {
    expect(hasCJK("Hello 世界")).toBe(true);
  });
});
