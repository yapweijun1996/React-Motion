/**
 * Custom video player — drop-in replacement for @remotion/player.
 *
 * Features:
 * - requestAnimationFrame-driven playback at target FPS
 * - Play/pause toggle, seek via progress bar
 * - Time display (current / total)
 * - Responsive: composition scales to fit container width
 * - Imperative ref API (PlayerHandle): pause(), seekTo(), play()
 * - Loop playback
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { VideoProvider } from "./VideoContext";
import type { PlayerHandle } from "./PlayerHandle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VideoPlayerProps = {
  /** The React component to render as the composition */
  component: React.ComponentType<any>;
  /** Props passed to the composition component */
  inputProps: Record<string, unknown>;
  /** Total frames */
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
  /** If true, show playback controls (default true) */
  controls?: boolean;
  /** Container style override */
  style?: React.CSSProperties;
};

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function formatTime(frame: number, fps: number): string {
  const totalSec = Math.floor(frame / fps);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const VideoPlayer = forwardRef<PlayerHandle, VideoPlayerProps>(
  function VideoPlayer(props, ref) {
    const {
      component: Composition,
      inputProps,
      durationInFrames,
      fps,
      compositionWidth,
      compositionHeight,
      controls = true,
      style,
    } = props;

    const [frame, setFrame] = useState(0);
    const [playing, setPlaying] = useState(false);

    // Refs for rAF loop (avoid stale closure)
    const frameRef = useRef(0);
    const playingRef = useRef(false);
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef(0);

    // Container ref for responsive scaling
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [fullscreen, setFullscreen] = useState(false);

    // --- Responsive scaling (works for both normal + fullscreen) ---
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateScale = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        // In fullscreen: fit both width AND height. Normal: fit width only.
        const s = fullscreen
          ? Math.min(w / compositionWidth, h / compositionHeight)
          : Math.min(w / compositionWidth, 1);
        setScale(s);
      };

      updateScale();

      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(updateScale);
      observer.observe(container);
      return () => observer.disconnect();
    }, [compositionWidth, compositionHeight, fullscreen]);

    // --- Fullscreen ---
    const toggleFullscreen = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        el.requestFullscreen();
      }
    }, []);

    useEffect(() => {
      const onFsChange = () => setFullscreen(!!document.fullscreenElement);
      document.addEventListener("fullscreenchange", onFsChange);
      return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    // --- rAF playback loop ---
    const tick = useCallback(
      (now: number) => {
        if (!playingRef.current) return;

        const elapsed = now - lastTimeRef.current;
        const frameDuration = 1000 / fps;

        if (elapsed >= frameDuration) {
          const framesToAdvance = Math.floor(elapsed / frameDuration);
          let nextFrame = frameRef.current + framesToAdvance;

          if (nextFrame >= durationInFrames) {
            // Loop back to start
            nextFrame = 0;
          }

          frameRef.current = nextFrame;
          lastTimeRef.current = now - (elapsed % frameDuration);
          setFrame(nextFrame);
        }

        rafRef.current = requestAnimationFrame(tick);
      },
      [fps, durationInFrames],
    );

    const startPlayback = useCallback(() => {
      if (playingRef.current) return;
      playingRef.current = true;
      setPlaying(true);
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }, [tick]);

    const stopPlayback = useCallback(() => {
      playingRef.current = false;
      setPlaying(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    }, []);

    const seekTo = useCallback(
      (f: number) => {
        const clamped = Math.max(0, Math.min(f, durationInFrames - 1));
        frameRef.current = clamped;
        setFrame(clamped);
      },
      [durationInFrames],
    );

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, []);

    // --- Imperative handle ---
    useImperativeHandle(
      ref,
      () => ({
        pause: stopPlayback,
        play: startPlayback,
        seekTo,
        getCurrentFrame: () => frameRef.current,
        isPlaying: () => playingRef.current,
      }),
      [stopPlayback, startPlayback, seekTo],
    );

    // --- Controls handlers ---
    const handlePlayPause = useCallback(() => {
      if (playingRef.current) {
        stopPlayback();
      } else {
        startPlayback();
      }
    }, [startPlayback, stopPlayback]);

    const handleProgressClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(Math.round(ratio * (durationInFrames - 1)));
      },
      [seekTo, durationInFrames],
    );

    // Keyboard: space/k = play/pause, arrows = seek, f = fullscreen
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === " " || e.key === "k") {
          e.preventDefault();
          handlePlayPause();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          seekTo(frameRef.current + (e.shiftKey ? fps : 1));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          seekTo(frameRef.current - (e.shiftKey ? fps : 1));
        } else if (e.key === "f") {
          e.preventDefault();
          toggleFullscreen();
        }
      },
      [handlePlayPause, seekTo, fps, toggleFullscreen],
    );

    const scaledHeight = compositionHeight * scale;

    // In fullscreen: center the composition. Normal: top-left aligned.
    const compositionStyle: React.CSSProperties = fullscreen
      ? {
          position: "absolute",
          top: "50%",
          left: "50%",
          width: compositionWidth,
          height: compositionHeight,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }
      : {
          position: "absolute",
          top: 0,
          left: 0,
          width: compositionWidth,
          height: compositionHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        };

    return (
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          backgroundColor: "#000",
          ...(fullscreen ? { height: "100%" } : {}),
          ...style,
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Composition viewport */}
        <div style={compositionStyle}>
          <VideoProvider
            frame={frame}
            fps={fps}
            width={compositionWidth}
            height={compositionHeight}
            durationInFrames={durationInFrames}
            playing={playing}
          >
            <Composition {...inputProps} />
          </VideoProvider>
        </div>

        {/* Spacer — sets container height in normal mode (not needed in fullscreen) */}
        {!fullscreen && <div style={{ height: scaledHeight, pointerEvents: "none" }} />}

        {/* Controls bar */}
        {controls && (
          <div style={controlsBarStyle}>
            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              style={btnStyle}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? "⏸" : "▶"}
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
              onClick={toggleFullscreen}
              style={btnStyle}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? "⊡" : "⛶"}
            </button>
          </div>
        )}
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Inline styles for controls (no CSS file dependency)
// ---------------------------------------------------------------------------

const controlsBarStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
  color: "#fff",
  zIndex: 10,
};

const btnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  fontSize: 18,
  cursor: "pointer",
  padding: "2px 6px",
  lineHeight: 1,
};

const progressTrackStyle: React.CSSProperties = {
  flex: 1,
  height: 6,
  backgroundColor: "rgba(255,255,255,0.3)",
  borderRadius: 3,
  cursor: "pointer",
  position: "relative",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  backgroundColor: "#3b82f6",
  borderRadius: 3,
  transition: "width 0.05s linear",
};

const timeStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "monospace",
  whiteSpace: "nowrap",
  minWidth: 80,
  textAlign: "right",
};
