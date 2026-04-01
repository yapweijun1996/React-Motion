// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { createRef } from "react";
import { VideoPlayer } from "../src/video/VideoPlayer";
import { VideoSurface } from "../src/video/VideoSurface";
import type { PlayerHandle } from "../src/video/PlayerHandle";

// Minimal composition that just renders a div
const DummyComposition: React.FC<{ script: unknown }> = () => (
  <div data-testid="composition">composition</div>
);

const defaultProps = {
  component: DummyComposition,
  inputProps: { script: {} },
  durationInFrames: 300,
  fps: 30,
  compositionWidth: 1920,
  compositionHeight: 1080,
};

describe("VideoPlayer", () => {
  it("renders composition", () => {
    const { getByTestId } = render(<VideoPlayer {...defaultProps} />);
    expect(getByTestId("composition")).toBeTruthy();
  });

  it("exposes imperative handle via ref", () => {
    const ref = createRef<PlayerHandle>();
    render(<VideoPlayer {...defaultProps} ref={ref} />);

    expect(ref.current).toBeTruthy();
    expect(ref.current!.getCurrentFrame()).toBe(0);
    expect(ref.current!.isPlaying()).toBe(false);
  });

  it("seekTo updates frame", () => {
    const ref = createRef<PlayerHandle>();
    render(<VideoPlayer {...defaultProps} ref={ref} />);

    act(() => {
      ref.current!.seekTo(42);
    });

    expect(ref.current!.getCurrentFrame()).toBe(42);
  });

  it("seekTo clamps to valid range", () => {
    const ref = createRef<PlayerHandle>();
    render(<VideoPlayer {...defaultProps} ref={ref} />);

    act(() => {
      ref.current!.seekTo(-10);
    });
    expect(ref.current!.getCurrentFrame()).toBe(0);

    act(() => {
      ref.current!.seekTo(9999);
    });
    expect(ref.current!.getCurrentFrame()).toBe(299); // durationInFrames - 1
  });

  it("play/pause toggle", () => {
    const ref = createRef<PlayerHandle>();

    // Mock rAF to avoid real animation
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);

    render(<VideoPlayer {...defaultProps} ref={ref} />);

    act(() => {
      ref.current!.play();
    });
    expect(ref.current!.isPlaying()).toBe(true);

    act(() => {
      ref.current!.pause();
    });
    expect(ref.current!.isPlaying()).toBe(false);

    rafSpy.mockRestore();
  });

  it("renders controls when controls=true", () => {
    const { container } = render(<VideoPlayer {...defaultProps} controls={true} />);
    const playBtn = container.querySelector("[aria-label='Play']");
    expect(playBtn).toBeTruthy();
  });

  it("hides controls when controls=false", () => {
    const { container } = render(<VideoPlayer {...defaultProps} controls={false} />);
    const playBtn = container.querySelector("[aria-label='Play']");
    expect(playBtn).toBeFalsy();
  });
});

describe("VideoSurface", () => {
  it("renders composition", () => {
    const { getByTestId } = render(<VideoSurface {...defaultProps} />);
    expect(getByTestId("composition")).toBeTruthy();
  });

  it("exposes seekTo via ref", () => {
    const ref = createRef<PlayerHandle>();
    render(<VideoSurface {...defaultProps} ref={ref} />);

    expect(ref.current).toBeTruthy();
    expect(ref.current!.getCurrentFrame()).toBe(0);

    act(() => {
      ref.current!.seekTo(100);
    });
    expect(ref.current!.getCurrentFrame()).toBe(100);
  });

  it("isPlaying always returns false", () => {
    const ref = createRef<PlayerHandle>();
    render(<VideoSurface {...defaultProps} ref={ref} />);
    expect(ref.current!.isPlaying()).toBe(false);
  });

  it("seekTo clamps to valid range", () => {
    const ref = createRef<PlayerHandle>();
    render(<VideoSurface {...defaultProps} ref={ref} />);

    act(() => {
      ref.current!.seekTo(5000);
    });
    expect(ref.current!.getCurrentFrame()).toBe(299);
  });
});
