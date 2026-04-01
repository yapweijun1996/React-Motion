/**
 * sceneTimeline — pure timeline computation functions for SceneRenderer.
 *
 * Extracted from SceneRenderer.tsx for modularity.
 * All functions are pure (no React dependency, no side effects).
 */

import type { VideoScene } from "../types";

export const TRANSITION_FRAMES = 20;

// ---------------------------------------------------------------------------
// Pure: transition easing
// ---------------------------------------------------------------------------

/** Ease-out cubic — smooth deceleration matching overdamped spring feel. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Compute transition progress (0→1) for a frame within the transition zone.
 * Clamped and eased. Exported for testing.
 */
export function getTransitionProgress(frame: number): number {
  const t = Math.max(0, Math.min(1, frame / TRANSITION_FRAMES));
  return easeOutCubic(t);
}

// ---------------------------------------------------------------------------
// Pure: effective timeline with overlap compression
// ---------------------------------------------------------------------------

/**
 * Compute effective start frames accounting for transition overlap.
 *
 * Without transitions: [0, 150, 330, ...]
 * With transitions:    [0, 130, 290, ...]
 *
 * Each transition shortens total duration by TRANSITION_FRAMES because
 * the exiting and entering scenes overlap during the transition period.
 */
export function computeEffectiveStarts(
  scenes: readonly VideoScene[],
): number[] {
  const starts: number[] = [];
  let cursor = 0;
  for (let i = 0; i < scenes.length; i++) {
    starts.push(cursor);
    cursor += scenes[i].durationInFrames;
    if (i < scenes.length - 1) cursor -= TRANSITION_FRAMES;
  }
  return starts;
}

/**
 * Total rendered duration accounting for transition overlaps.
 * = sum(durationInFrames) - (N-1) * TRANSITION_FRAMES
 */
export function computeTotalDuration(
  scenes: readonly VideoScene[],
): number {
  if (scenes.length === 0) return 0;
  const sum = scenes.reduce((acc, s) => acc + s.durationInFrames, 0);
  return sum - Math.max(0, scenes.length - 1) * TRANSITION_FRAMES;
}

// ---------------------------------------------------------------------------
// Pure: visible scene resolution
// ---------------------------------------------------------------------------

export type VisibleScene = {
  scene: VideoScene;
  sceneIndex: number;
  /** Scene-local frame (0-based) */
  localFrame: number;
  /** Transition progress 0→1 (0 when no transition active) */
  progress: number;
  /** Scene's role during this frame */
  direction: "entering" | "exiting" | "static";
  /** Which transition effect to use (from the entering scene) */
  transitionType: VideoScene["transition"];
};

/**
 * Determine which scenes are visible at a given global frame.
 *
 * Returns 1 scene normally, 2 during a transition period.
 * During transitions the exiting scene is first (lower z), entering second.
 */
export function getVisibleScenes(
  globalFrame: number,
  scenes: readonly VideoScene[],
): VisibleScene[] {
  if (scenes.length === 0) return [];

  const starts = computeEffectiveStarts(scenes);
  const visible: VisibleScene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const start = starts[i];
    const end = start + scenes[i].durationInFrames;

    // Scene not in range for this frame
    if (globalFrame < start || globalFrame >= end) continue;

    const localFrame = globalFrame - start;
    let direction: VisibleScene["direction"] = "static";
    let progress = 0;

    // Entering zone: first TRANSITION_FRAMES of a non-first scene
    if (i > 0 && localFrame < TRANSITION_FRAMES) {
      direction = "entering";
      progress = getTransitionProgress(localFrame);
    }

    // Exiting zone: last TRANSITION_FRAMES of a non-last scene
    const exitStart = scenes[i].durationInFrames - TRANSITION_FRAMES;
    if (i < scenes.length - 1 && localFrame >= exitStart) {
      direction = "exiting";
      progress = getTransitionProgress(localFrame - exitStart);
    }

    // Transition type always comes from the entering scene (Remotion convention).
    // Exiting scene uses the NEXT scene's transition; entering/static use own.
    const transitionType =
      direction === "exiting" && i < scenes.length - 1
        ? scenes[i + 1].transition
        : scenes[i].transition;

    visible.push({
      scene: scenes[i],
      sceneIndex: i,
      localFrame,
      progress,
      direction,
      transitionType,
    });
  }

  return visible;
}
