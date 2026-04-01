// @vitest-environment jsdom
/**
 * ComparisonElement unit tests — left/right cards + VS divider.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockFrame = 0;
const mockConfig = { width: 1920, height: 1080, fps: 30, durationInFrames: 300 };

vi.mock("../src/video/VideoContext", () => ({
  useCurrentFrame: () => mockFrame,
  useVideoConfig: () => mockConfig,
}));

import { render } from "@testing-library/react";
import { ComparisonElement } from "../src/video/elements/ComparisonElement";
import type { SceneElement } from "../src/types";

function makeEl(overrides: Partial<SceneElement> = {}): SceneElement {
  return {
    type: "comparison",
    left: { title: "Before", value: "$2.1M", subtitle: "Manual", color: "#ef4444" },
    right: { title: "After", value: "$4.2M", subtitle: "Automated", color: "#22c55e" },
    label: "VS",
    ...overrides,
  } as SceneElement;
}

describe("ComparisonElement", () => {
  beforeEach(() => { mockFrame = 0; });

  it("renders both card titles", () => {
    mockFrame = 60;
    const { container } = render(<ComparisonElement el={makeEl()} index={0} />);
    expect(container.textContent).toContain("Before");
    expect(container.textContent).toContain("After");
  });

  it("renders VS label", () => {
    mockFrame = 60;
    const { container } = render(<ComparisonElement el={makeEl()} index={0} />);
    expect(container.textContent).toContain("VS");
  });

  it("renders custom label", () => {
    mockFrame = 60;
    const { container } = render(<ComparisonElement el={makeEl({ label: "→" })} index={0} />);
    expect(container.textContent).toContain("→");
  });

  it("renders values", () => {
    mockFrame = 60;
    const { container } = render(<ComparisonElement el={makeEl()} index={0} />);
    expect(container.textContent).toContain("$2.1M");
    expect(container.textContent).toContain("$4.2M");
  });

  it("renders subtitles", () => {
    mockFrame = 60;
    const { container } = render(<ComparisonElement el={makeEl()} index={0} />);
    expect(container.textContent).toContain("Manual");
    expect(container.textContent).toContain("Automated");
  });

  it("renders bullet items", () => {
    mockFrame = 60;
    const el = makeEl({
      left: { title: "A", items: ["Fast", "Cheap"] },
      right: { title: "B", items: ["Slow", "Expensive"] },
    });
    const { container } = render(<ComparisonElement el={el} index={0} />);
    expect(container.textContent).toContain("Fast");
    expect(container.textContent).toContain("Expensive");
  });

  it("handles dark mode", () => {
    mockFrame = 60;
    const { container } = render(<ComparisonElement el={makeEl()} index={0} dark={true} />);
    expect(container.textContent).toContain("Before");
  });

  it("handles missing optional fields", () => {
    mockFrame = 60;
    const el = makeEl({
      left: { title: "Plan A" },
      right: { title: "Plan B" },
    });
    const { container } = render(<ComparisonElement el={el} index={0} />);
    expect(container.textContent).toContain("Plan A");
    expect(container.textContent).toContain("Plan B");
  });
});
