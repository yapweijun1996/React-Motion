// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAppState } from "../src/hooks/useAppState";
import type { VideoScript } from "../src/types";

const mockRestoreTTSAudio = vi.fn();
const mockRestoreBGMAudio = vi.fn();
const mockRestoreImageBlobs = vi.fn();

vi.mock("../src/services/cache", () => ({
  loadScript: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../src/services/settingsStore", () => ({
  hasApiKey: vi.fn(() => false),
}));

vi.mock("../src/hooks/useVideoActions", () => ({
  useGenerate: vi.fn(() => vi.fn()),
  useExport: vi.fn(() => vi.fn()),
}));

vi.mock("../src/services/exportPptx", () => ({
  exportToPptx: vi.fn(() => Promise.resolve()),
}));

vi.mock("../src/services/tts", () => ({
  generateSceneTTS: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../src/services/ttsCache", () => ({
  restoreTTSAudio: (...args: unknown[]) => mockRestoreTTSAudio(...args),
  restoreBGMAudio: (...args: unknown[]) => mockRestoreBGMAudio(...args),
}));

vi.mock("../src/services/imageCache", () => ({
  restoreImageBlobs: (...args: unknown[]) => mockRestoreImageBlobs(...args),
}));

vi.mock("../src/services/adjustTiming", () => ({
  adjustSceneTimings: vi.fn((script: VideoScript) => script),
}));

vi.mock("../src/services/errors", () => ({
  logWarn: vi.fn(),
}));

vi.mock("../src/services/costTracker", () => ({
  loadCostFromCache: vi.fn(() => null),
}));

const baseScript: VideoScript = {
  id: "script-1",
  title: "Restored",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 300,
  narrative: "Narrative",
  scenes: [
    {
      id: "scene-1",
      startFrame: 0,
      durationInFrames: 150,
      narration: "Scene narration",
      elements: [{ type: "text", content: "Hello" }],
    },
  ],
};

describe("useAppState.handleRestore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
    mockRestoreTTSAudio.mockImplementation(async (_prefix: string, scenes: typeof baseScript.scenes) => (
      scenes.map((scene) => ({ ...scene, ttsAudioUrl: "blob:tts" }))
    ));
    mockRestoreBGMAudio.mockImplementation(async (_prefix: string, script: VideoScript) => script);
    mockRestoreImageBlobs.mockImplementation(async (_prefix: string, scenes: typeof baseScript.scenes) => scenes);
  });

  it("restores history blobs using the history-{id} prefix", async () => {
    const { result } = renderHook(() => useAppState({}));

    await act(async () => {
      result.current.handleRestore(baseScript, "prompt", [], undefined, undefined, undefined, 7);
    });

    await waitFor(() => {
      expect(mockRestoreTTSAudio).toHaveBeenCalledWith("history-7", expect.any(Array));
      expect(mockRestoreBGMAudio).toHaveBeenCalledWith("history-7", expect.objectContaining({ id: "script-1" }));
      expect(mockRestoreImageBlobs).toHaveBeenCalledWith("history-7", expect.any(Array));
    });
  });

  it("falls back to the cache prefix when restoring non-history content", async () => {
    const { result } = renderHook(() => useAppState({}));

    await act(async () => {
      result.current.handleRestore(baseScript, "prompt", []);
    });

    await waitFor(() => {
      expect(mockRestoreTTSAudio).toHaveBeenCalledWith("cache", expect.any(Array));
      expect(mockRestoreBGMAudio).toHaveBeenCalledWith("cache", expect.objectContaining({ id: "script-1" }));
      expect(mockRestoreImageBlobs).toHaveBeenCalledWith("cache", expect.any(Array));
    });
  });
});
