/**
 * Public imperative handle exposed by VideoPlayer and VideoSurface via React ref.
 * Drop-in replacement for the subset of Remotion's PlayerRef that we actually use.
 */
export type PlayerHandle = {
  /** Pause playback (no-op if already paused). */
  pause(): void;
  /** Jump to a specific frame. */
  seekTo(frame: number): void;
  /** Start playback from current frame (no-op if already playing). */
  play(): void;
  /** Returns the current frame number. */
  getCurrentFrame(): number;
  /** Returns true if currently playing. */
  isPlaying(): boolean;
};
