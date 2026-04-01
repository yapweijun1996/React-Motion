// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock heavy deps BEFORE any imports that touch GenericScene
// vi.mock factories are hoisted — cannot reference outer variables
vi.mock("lottie-web", () => ({ default: { loadAnimation: () => ({}) } }));
vi.mock("react-kawaii", () => {
  const D = () => null;
  return {
    Astronaut: D, Backpack: D, Browser: D, Cat: D, Chocolate: D, CreditCard: D,
    Cyborg: D, File: D, Folder: D, Ghost: D, HumanCat: D, HumanDinosaur: D,
    IceCream: D, Mug: D, Planet: D, SpeechBubble: D,
  };
});
vi.mock("roughjs", () => {
  const shape = () => ({ line: () => {}, rectangle: () => {}, circle: () => {}, ellipse: () => {}, arc: () => {}, polygon: () => {}, path: () => {} });
  return { default: { canvas: shape, generator: shape } };
});

// Mock settingsStore so we can control canvasEffects per test
import * as settingsModule from "../src/services/settingsStore";
vi.mock("../src/services/settingsStore", async (importOriginal) => {
  const actual = await importOriginal<typeof settingsModule>();
  return { ...actual };
});

import { render } from "@testing-library/react";
import { VideoProvider } from "../src/video/VideoContext";
import { ParticleBg } from "../src/video/ParticleBg";
import { GenericScene } from "../src/video/GenericScene";
import type { VideoScene } from "../src/types";

// Mock canvas 2D context — jsdom has no real canvas
function createMockCtx() {
  const gradientObj = { addColorStop: vi.fn() };
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    globalAlpha: 1,
    fillStyle: "" as string | object,
    createRadialGradient: vi.fn(() => gradientObj),
    _gradient: gradientObj,
  };
}

let mockCtx = createMockCtx();

beforeEach(() => {
  vi.restoreAllMocks();
  mockCtx = createMockCtx();

  // Patch HTMLCanvasElement.getContext to return our mock
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
});

function withVideo(ui: React.ReactElement, frame = 30) {
  return (
    <VideoProvider frame={frame} fps={30} width={1920} height={1080} durationInFrames={300}>
      {ui}
    </VideoProvider>
  );
}

describe("ParticleBg (Bokeh)", () => {
  it("renders a canvas element with correct dimensions", () => {
    const { container } = render(withVideo(<ParticleBg />));
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(canvas!.width).toBe(1920);
    expect(canvas!.height).toBe(1080);
  });

  it("draws bokeh orbs using radial gradients", () => {
    render(withVideo(<ParticleBg />));
    // 20 orbs, each creates a radial gradient + arc + fill
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    // Each gradient should have color stops
    expect(mockCtx._gradient.addColorStop).toHaveBeenCalled();
  });

  it("is deterministic — same frame produces same draw calls", () => {
    render(withVideo(<ParticleBg />, 60));
    const firstArcCalls = mockCtx.arc.mock.calls.map((c) => [...c]);

    mockCtx.arc.mockClear();
    render(withVideo(<ParticleBg />, 60));
    const secondArcCalls = mockCtx.arc.mock.calls.map((c) => [...c]);

    expect(firstArcCalls).toEqual(secondArcCalls);
  });

  it("applies fade-in — frame 0 draws nothing", () => {
    render(withVideo(<ParticleBg />, 0));
    // At frame 0, fadeIn = 0, so clearRect runs but no orbs drawn
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    expect(mockCtx.arc).not.toHaveBeenCalled();
  });

  it("has pointer-events:none so DOM content is clickable", () => {
    const { container } = render(withVideo(<ParticleBg />));
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas.style.pointerEvents).toBe("none");
    expect(canvas.style.position).toBe("absolute");
  });

  it("resolves bright color on dark backgrounds", () => {
    render(withVideo(<ParticleBg bgColor="#0f172a" />));
    // On dark bg, should use light blue (#93c5fd → rgb "147,197,253")
    const gradCalls = mockCtx._gradient.addColorStop.mock.calls;
    const hasLightBlue = gradCalls.some(
      (c: [number, string]) => typeof c[1] === "string" && c[1].includes("147,197,253"),
    );
    expect(hasLightBlue).toBe(true);
  });

  it("resolves color from bgGradient before bgColor", () => {
    // bgGradient has dark first color (#0f172a), bgColor is light (#ffffff)
    // Should use bright particle color from gradient, not from bgColor
    render(withVideo(<ParticleBg bgColor="#ffffff" bgGradient="linear-gradient(135deg, #0f172a, #1e3a5f)" />));
    const gradCalls = mockCtx._gradient.addColorStop.mock.calls;
    const hasLightBlue = gradCalls.some(
      (c: [number, string]) => typeof c[1] === "string" && c[1].includes("147,197,253"),
    );
    expect(hasLightBlue).toBe(true);
  });

  it("resolves deeper color on light gradient", () => {
    render(withVideo(<ParticleBg bgGradient="linear-gradient(135deg, #f8fafc, #e2e8f0)" />));
    const gradCalls = mockCtx._gradient.addColorStop.mock.calls;
    // Light bg → deeper blue (#3b82f6 → rgb "59,130,246")
    const hasDeeperBlue = gradCalls.some(
      (c: [number, string]) => typeof c[1] === "string" && c[1].includes("59,130,246"),
    );
    expect(hasDeeperBlue).toBe(true);
  });

  it("renders with explicit effect prop (flow)", () => {
    render(withVideo(<ParticleBg effect="flow" />));
    // Flow effect also draws arcs and fills
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
  });

  it("renders with explicit effect prop (rising)", () => {
    render(withVideo(<ParticleBg effect="rising" />));
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
  });
});

describe("GenericScene + canvasEffects setting", () => {
  const baseScene: VideoScene = {
    id: "test-scene",
    startFrame: 0,
    durationInFrames: 150,
    bgColor: "#1e293b",
    elements: [{ type: "text", content: "Hello", role: "title" }],
  };

  const settingsOn = {
    geminiApiKey: "",
    geminiModel: "gemini-2.0-flash" as const,
    ttsConcurrency: 1,
    exportQuality: "standard" as const,
    canvasEffects: true,
  };

  const settingsOff = { ...settingsOn, canvasEffects: false };

  it("does NOT render ParticleBg when canvasEffects is false (default)", () => {
    vi.spyOn(settingsModule, "loadSettings").mockReturnValue(settingsOff);
    const { container } = render(withVideo(<GenericScene scene={baseScene} />));
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("does NOT render ParticleBg when canvasEffects=true but scene has no bgEffect", () => {
    vi.spyOn(settingsModule, "loadSettings").mockReturnValue(settingsOn);
    const { container } = render(withVideo(<GenericScene scene={baseScene} />));
    // No bgEffect set → no canvas rendered even with canvasEffects ON
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders ParticleBg when canvasEffects=true AND scene has bgEffect", () => {
    vi.spyOn(settingsModule, "loadSettings").mockReturnValue(settingsOn);
    const sceneWithEffect: VideoScene = { ...baseScene, bgEffect: "bokeh" };
    const { container } = render(withVideo(<GenericScene scene={sceneWithEffect} />));
    expect(container.querySelector("canvas")).toBeTruthy();
  });
});
