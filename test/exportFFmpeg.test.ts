// @vitest-environment jsdom
/**
 * RM-97b — FFmpeg multi-thread downgrade validation.
 *
 * Tests canUseMultithreadCore() detection and getFFmpeg() MT→ST fallback.
 * Uses vitest mocks — no real FFmpeg or WASM loaded.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @ffmpeg/ffmpeg — fake FFmpeg class
// ---------------------------------------------------------------------------

const mockLoad = vi.fn();
const mockExec = vi.fn(() => 0);
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockTerminate = vi.fn();

function createMockFFmpeg() {
  return {
    loaded: false,
    load: mockLoad,
    exec: mockExec,
    on: mockOn,
    off: mockOff,
    terminate: mockTerminate,
    writeFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
  };
}

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: vi.fn(() => createMockFFmpeg()),
}));

vi.mock("@ffmpeg/util", () => ({
  toBlobURL: vi.fn((_url: string, _type: string) => Promise.resolve("blob:mock")),
  fetchFile: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
}));

// Mock Vite ?url imports (they resolve to strings)
vi.mock("../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url", () => ({
  default: "/mock/ffmpeg-core.js",
}));
vi.mock("../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url", () => ({
  default: "/mock/ffmpeg-core.wasm",
}));

vi.mock("../src/services/errors", () => ({
  ClassifiedError: class extends Error {
    code: string;
    constructor(code: string, msg: string) { super(msg); this.code = code; }
  },
  normalizeError: (e: unknown) => e instanceof Error ? e : new Error(String(e)),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("../src/services/metrics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("../src/services/settingsStore", () => ({
  loadSettings: () => ({ exportQuality: "draft" }),
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks are set up
// ---------------------------------------------------------------------------

import {
  canUseMultithreadCore,
  getFFmpeg,
  _resetFFmpegForTest,
  _isMultiThread,
} from "../src/services/exportVideo";
import { logWarn } from "../src/services/errors";

// ---------------------------------------------------------------------------
// Helpers to control browser globals
// ---------------------------------------------------------------------------

const originalSAB = globalThis.SharedArrayBuffer;

function setSABAvailable(available: boolean) {
  if (available) {
    // @ts-expect-error — restoring global
    globalThis.SharedArrayBuffer = originalSAB ?? ArrayBuffer;
  } else {
    // @ts-expect-error — removing global
    delete globalThis.SharedArrayBuffer;
  }
}

function setCrossOriginIsolated(value: boolean) {
  Object.defineProperty(window, "crossOriginIsolated", {
    value,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("canUseMultithreadCore", () => {
  afterEach(() => {
    // Restore globals
    setSABAvailable(true);
    setCrossOriginIsolated(false);
  });

  it("returns false when SharedArrayBuffer is undefined", () => {
    setSABAvailable(false);
    setCrossOriginIsolated(true);
    expect(canUseMultithreadCore()).toBe(false);
  });

  it("returns false when crossOriginIsolated is false", () => {
    setSABAvailable(true);
    setCrossOriginIsolated(false);
    expect(canUseMultithreadCore()).toBe(false);
  });

  it("returns true when both SAB and crossOriginIsolated are available", () => {
    setSABAvailable(true);
    setCrossOriginIsolated(true);
    expect(canUseMultithreadCore()).toBe(true);
  });
});

describe("getFFmpeg MT→ST fallback", () => {
  beforeEach(() => {
    _resetFFmpegForTest();
    mockLoad.mockReset();
    mockTerminate.mockReset();
    mockOn.mockReset();
    mockOff.mockReset();
    vi.mocked(logWarn).mockClear();
  });

  afterEach(() => {
    _resetFFmpegForTest();
    setSABAvailable(true);
    setCrossOriginIsolated(false);
  });

  it("goes directly to single-thread when SAB unavailable", async () => {
    setSABAvailable(false);
    setCrossOriginIsolated(false);

    // ST load succeeds
    mockLoad.mockResolvedValue(undefined);

    const ff = await getFFmpeg(() => {});
    expect(ff).toBeDefined();
    expect(_isMultiThread()).toBe(false);

    // load() called exactly once (ST only, no MT attempt)
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it("falls back to ST when MT load throws", async () => {
    setSABAvailable(true);
    setCrossOriginIsolated(true);

    // First call (MT) → fail, second call (ST) → succeed
    mockLoad
      .mockRejectedValueOnce(new Error("pthread worker failed"))
      .mockResolvedValueOnce(undefined);

    const ff = await getFFmpeg(() => {});
    expect(ff).toBeDefined();
    expect(_isMultiThread()).toBe(false);

    // load() called twice: MT attempt + ST fallback
    expect(mockLoad).toHaveBeenCalledTimes(2);

    // logWarn called for MT failure
    expect(logWarn).toHaveBeenCalledWith(
      "Export",
      "EXPORT_FFMPEG_LOAD",
      expect.stringContaining("Multi-thread load failed"),
      expect.any(Object),
    );

    // MT instance was terminated during cleanup
    expect(mockTerminate).toHaveBeenCalled();
  });

  it("throws when both MT and ST fail", async () => {
    setSABAvailable(true);
    setCrossOriginIsolated(true);

    mockLoad
      .mockRejectedValueOnce(new Error("MT failed"))
      .mockRejectedValueOnce(new Error("ST also failed"));

    await expect(getFFmpeg(() => {})).rejects.toThrow();
    expect(mockLoad).toHaveBeenCalledTimes(2);
  });

  it("loads MT successfully when environment supports it", async () => {
    setSABAvailable(true);
    setCrossOriginIsolated(true);

    mockLoad.mockResolvedValue(undefined);

    const ff = await getFFmpeg(() => {});
    expect(ff).toBeDefined();
    expect(_isMultiThread()).toBe(true);

    // Only one load call (MT succeeded, no ST needed)
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
