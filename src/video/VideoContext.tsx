/**
 * Custom video context — drop-in replacement for Remotion's
 * useCurrentFrame() and useVideoConfig().
 *
 * Design:
 * - Two separate contexts: FrameContext (number) and VideoConfigContext (object).
 * - VideoProvider accepts `frame` as a controlled prop — the parent
 *   (player or export loop) owns the frame state and drives updates.
 * - FrameContext can be nested: SceneRenderer wraps each scene in a
 *   <FrameProvider frame={globalFrame - scene.startFrame}> so elements
 *   see local (scene-relative) frame numbers, matching Remotion's
 *   TransitionSeries.Sequence behavior.
 */

import { createContext, useContext, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VideoConfig = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
};

// ---------------------------------------------------------------------------
// Contexts (not exported — consumers use hooks)
// ---------------------------------------------------------------------------

const FrameContext = createContext<number>(0);
const VideoConfigContext = createContext<VideoConfig>({
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 1,
});

// ---------------------------------------------------------------------------
// Hooks — API-compatible with Remotion
// ---------------------------------------------------------------------------

/** Returns the current frame number. Inside a scene, this is scene-local (0-based). */
export function useCurrentFrame(): number {
  return useContext(FrameContext);
}

/** Returns the video configuration (fps, width, height, durationInFrames). */
export function useVideoConfig(): VideoConfig {
  return useContext(VideoConfigContext);
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

type VideoProviderProps = {
  /** Current frame number (controlled by player or export loop) */
  frame: number;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  children: React.ReactNode;
};

/**
 * Top-level provider — wraps the entire composition.
 * Sets both frame and video config contexts.
 */
export function VideoProvider({
  frame,
  fps,
  width,
  height,
  durationInFrames,
  children,
}: VideoProviderProps) {
  const config = useMemo<VideoConfig>(
    () => ({ fps, width, height, durationInFrames }),
    [fps, width, height, durationInFrames],
  );

  return (
    <VideoConfigContext.Provider value={config}>
      <FrameContext.Provider value={frame}>
        {children}
      </FrameContext.Provider>
    </VideoConfigContext.Provider>
  );
}

type FrameProviderProps = {
  /** Frame number to expose to children (typically globalFrame - scene.startFrame) */
  frame: number;
  children: React.ReactNode;
};

/**
 * Nested frame provider — used by SceneRenderer to remap global frames
 * to scene-local frames. Does NOT change VideoConfig.
 *
 * Usage in SceneRenderer:
 *   <FrameProvider frame={globalFrame - scene.startFrame}>
 *     <GenericScene scene={scene} />
 *   </FrameProvider>
 */
export function FrameProvider({ frame, children }: FrameProviderProps) {
  return (
    <FrameContext.Provider value={frame}>
      {children}
    </FrameContext.Provider>
  );
}
