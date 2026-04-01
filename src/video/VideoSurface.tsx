/**
 * Headless video surface for export frame capture.
 *
 * No UI controls, no rAF loop, no audio.
 * Parent drives frame via ref.seekTo(frame), then captures the DOM
 * with html-to-image.
 *
 * Replaces ExportStage's usage of @remotion/player <Player controls={false}>.
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { VideoProvider } from "./VideoContext";
import type { PlayerHandle } from "./PlayerHandle";

type VideoSurfaceProps = {
  /** The React component to render as the composition */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  /** Props passed to the composition component */
  inputProps: Record<string, unknown>;
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
  /** Container style override */
  style?: React.CSSProperties;
};

export const VideoSurface = forwardRef<PlayerHandle, VideoSurfaceProps>(
  function VideoSurface(props, ref) {
    const {
      component: Composition,
      inputProps,
      durationInFrames,
      fps,
      compositionWidth,
      compositionHeight,
      style,
    } = props;

    const [frame, setFrame] = useState(0);
    const frameRef = useRef(0);

    const seekTo = useCallback(
      (f: number) => {
        const clamped = Math.max(0, Math.min(f, durationInFrames - 1));
        frameRef.current = clamped;
        setFrame(clamped);
      },
      [durationInFrames],
    );

    useImperativeHandle(
      ref,
      () => ({
        pause: () => {},
        play: () => {},
        seekTo,
        getCurrentFrame: () => frameRef.current,
        isPlaying: () => false,
      }),
      [seekTo],
    );

    return (
      <div
        style={{
          width: compositionWidth,
          height: compositionHeight,
          overflow: "hidden",
          ...style,
        }}
      >
        <VideoProvider
          frame={frame}
          fps={fps}
          width={compositionWidth}
          height={compositionHeight}
          durationInFrames={durationInFrames}
        >
          <Composition {...inputProps} />
        </VideoProvider>
      </div>
    );
  },
);
