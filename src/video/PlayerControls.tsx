/**
 * PlayerControls — playback controls bar for VideoPlayer.
 */

import { useCallback } from "react";
import { IconPlay, IconPause, IconMaximize, IconMinimize } from "../components/Icons";
import {
  controlsBarStyle,
  btnStyle,
  progressTrackStyle,
  progressFillStyle,
  timeStyle,
} from "./playerStyles";

function formatTime(frame: number, fps: number): string {
  const totalSec = Math.floor(frame / fps);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

type PlayerControlsProps = {
  playing: boolean;
  frame: number;
  durationInFrames: number;
  fps: number;
  fullscreen: boolean;
  onPlayPause: () => void;
  onSeek: (frame: number) => void;
  onToggleFullscreen: () => void;
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playing,
  frame,
  durationInFrames,
  fps,
  fullscreen,
  onPlayPause,
  onSeek,
  onToggleFullscreen,
}) => {
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(Math.round(ratio * (durationInFrames - 1)));
    },
    [onSeek, durationInFrames],
  );

  return (
    <div style={controlsBarStyle}>
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        style={btnStyle}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
      </button>

      {/* Progress bar */}
      <div
        onClick={handleProgressClick}
        style={progressTrackStyle}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={durationInFrames}
        aria-valuenow={frame}
      >
        <div
          style={{
            ...progressFillStyle,
            width: `${(frame / Math.max(durationInFrames - 1, 1)) * 100}%`,
          }}
        />
      </div>

      {/* Time display */}
      <span style={timeStyle}>
        {formatTime(frame, fps)} / {formatTime(durationInFrames, fps)}
      </span>

      {/* Fullscreen */}
      <button
        onClick={onToggleFullscreen}
        style={btnStyle}
        aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {fullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
      </button>
    </div>
  );
};
