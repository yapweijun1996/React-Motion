/**
 * SceneRenderer — custom scene sequencer replacing Remotion's TransitionSeries.
 */

import { useRef, useCallback } from "react";
import { WebGLTransitionOverlay } from "./WebGLTransitionOverlay";
import { ErrorBoundary } from "./ErrorBoundary";
import { loadSettings } from "../services/settingsStore";
import type { WebGLTransitionType } from "./transitionShaders";
import type { VideoScene } from "../types";
import { getVisibleScenes } from "./sceneTimeline";
import { getTransitionStyle } from "./transitionStyles";

// Re-export for backward compatibility
export { TRANSITION_FRAMES, getTransitionProgress, computeEffectiveStarts, computeTotalDuration, getVisibleScenes } from "./sceneTimeline";
export type { VisibleScene } from "./sceneTimeline";
export { getTransitionStyle, clockWipePolygon, diamondPolygon, splitPolygon } from "./transitionStyles";

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
        const transStyle =
          v.direction !== "static"
            ? getTransitionStyle(
                useWebGL ? "fade" : v.transitionType,
                v.progress,
                v.direction,
              )
            : {};

        // Split: bg layer stays opaque, content layer fades with transition.
        // Prevents player's black bg from bleeding through during fade transitions.
        const sceneBg = v.scene.bgGradient
          ? { background: v.scene.bgGradient }
          : { backgroundColor: v.scene.bgColor ?? "#ffffff" };
        const { opacity: transOpacity, ...transRest } = transStyle as Record<string, unknown>;
        const hasOpacity = transOpacity !== undefined;

        return (
          <div
            key={v.scene.id}
            ref={setSceneRef(v.scene.id)}
            style={{ ...FILL_STYLE, zIndex, ...sceneBg, ...transRest }}
          >
            <ErrorBoundary level="scene" label={v.scene.title ?? v.scene.id}>
              <div style={hasOpacity ? { ...FILL_STYLE, opacity: transOpacity as number } : FILL_STYLE}>
                {renderScene(v.scene, v.localFrame)}
              </div>
            </ErrorBoundary>
          </div>
        );
      })}

      {/* WebGL overlay */}
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
