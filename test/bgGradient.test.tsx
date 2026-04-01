// @vitest-environment jsdom
/**
 * bgGradient tests — GenericScene gradient background support + isDarkBg.
 */
import { describe, it, expect, vi } from "vitest";

// Mock VideoContext
vi.mock("../src/video/VideoContext", () => ({
  useCurrentFrame: () => 30,
  useVideoConfig: () => ({ width: 1920, height: 1080, fps: 30, durationInFrames: 300 }),
}));

// Mock settingsStore
vi.mock("../src/services/settingsStore", () => ({
  loadSettings: () => ({ canvasEffects: false }),
}));

// Mock lottie-web (needs canvas which jsdom doesn't support)
vi.mock("lottie-web", () => ({
  default: { loadAnimation: () => ({ destroy: () => {}, goToAndStop: () => {} }) },
}));

// Mock roughjs (needs canvas + generator)
vi.mock("roughjs", () => ({
  default: { generator: () => ({ path: () => ({ d: "", stroke: "", strokeWidth: 1, fill: "" }) }) },
}));

import { isDarkBg } from "../src/video/GenericScene";
import { render } from "@testing-library/react";
import { GenericScene } from "../src/video/GenericScene";
import type { VideoScene } from "../src/types";

function makeScene(overrides: Partial<VideoScene> = {}): VideoScene {
  return {
    id: "s1",
    startFrame: 0,
    durationInFrames: 150,
    elements: [{ type: "text", content: "Hello" }],
    ...overrides,
  } as VideoScene;
}

describe("isDarkBg", () => {
  it("detects dark hex colors", () => {
    expect(isDarkBg("#000000")).toBe(true);
    expect(isDarkBg("#0f172a")).toBe(true);
    expect(isDarkBg("#1e293b")).toBe(true);
  });

  it("detects light hex colors", () => {
    expect(isDarkBg("#ffffff")).toBe(false);
    expect(isDarkBg("#f8fafc")).toBe(false);
    expect(isDarkBg("#fefce8")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDarkBg(undefined)).toBe(false);
  });

  it("returns false for short/invalid hex", () => {
    expect(isDarkBg("#fff")).toBe(false);
    expect(isDarkBg("red")).toBe(false);
  });
});

describe("GenericScene gradient background", () => {
  it("applies bgGradient as background CSS property", () => {
    const scene = makeScene({ bgGradient: "linear-gradient(135deg, #0f172a, #1e3a5f)" });
    const { container } = render(<GenericScene scene={scene} />);
    const fill = container.firstElementChild as HTMLElement;
    // jsdom normalizes hex→rgb inside gradient
    expect(fill.style.background).toContain("linear-gradient");
    expect(fill.style.background).toContain("135deg");
  });

  it("bgGradient prevents bgColor from being set", () => {
    const scene = makeScene({
      bgColor: "#ffffff",
      bgGradient: "linear-gradient(180deg, #0f172a, #1e293b)",
    });
    const { container } = render(<GenericScene scene={scene} />);
    const fill = container.firstElementChild as HTMLElement;
    expect(fill.style.background).toContain("linear-gradient");
  });

  it("renders without error when only bgColor is set", () => {
    const scene = makeScene({ bgColor: "#f0f0f0" });
    const { container } = render(<GenericScene scene={scene} />);
    expect(container.textContent).toContain("Hello");
  });

  it("renders without error when neither bgColor nor bgGradient set", () => {
    const scene = makeScene({});
    const { container } = render(<GenericScene scene={scene} />);
    expect(container.textContent).toContain("Hello");
  });

  it("radial-gradient works", () => {
    const scene = makeScene({ bgGradient: "radial-gradient(circle, #1e3a5f, #0f172a)" });
    const { container } = render(<GenericScene scene={scene} />);
    const fill = container.firstElementChild as HTMLElement;
    expect(fill.style.background).toContain("radial-gradient");
  });
});
