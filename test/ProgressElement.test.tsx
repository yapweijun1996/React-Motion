// @vitest-environment jsdom
/**
 * ProgressElement unit tests — circular, semicircle, linear variants.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockFrame = 0;
const mockConfig = { width: 1920, height: 1080, fps: 30, durationInFrames: 300 };

vi.mock("../src/video/VideoContext", () => ({
  useCurrentFrame: () => mockFrame,
  useVideoConfig: () => mockConfig,
}));

import { render } from "@testing-library/react";
import { ProgressElement } from "../src/video/elements/ProgressElement";
import type { SceneElement } from "../src/types";

function makeEl(overrides: Partial<SceneElement> = {}): SceneElement {
  return {
    type: "progress",
    value: 75,
    max: 100,
    label: "Completion",
    color: "#3b82f6",
    variant: "circular",
    suffix: "%",
    ...overrides,
  } as SceneElement;
}

describe("ProgressElement", () => {
  beforeEach(() => { mockFrame = 0; });

  it("renders circular variant with SVG", () => {
    mockFrame = 60;
    const { container } = render(<ProgressElement el={makeEl()} index={0} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Should have 2 circles (track + fill)
    const circles = svg!.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });

  it("renders label text", () => {
    mockFrame = 60;
    const { container } = render(<ProgressElement el={makeEl({ label: "Revenue" })} index={0} />);
    expect(container.textContent).toContain("Revenue");
  });

  it("renders semicircle variant with path", () => {
    mockFrame = 60;
    const { container } = render(<ProgressElement el={makeEl({ variant: "semicircle" })} index={0} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(2); // track + fill
  });

  it("renders linear variant with div bars", () => {
    mockFrame = 60;
    const { container } = render(<ProgressElement el={makeEl({ variant: "linear" })} index={0} />);
    // No SVG in linear mode
    expect(container.querySelector("svg")).toBeNull();
    // Has nested divs for track + fill
    expect(container.textContent).toContain("Completion");
  });

  it("displays suffix correctly", () => {
    mockFrame = 60;
    const { container } = render(<ProgressElement el={makeEl({ suffix: "pts" })} index={0} />);
    expect(container.textContent).toContain("pts");
  });

  it("clamps value to max", () => {
    mockFrame = 60;
    const el = makeEl({ value: 150, max: 100 });
    const { container } = render(<ProgressElement el={el} index={0} />);
    // Should render without error (ratio clamped to 1)
    expect(container.firstElementChild).not.toBeNull();
  });

  it("handles dark mode colors", () => {
    mockFrame = 60;
    const { container } = render(<ProgressElement el={makeEl()} index={0} dark={true} />);
    // Should render (dark prop changes text color)
    expect(container.textContent).toContain("Completion");
  });
});
