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

import { useRef, useCallback } from "react";
import { WebGLTransitionOverlay } from "./WebGLTransitionOverlay";
import { loadSettings } from "../services/settingsStore";
import type { WebGLTransitionType } from "./transitionShaders";
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
    // --- Original 4 ---

    case "fade":
      return direction === "entering"
        ? { opacity: progress }
        : { opacity: 1 - progress };

    case "slide":
      return direction === "entering"
        ? { transform: `translateX(${(1 - progress) * -100}%)` }
        : { transform: `translateX(${progress * 100}%)` };

    case "wipe":
      return direction === "entering"
        ? { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }
        : {};

    case "clock-wipe":
      return direction === "entering"
        ? { clipPath: clockWipePolygon(progress) }
        : {};

    // --- New 8: Enhanced CSS transitions ---

    case "radial-wipe":
      // Circle expanding from center
      return direction === "entering"
        ? { clipPath: `circle(${progress * 150}% at 50% 50%)` }
        : {};

    case "diamond-wipe":
      // Diamond shape expanding from center
      return direction === "entering"
        ? { clipPath: diamondPolygon(progress) }
        : {};

    case "iris":
      // Rectangle expanding from center
      return direction === "entering"
        ? {
            clipPath: `inset(${(1 - progress) * 50}% ${(1 - progress) * 50}% ${(1 - progress) * 50}% ${(1 - progress) * 50}%)`,
          }
        : {};

    case "zoom-out":
      // Exiting scene shrinks + fades, entering fades in
      return direction === "exiting"
        ? {
            transform: `scale(${1 - progress * 0.3})`,
            opacity: 1 - progress,
          }
        : { opacity: progress };

    case "zoom-blur":
      // Exiting scene zooms + blurs, entering fades in
      return direction === "exiting"
        ? {
            transform: `scale(${1 + progress * 0.2})`,
            opacity: 1 - progress,
            filter: `blur(${progress * 12}px)`,
          }
        : { opacity: progress };

    case "slide-up":
      // New scene pushes up from bottom
      return direction === "entering"
        ? { transform: `translateY(${(1 - progress) * 100}%)` }
        : { transform: `translateY(${progress * -100}%)` };

    case "split":
      // Left and right halves split apart to reveal entering scene
      return direction === "entering"
        ? { clipPath: splitPolygon(progress) }
        : {};

    case "rotate":
      // Exiting rotates + shrinks out, entering fades in
      return direction === "exiting"
        ? {
            transform: `rotate(${progress * 15}deg) scale(${1 - progress * 0.4})`,
            opacity: 1 - progress,
            transformOrigin: "center center",
          }
        : { opacity: progress };

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

/**
 * Generate CSS polygon() for diamond-wipe effect.
 * Diamond expands from center to corners.
 */
export function diamondPolygon(progress: number): string {
  if (progress <= 0) return "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)";
  if (progress >= 1) return "none";
  const d = progress * 55; // % from center
  return `polygon(50% ${50 - d}%, ${50 + d}% 50%, 50% ${50 + d}%, ${50 - d}% 50%)`;
}

/**
 * Generate CSS polygon() for split effect.
 * Vertical split — two halves reveal from center outward.
 */
export function splitPolygon(progress: number): string {
  if (progress <= 0) return "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)";
  if (progress >= 1) return "none";
  const half = progress * 50; // each side opens by this %
  return `polygon(${50 - half}% 0%, ${50 + half}% 0%, ${50 + half}% 100%, ${50 - half}% 100%)`;
}

// ---------------------------------------------------------------------------
// WebGL transition detection
// ---------------------------------------------------------------------------

const WEBGL_TRANSITIONS = new Set<string>(["dissolve", "pixelate"]);

function isWebGLTransition(type: VideoScene["transition"]): type is WebGLTransitionType {
  return !!type && WEBGL_TRANSITIONS.has(type);
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
  const sceneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasEffects = loadSettings().canvasEffects;

  const setSceneRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      sceneRefs.current[id] = el;
    },
    [],
  );

  // Detect if current transition is a WebGL type
  const enteringScene = visible.find((v) => v.direction === "entering");
  const exitingScene = visible.find((v) => v.direction === "exiting");
  const useWebGL =
    canvasEffects &&
    visible.length === 2 &&
    enteringScene &&
    exitingScene &&
    isWebGLTransition(enteringScene.transitionType);

  return (
    <>
      {visible.map((v, zIndex) => {
        // For WebGL transitions: render both scenes normally (CSS fade as fallback)
        // The WebGL overlay will cover them once textures are ready
        const transStyle =
          v.direction !== "static"
            ? getTransitionStyle(
                useWebGL ? "fade" : v.transitionType,
                v.progress,
                v.direction,
              )
            : {};

        return (
          <div
            key={v.scene.id}
            ref={setSceneRef(v.scene.id)}
            style={{ ...FILL_STYLE, zIndex, ...transStyle }}
          >
            {renderScene(v.scene, v.localFrame)}
          </div>
        );
      })}

      {/* WebGL overlay — captures both scene divs, renders shader on top */}
      {useWebGL && enteringScene && exitingScene && (
        <WebGLTransitionOverlay
          sceneAEl={sceneRefs.current[exitingScene.scene.id] ?? null}
          sceneBEl={sceneRefs.current[enteringScene.scene.id] ?? null}
          progress={enteringScene.progress}
          type={enteringScene.transitionType as WebGLTransitionType}
        />
      )}
    </>
  );
};
