// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { VideoProvider } from "../src/video/VideoContext";
import { AudioTrack } from "../src/video/AudioTrack";

// ---------------------------------------------------------------------------
// Mock HTMLAudioElement — jsdom doesn't implement play/pause
// ---------------------------------------------------------------------------

let mockPaused = true;
let mockCurrentTime = 0;
let mockVolume = 1;

const mockPlay = vi.fn(() => {
  mockPaused = false;
  return Promise.resolve();
});
const mockPause = vi.fn(() => {
  mockPaused = true;
});

beforeEach(() => {
  mockPaused = true;
  mockCurrentTime = 0;
  mockVolume = 1;
  mockPlay.mockClear();
  mockPause.mockClear();

  // Patch HTMLAudioElement prototype for all <audio> elements
  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    get: () => mockPaused,
    configurable: true,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    get: () => mockCurrentTime,
    set: (v: number) => { mockCurrentTime = v; },
    configurable: true,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "volume", {
    get: () => mockVolume,
    set: (v: number) => { mockVolume = v; },
    configurable: true,
  });
  HTMLMediaElement.prototype.play = mockPlay;
  HTMLMediaElement.prototype.pause = mockPause;
});

// ---------------------------------------------------------------------------
// Helper: wrap AudioTrack in VideoProvider
// ---------------------------------------------------------------------------

function renderAudioTrack(opts: {
  frame?: number;
  fps?: number;
  playing?: boolean;
  volume?: number;
  src?: string;
}) {
  const {
    frame = 0,
    fps = 30,
    playing = false,
    volume,
    src = "blob:test-audio",
  } = opts;

  return render(
    <VideoProvider
      frame={frame}
      fps={fps}
      width={1920}
      height={1080}
      durationInFrames={300}
      playing={playing}
    >
      <AudioTrack src={src} volume={volume} />
    </VideoProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AudioTrack", () => {
  it("renders a hidden <audio> element with correct src", () => {
    const { container } = renderAudioTrack({ src: "blob:my-audio" });
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio!.getAttribute("src")).toBe("blob:my-audio");
    expect(audio!.getAttribute("preload")).toBe("auto");
  });

  it("calls play() when playing=true", () => {
    renderAudioTrack({ playing: true });
    expect(mockPlay).toHaveBeenCalled();
  });

  it("does not call play() when playing=false", () => {
    renderAudioTrack({ playing: false });
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("calls pause() when playing switches from true to false", () => {
    const { rerender } = render(
      <VideoProvider frame={0} fps={30} width={1920} height={1080} durationInFrames={300} playing={true}>
        <AudioTrack src="blob:test" />
      </VideoProvider>,
    );
    // Now playing — call play
    mockPaused = false;

    rerender(
      <VideoProvider frame={0} fps={30} width={1920} height={1080} durationInFrames={300} playing={false}>
        <AudioTrack src="blob:test" />
      </VideoProvider>,
    );
    expect(mockPause).toHaveBeenCalled();
  });

  it("seeks when drift exceeds threshold", () => {
    // Frame 150 at 30fps = 5.0s desired, currentTime stuck at 0 = drift 5.0s > 0.3s
    mockCurrentTime = 0;
    renderAudioTrack({ frame: 150, fps: 30, playing: true });
    expect(mockCurrentTime).toBeCloseTo(5.0);
  });

  it("does not seek when drift is within threshold", () => {
    // Frame 3 at 30fps = 0.1s desired, currentTime = 0 = drift 0.1s < 0.3s
    mockCurrentTime = 0;
    renderAudioTrack({ frame: 3, fps: 30, playing: true });
    expect(mockCurrentTime).toBe(0); // no seek
  });

  it("sets volume on the audio element", () => {
    renderAudioTrack({ volume: 0.5 });
    expect(mockVolume).toBe(0.5);
  });

  it("clamps volume to 0-1 range", () => {
    renderAudioTrack({ volume: 2 });
    expect(mockVolume).toBe(1);
  });

  it("defaults volume to 1", () => {
    renderAudioTrack({});
    expect(mockVolume).toBe(1);
  });

  it("pauses on unmount", () => {
    mockPaused = false; // simulate playing
    const { unmount } = renderAudioTrack({ playing: true });
    mockPause.mockClear();
    unmount();
    expect(mockPause).toHaveBeenCalled();
  });
});
