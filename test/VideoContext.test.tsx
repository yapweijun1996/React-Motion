// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  VideoProvider,
  FrameProvider,
  useCurrentFrame,
  useVideoConfig,
} from "../src/video/VideoContext";

describe("useCurrentFrame", () => {
  it("returns the frame value from VideoProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VideoProvider frame={42} fps={30} width={1920} height={1080} durationInFrames={300}>
        {children}
      </VideoProvider>
    );

    const { result } = renderHook(() => useCurrentFrame(), { wrapper });
    expect(result.current).toBe(42);
  });

  it("returns 0 as default when no provider is present", () => {
    const { result } = renderHook(() => useCurrentFrame());
    expect(result.current).toBe(0);
  });

  it("returns scene-local frame when nested in FrameProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VideoProvider frame={200} fps={30} width={1920} height={1080} durationInFrames={600}>
        <FrameProvider frame={50}>
          {children}
        </FrameProvider>
      </VideoProvider>
    );

    const { result } = renderHook(() => useCurrentFrame(), { wrapper });
    // FrameProvider overrides the frame to scene-local value
    expect(result.current).toBe(50);
  });
});

describe("useVideoConfig", () => {
  it("returns video config from VideoProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VideoProvider frame={0} fps={30} width={1920} height={1080} durationInFrames={450}>
        {children}
      </VideoProvider>
    );

    const { result } = renderHook(() => useVideoConfig(), { wrapper });
    expect(result.current).toEqual({
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 450,
    });
  });

  it("returns default config when no provider is present", () => {
    const { result } = renderHook(() => useVideoConfig());
    expect(result.current).toEqual({
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 1,
    });
  });

  it("VideoConfig is NOT affected by nested FrameProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VideoProvider frame={200} fps={24} width={1280} height={720} durationInFrames={600}>
        <FrameProvider frame={50}>
          {children}
        </FrameProvider>
      </VideoProvider>
    );

    const { result } = renderHook(() => useVideoConfig(), { wrapper });
    // FrameProvider only changes frame, not config
    expect(result.current).toEqual({
      fps: 24,
      width: 1280,
      height: 720,
      durationInFrames: 600,
    });
  });
});

describe("FrameProvider nesting", () => {
  it("innermost FrameProvider wins", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VideoProvider frame={100} fps={30} width={1920} height={1080} durationInFrames={600}>
        <FrameProvider frame={50}>
          <FrameProvider frame={10}>
            {children}
          </FrameProvider>
        </FrameProvider>
      </VideoProvider>
    );

    const { result } = renderHook(() => useCurrentFrame(), { wrapper });
    expect(result.current).toBe(10);
  });
});
