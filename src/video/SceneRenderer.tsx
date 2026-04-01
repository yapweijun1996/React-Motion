/**
 * SceneRenderer — custom scene sequencer replacing Remotion's TransitionSeries.
 *
 * Responsibilities:
 * 1. Scene dispatch — determines visible scenes based on global frame
 * 2. Frame remapping — computes scene-local frames for each visible scene
 * 3. CSS transitions — fade / slide / wipe / clock-wipe via inline styles
 *
 * Design:
 * - Framework-agnostic: accepts `frame` as prop (no context dependency)
 * - Uses `renderScene` callback so caller controls what renders inside each scene
 * - All transition styles are inline CSS (html-to-image export compatible)
 * - Pure functions exported for unit testing
 *
 * Integration (after RM-116 batch import migration):
 *   Replace TransitionSeries in ReportComposition with <SceneRenderer>.
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

// ---------------------------------------------------------------------------
// Pure: CSS transition styles
// ---------------------------------------------------------------------------

/**
 * Generate inline CSSProperties for a transition effect.
 *
 * | Transition  | Entering                         | Exiting                      |
 * |-------------|----------------------------------|------------------------------|
 * | fade        | opacity: progress                | opacity: 1 - progress        |
 * | slide       | translateX(-100% → 0)            | translateX(0 → 100%)         |
 * | wipe        | clip-path inset reveals from left | (behind entering, no clip)   |
 * | clock-wipe  | clip-path polygon sweeps from top | (behind entering, no clip)   |
 */
export function getTransitionStyle(
  type: VideoScene["transition"],
  progress: number,
  direction: "entering" | "exiting",
): React.CSSProperties {
  const t = type ?? "fade";

  switch (t) {
    case "fade":
      return direction === "entering"
        ? { opacity: progress }
        : { opacity: 1 - progress };

    case "slide":
      return direction === "entering"
        ? { transform: `translateX(${(1 - progress) * -100}%)` }
        : { transform: `translateX(${progress * 100}%)` };

    case "wipe":
      // Entering: reveal from left (right inset shrinks as progress grows)
      // Exiting: sits behind — no clip needed
      return direction === "entering"
        ? { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }
        : {};

    case "clock-wipe":
      // Entering: circular sweep reveals content
      // Exiting: sits behind — no clip needed
      return direction === "entering"
        ? { clipPath: clockWipePolygon(progress) }
        : {};

    default:
      return direction === "entering"
        ? { opacity: progress }
        : { opacity: 1 - progress };
  }
}

/**
 * Generate CSS polygon() for clock-wipe effect.
 * Sweeps clockwise from 12 o'clock position.
 * Uses enough points (~24) for a visually smooth arc.
 */
export function clockWipePolygon(progress: number): string {
  if (progress <= 0) return "polygon(50% 50%, 50% 50%)";
  if (progress >= 1) return "none"; // fully visible

  const angle = progress * 360;
  const cx = 50;
  const cy = 50;
  // Radius in percentage — 75% exceeds the diagonal from center to corner
  // (max diagonal = √(50²+50²) ≈ 70.7%)
  const r = 75;

  const pts: string[] = [`${cx}% ${cy}%`, `${cx}% ${cy - r}%`];

  // One point every 15° for smooth arc
  const steps = Math.max(2, Math.ceil(angle / 15));
  for (let i = 1; i <= steps; i++) {
    const deg = Math.min((i / steps) * angle, angle);
    // -90° offset: start from 12 o'clock (top center)
    const rad = ((deg - 90) * Math.PI) / 180;
    const px = cx + r * Math.cos(rad);
    const py = cy + r * Math.sin(rad);
    pts.push(`${px.toFixed(2)}% ${py.toFixed(2)}%`);
  }

  return `polygon(${pts.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FILL_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
};

type SceneRendererProps = {
  /** Current global frame number (controlled by parent) */
  frame: number;
  /** Scenes to sequence */
  scenes: readonly VideoScene[];
  /** Render callback — receives scene and its local frame (0-based) */
  renderScene: (scene: VideoScene, localFrame: number) => React.ReactNode;
};

/**
 * Scene sequencer component.
 *
 * Replaces Remotion's TransitionSeries:
 * - Sequences scenes by durationInFrames with overlap compression
 * - Applies CSS transition effects (fade/slide/wipe/clock-wipe)
 * - Renders 1 scene normally, 2 during transition overlap
 *
 * Usage:
 *   <SceneRenderer
 *     frame={currentFrame}
 *     scenes={script.scenes}
 *     renderScene={(scene, localFrame) => (
 *       <FrameProvider frame={localFrame}>
 *         <GenericScene scene={scene} primaryColor={primaryColor} />
 *       </FrameProvider>
 *     )}
 *   />
 */
export const SceneRenderer: React.FC<SceneRendererProps> = ({
  frame,
  scenes,
  renderScene,
}) => {
  const visible = getVisibleScenes(frame, scenes);

  return (
    <>
      {visible.map((v, zIndex) => {
        const transStyle =
          v.direction !== "static"
            ? getTransitionStyle(v.transitionType, v.progress, v.direction)
            : {};

        return (
          <div
            key={v.scene.id}
            style={{ ...FILL_STYLE, zIndex, ...transStyle }}
          >
            {renderScene(v.scene, v.localFrame)}
          </div>
        );
      })}
    </>
  );
};
