// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExport } from "../src/hooks/useVideoActions";
import type { ExportProgress } from "../src/services/exportVideo";
import type { VideoScript } from "../src/types";

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

const mockExportToMp4 = vi.fn();

vi.mock("../src/services/exportVideo", () => ({
  exportToMp4: (...args: unknown[]) => mockExportToMp4(...args),
  downloadBlob: vi.fn(),
}));

vi.mock("../src/services/exportStore", () => ({
  saveExportRecord: vi.fn(() => Promise.resolve()),
}));

vi.mock("../src/services/errors", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  getUserMessage: (err: unknown) =>
    err instanceof Error ? err.message : String(err),
}));

// ---------------------------------------------------------------------------
// Mock requestAnimationFrame (jsdom doesn't fire rAF callbacks)
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(performance.now());
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeScript: VideoScript = {
  id: "test",
  title: "Test Video",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 300,
  scenes: [],
  narrative: "test",
};

function makeOpts() {
  const progressHistory: (ExportProgress | null)[] = [];
  const showStageHistory: boolean[] = [];

  // Stable refs (persist across renders)
  const playerRef = {
    current: {
      pause: vi.fn(),
      play: vi.fn(),
      seekTo: vi.fn(),
      getCurrentFrame: () => 0,
      isPlaying: () => false,
    },
  };
  const surfaceRef = { current: document.createElement("div") };

  const opts = {
    script: fakeScript,
    exportPlayerRef: playerRef as React.RefObject<any>,
    exportSurfaceRef: surfaceRef as React.RefObject<HTMLDivElement>,
    onProgress: (p: ExportProgress | null) => progressHistory.push(p),
    onShowStage: (v: boolean) => showStageHistory.push(v),
  };

  return { opts, progressHistory, showStageHistory };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useExport", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockExportToMp4.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets error stage on failure and auto-clears after 5s", async () => {
    mockExportToMp4.mockRejectedValue(new Error("FFmpeg crashed"));

    const { opts, progressHistory } = makeOpts();
    const { result } = renderHook(() => useExport(opts));

    await act(async () => {
      await result.current();
    });

    // Error should be in progress history
    const errorEvent = progressHistory.find((p) => p?.stage === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toContain("FFmpeg crashed");

    // Not yet cleared
    const nullCountBefore = progressHistory.filter((p) => p === null).length;

    // Advance 5 seconds → auto-clear fires
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const nullCountAfter = progressHistory.filter((p) => p === null).length;
    expect(nullCountAfter).toBeGreaterThan(nullCountBefore);
  });

  it("auto-clears progress after successful export", async () => {
    const fakeBlob = new Blob(["fake"], { type: "video/mp4" });
    mockExportToMp4.mockResolvedValue(fakeBlob);

    const { opts, progressHistory, showStageHistory } = makeOpts();
    const { result } = renderHook(() => useExport(opts));

    await act(async () => {
      await result.current();
    });

    // Stage should end hidden
    expect(showStageHistory[showStageHistory.length - 1]).toBe(false);

    // Advance 5s → null
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(progressHistory[progressHistory.length - 1]).toBeNull();
  });

  it("onShowStage is always set to false in finally", async () => {
    mockExportToMp4.mockRejectedValue(new Error("boom"));

    const { opts, showStageHistory } = makeOpts();
    const { result } = renderHook(() => useExport(opts));

    await act(async () => {
      await result.current();
    });

    // showStage: true (start) → false (finally)
    expect(showStageHistory).toContain(true);
    expect(showStageHistory[showStageHistory.length - 1]).toBe(false);
  });
});
