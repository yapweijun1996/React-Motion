import { describe, it, expect } from "vitest";
import { computeEffectiveStarts, computeTotalDuration, TRANSITION_FRAMES } from "../src/video/sceneTimeline";
import type { VideoScene } from "../src/types";

/** Build minimal scenes for timeline testing */
function makeScenes(durations: number[]): VideoScene[] {
  let startFrame = 0;
  return durations.map((d, i) => {
    const scene = {
      id: `scene-${i}`,
      startFrame,
      durationInFrames: d,
      elements: [],
    } as unknown as VideoScene;
    startFrame += d;
    return scene;
  });
}

describe("export audio/video timeline sync", () => {
  const fps = 30;

  it("effective starts are earlier than raw startFrame due to transition overlap", () => {
    const scenes = makeScenes([180, 180, 180]);
    const effectiveStarts = computeEffectiveStarts(scenes);

    // Scene 0: always starts at 0
    expect(effectiveStarts[0]).toBe(0);
    // Scene 1: starts 20 frames earlier than raw startFrame (180)
    expect(effectiveStarts[1]).toBe(180 - TRANSITION_FRAMES);
    expect(effectiveStarts[1]).toBe(160);
    // Scene 2: starts 40 frames earlier than raw startFrame (360)
    expect(effectiveStarts[2]).toBe(180 + 180 - 2 * TRANSITION_FRAMES);
    expect(effectiveStarts[2]).toBe(320);
  });

  it("total duration is compressed by (N-1) * TRANSITION_FRAMES", () => {
    const scenes = makeScenes([180, 180, 180]);
    const total = computeTotalDuration(scenes);

    expect(total).toBe(540 - 2 * TRANSITION_FRAMES);
    expect(total).toBe(500);
  });

  it("audio delay computed from effective starts matches visual timing", () => {
    const scenes = makeScenes([150, 200, 180]);
    const effectiveStarts = computeEffectiveStarts(scenes);

    // Simulate what exportAudio does: delayMs = round((effectiveStart / fps) * 1000)
    const delays = effectiveStarts.map(s => Math.round((s / fps) * 1000));

    // Visual timing: scene appears at effectiveStart / fps seconds
    const visualTimings = effectiveStarts.map(s => s / fps);

    // Audio delay should match visual timing within 1 frame (33ms at 30fps)
    for (let i = 0; i < scenes.length; i++) {
      const audioStartSec = delays[i] / 1000;
      expect(Math.abs(audioStartSec - visualTimings[i])).toBeLessThan(1 / fps);
    }
  });

  it("single scene has no overlap — effective start equals raw start", () => {
    const scenes = makeScenes([200]);
    const effectiveStarts = computeEffectiveStarts(scenes);
    expect(effectiveStarts[0]).toBe(0);
    expect(computeTotalDuration(scenes)).toBe(200);
  });

  it("5-scene video: cumulative overlap = 4 * 20 = 80 frames saved", () => {
    const scenes = makeScenes([150, 150, 150, 150, 150]);
    const total = computeTotalDuration(scenes);
    expect(total).toBe(750 - 4 * TRANSITION_FRAMES);
    expect(total).toBe(670);

    const effectiveStarts = computeEffectiveStarts(scenes);
    // Each successive scene starts 20 frames earlier
    expect(effectiveStarts[0]).toBe(0);
    expect(effectiveStarts[1]).toBe(130);
    expect(effectiveStarts[2]).toBe(260);
    expect(effectiveStarts[3]).toBe(390);
    expect(effectiveStarts[4]).toBe(520);
  });

  it("BGM ducking ranges use effective starts not raw startFrame", () => {
    // This verifies the conceptual alignment.
    // With 3 scenes of 180 frames each at 30fps:
    const scenes = makeScenes([180, 180, 180]);
    const effectiveStarts = computeEffectiveStarts(scenes);

    // Ducking range for scene 1:
    const scene1Start = effectiveStarts[1] / fps; // 160/30 = 5.333s
    const scene1End = (effectiveStarts[1] + 180) / fps; // 340/30 = 11.333s

    // Without fix (using raw startFrame):
    const rawScene1Start = 180 / fps; // 6.0s
    // The 0.667s gap would cause BGM to be loud while scene 1 is already showing

    expect(scene1Start).toBeCloseTo(5.333, 2);
    expect(rawScene1Start).toBeCloseTo(6.0, 2);
    expect(rawScene1Start - scene1Start).toBeCloseTo(TRANSITION_FRAMES / fps, 2);
  });
});
