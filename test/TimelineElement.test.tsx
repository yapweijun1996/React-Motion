// @vitest-environment jsdom
/**
 * TimelineElement unit tests — horizontal and vertical orientations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockFrame = 0;
const mockConfig = { width: 1920, height: 1080, fps: 30, durationInFrames: 300 };

vi.mock("../src/video/VideoContext", () => ({
  useCurrentFrame: () => mockFrame,
  useVideoConfig: () => mockConfig,
}));

import { render } from "@testing-library/react";
import { TimelineElement } from "../src/video/elements/TimelineElement";
import type { SceneElement } from "../src/types";

const ITEMS = [
  { label: "Q1", description: "Launch" },
  { label: "Q2", description: "Growth" },
  { label: "Q3", description: "Pivot" },
  { label: "Q4", description: "Scale" },
];

function makeEl(overrides: Partial<SceneElement> = {}): SceneElement {
  return {
    type: "timeline",
    items: ITEMS,
    activeIndex: 1,
    orientation: "horizontal",
    ...overrides,
  } as SceneElement;
}

describe("TimelineElement", () => {
  beforeEach(() => { mockFrame = 0; });

  it("renders horizontal timeline with SVG nodes", () => {
    mockFrame = 60;
    const { container } = render(<TimelineElement el={makeEl()} index={0} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Should have node circles (4 items + possible glow circles)
    const circles = svg!.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(4);
  });

  it("renders all item labels", () => {
    mockFrame = 60;
    const { container } = render(<TimelineElement el={makeEl()} index={0} />);
    expect(container.textContent).toContain("Q1");
    expect(container.textContent).toContain("Q2");
    expect(container.textContent).toContain("Q3");
    expect(container.textContent).toContain("Q4");
  });

  it("renders descriptions", () => {
    mockFrame = 60;
    const { container } = render(<TimelineElement el={makeEl()} index={0} />);
    expect(container.textContent).toContain("Launch");
    expect(container.textContent).toContain("Growth");
  });

  it("renders vertical orientation", () => {
    mockFrame = 60;
    const { container } = render(<TimelineElement el={makeEl({ orientation: "vertical" })} index={0} />);
    // Vertical doesn't use SVG, uses div-based layout
    expect(container.textContent).toContain("Q1");
    expect(container.textContent).toContain("Q4");
  });

  it("returns null for empty items", () => {
    mockFrame = 60;
    const { container } = render(<TimelineElement el={makeEl({ items: [] })} index={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("handles no activeIndex (all neutral)", () => {
    mockFrame = 60;
    const { container } = render(<TimelineElement el={makeEl({ activeIndex: -1 })} index={0} />);
    // Should render without active styling
    expect(container.textContent).toContain("Q1");
  });

  it("handles single item", () => {
    mockFrame = 60;
    const el = makeEl({ items: [{ label: "Now", description: "Current state" }] });
    const { container } = render(<TimelineElement el={el} index={0} />);
    expect(container.textContent).toContain("Now");
  });
});
