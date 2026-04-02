import { describe, it, expect, vi } from "vitest";
import { checkRhythmGates, checkBackgroundVariety } from "../src/services/agentHooksRhythm";

// Mock agentToolRegistry so checkRhythmGates doesn't depend on shared state
vi.mock("../src/services/agentToolRegistry", () => ({
  getLastScenePlan: () => null,
}));

// ============================================================
// checkRhythmGates
// ============================================================

describe("checkRhythmGates", () => {
  it("1. <3 scenes → empty issues (skip)", () => {
    const scenes = [
      { layout: "column", transition: "fade", elements: [{ type: "text", stagger: "normal" }] },
      { layout: "column", transition: "fade", elements: [{ type: "text", stagger: "normal" }] },
    ];
    expect(checkRhythmGates(scenes)).toHaveLength(0);
  });

  it("2. 3 consecutive same layout → issue", () => {
    const scenes = [
      { layout: "column", transition: "fade", elements: [{ type: "text", stagger: "normal" }] },
      { layout: "column", transition: "slide", elements: [{ type: "text", stagger: "tight" }] },
      { layout: "column", transition: "wipe", elements: [{ type: "text", stagger: "relaxed" }] },
    ];
    const issues = checkRhythmGates(scenes);
    expect(issues.some((i) => i.includes("layout"))).toBe(true);
  });

  it("3. 5+ scenes with 3 consecutive same transition → issue", () => {
    const scenes = [
      { layout: "column", transition: "fade", elements: [{ type: "text", stagger: "normal" }] },
      { layout: "row", transition: "fade", elements: [{ type: "text", stagger: "tight" }] },
      { layout: "center", transition: "fade", elements: [{ type: "text", stagger: "relaxed" }] },
      { layout: "column", transition: "slide", elements: [{ type: "text", stagger: "normal" }] },
      { layout: "row", transition: "wipe", elements: [{ type: "text", stagger: "dramatic" }] },
    ];
    const issues = checkRhythmGates(scenes);
    expect(issues.some((i) => i.includes("transition"))).toBe(true);
  });

  it("4. 4+ scenes with same stagger on all elements → issue", () => {
    const scenes = [
      { layout: "column", transition: "fade", elements: [{ type: "text", stagger: "normal" }, { type: "icon", stagger: "normal" }] },
      { layout: "row", transition: "slide", elements: [{ type: "metric", stagger: "normal" }] },
      { layout: "center", transition: "wipe", elements: [{ type: "bar-chart", stagger: "normal" }] },
      { layout: "column", transition: "zoom-out", elements: [{ type: "text", stagger: "normal" }] },
    ];
    const issues = checkRhythmGates(scenes);
    expect(issues.some((i) => i.includes("stagger"))).toBe(true);
  });
});

// ============================================================
// checkBackgroundVariety
// ============================================================

describe("checkBackgroundVariety", () => {
  it("5. <4 scenes → empty", () => {
    const scenes = [
      { bgEffect: "bokeh", elements: [{ type: "text" }] },
      { bgEffect: "bokeh", elements: [{ type: "text" }] },
      { bgEffect: "bokeh", elements: [{ type: "text" }] },
    ];
    expect(checkBackgroundVariety(scenes)).toHaveLength(0);
  });

  it("6. >3 bgEffect scenes → issue", () => {
    const scenes = [
      { bgEffect: "bokeh", elements: [{ type: "text" }] },
      { bgEffect: "flow", elements: [{ type: "text" }] },
      { bgEffect: "rising", elements: [{ type: "text" }] },
      { bgEffect: "bokeh", elements: [{ type: "text" }] },
      { elements: [{ type: "text" }] },
    ];
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("Too many"))).toBe(true);
  });

  it("7. all same bgEffect → issue", () => {
    const scenes = [
      { bgEffect: "bokeh", elements: [{ type: "text" }] },
      { elements: [{ type: "text" }] },
      { bgEffect: "bokeh", elements: [{ type: "text" }] },
      { elements: [{ type: "text" }] },
    ];
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("repeats"))).toBe(true);
  });

  it("8. chart scene with bgEffect → issue", () => {
    const scenes = [
      { bgEffect: "bokeh", elements: [{ type: "bar-chart", bars: [{ label: "A", value: 10 }] }] },
      { elements: [{ type: "text" }] },
      { bgEffect: "flow", elements: [{ type: "text" }] },
      { elements: [{ type: "text" }] },
    ];
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("Chart-heavy"))).toBe(true);
  });

  it("9. 5+ scenes all plain bgColor → issue", () => {
    const scenes = Array.from({ length: 5 }, (_, i) => ({
      bgColor: i % 2 === 0 ? "#ffffff" : "#1e293b",
      elements: [{ type: "text", content: "data" }],
    }));
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("plain bgColor only"))).toBe(true);
  });
});
