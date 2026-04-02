import { describe, it, expect } from "vitest";
import { validateScenePlan } from "../src/services/scenePlanValidator";
import type { ScenePlan, ScenePlanEntry } from "../src/types/scenePlan";

function entry(overrides?: Partial<ScenePlanEntry>): ScenePlanEntry {
  return {
    index: 0,
    purpose: "hook",
    heroElement: "text",
    supportElements: [],
    layout: "column",
    backgroundMode: "dark",
    transition: "fade",
    energy: "medium",
    stagger: "normal",
    rationale: "test",
    ...overrides,
  };
}

function plan(scenes: ScenePlanEntry[]): ScenePlan {
  return {
    visualThesis: "test plan",
    rhythmPattern: "build-build-breathe-climax-resolve",
    scenes,
  };
}

// ============================================================
// validateScenePlan
// ============================================================

describe("validateScenePlan", () => {
  it("1. empty scenes → pass:false", () => {
    const result = validateScenePlan(plan([]));
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("no scenes");
  });

  it("2. 1-scene video → pass:true", () => {
    const result = validateScenePlan(plan([entry()]));
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("3. 3 consecutive same layout → fail", () => {
    const scenes = [
      entry({ index: 0, layout: "column" }),
      entry({ index: 1, layout: "column" }),
      entry({ index: 2, layout: "column", energy: "high", heroElement: "metric", transition: "slide" }),
    ];
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("layout"))).toBe(true);
  });

  it("4. 3 consecutive same hero element → fail", () => {
    const scenes = [
      entry({ index: 0, heroElement: "text", layout: "column", transition: "fade" }),
      entry({ index: 1, heroElement: "text", layout: "row", transition: "slide" }),
      entry({ index: 2, heroElement: "text", layout: "center", transition: "wipe", energy: "high" }),
    ];
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("hero element"))).toBe(true);
  });

  it("5. element diversity: 5+ scenes with <5 types → fail", () => {
    // 5 scenes but only 3 unique element types (text, metric, icon)
    const scenes = Array.from({ length: 5 }, (_, i) =>
      entry({
        index: i,
        heroElement: i % 2 === 0 ? "text" : "metric",
        supportElements: ["icon"],
        layout: (["column", "row", "center"] as const)[i % 3],
        backgroundMode: (["dark", "gradient", "light", "effect", "image"] as const)[i % 5],
        transition: ["fade", "slide", "wipe", "zoom-out", "iris"][i % 5],
        energy: (["low", "medium", "high"] as const)[i % 3],
        stagger: (["tight", "normal"] as const)[i % 2],
      }),
    );
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("unique element types"))).toBe(true);
  });

  it("6. transition diversity: 5+ scenes with <4 types → fail", () => {
    const scenes = Array.from({ length: 5 }, (_, i) =>
      entry({
        index: i,
        heroElement: ["text", "metric", "icon", "bar-chart", "comparison"][i],
        supportElements: ["svg"],
        layout: (["column", "row", "center"] as const)[i % 3],
        backgroundMode: (["dark", "gradient", "light", "effect", "image"] as const)[i % 5],
        transition: i % 2 === 0 ? "fade" : "slide", // only 2 transitions
        energy: (["low", "medium", "high"] as const)[i % 3],
        stagger: (["tight", "normal"] as const)[i % 2],
      }),
    );
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("transition"))).toBe(true);
  });

  it("7. background diversity: 3 consecutive same mode → fail", () => {
    const scenes = [
      entry({ index: 0, backgroundMode: "dark", layout: "column", transition: "fade", heroElement: "text" }),
      entry({ index: 1, backgroundMode: "dark", layout: "row", transition: "slide", heroElement: "metric", energy: "high" }),
      entry({ index: 2, backgroundMode: "dark", layout: "center", transition: "wipe", heroElement: "icon" }),
    ];
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("background mode"))).toBe(true);
  });

  it("8. breathing scene: 5+ scenes with no energy 'low' → fail", () => {
    const scenes = Array.from({ length: 5 }, (_, i) =>
      entry({
        index: i,
        energy: i === 2 ? "high" : "medium", // no "low"
        heroElement: ["text", "metric", "icon", "bar-chart", "comparison"][i],
        supportElements: ["svg"],
        layout: (["column", "row", "center"] as const)[i % 3],
        backgroundMode: (["dark", "gradient", "light", "effect", "image"] as const)[i % 5],
        transition: ["fade", "slide", "wipe", "zoom-out", "iris"][i % 5],
        stagger: (["tight", "normal"] as const)[i % 2],
      }),
    );
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("breathing"))).toBe(true);
  });

  it("9. climax scene: 3+ scenes with no energy 'high' → fail", () => {
    const scenes = [
      entry({ index: 0, energy: "medium", layout: "column", transition: "fade", heroElement: "text" }),
      entry({ index: 1, energy: "low", layout: "row", transition: "slide", heroElement: "metric" }),
      entry({ index: 2, energy: "medium", layout: "center", transition: "wipe", heroElement: "icon" }),
    ];
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("high-energy"))).toBe(true);
  });

  it("10. effect budget: >3 effect scenes → fail", () => {
    const scenes = Array.from({ length: 5 }, (_, i) =>
      entry({
        index: i,
        backgroundMode: "effect",
        heroElement: ["text", "metric", "icon", "bar-chart", "comparison"][i],
        supportElements: ["svg"],
        layout: (["column", "row", "center"] as const)[i % 3],
        transition: ["fade", "slide", "wipe", "zoom-out", "iris"][i % 5],
        energy: (["low", "medium", "high"] as const)[i % 3],
        stagger: (["tight", "normal"] as const)[i % 2],
      }),
    );
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("effect backgrounds"))).toBe(true);
  });

  it("11. gradient/image presence: 5+ scenes all solid → fail", () => {
    const scenes = Array.from({ length: 5 }, (_, i) =>
      entry({
        index: i,
        backgroundMode: (["dark", "light", "accent", "dark", "light"] as const)[i],
        heroElement: ["text", "metric", "icon", "bar-chart", "comparison"][i],
        supportElements: ["svg"],
        layout: (["column", "row", "center"] as const)[i % 3],
        transition: ["fade", "slide", "wipe", "zoom-out", "iris"][i % 5],
        energy: (["low", "medium", "high"] as const)[i % 3],
        stagger: (["tight", "normal"] as const)[i % 2],
      }),
    );
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("solid colors"))).toBe(true);
  });

  it("12. stagger variety: 4+ scenes same stagger → fail", () => {
    const scenes = Array.from({ length: 4 }, (_, i) =>
      entry({
        index: i,
        stagger: "normal", // all same
        heroElement: ["text", "metric", "icon", "bar-chart"][i],
        layout: (["column", "row", "center"] as const)[i % 3],
        backgroundMode: (["dark", "gradient", "light", "image"] as const)[i],
        transition: ["fade", "slide", "wipe", "zoom-out"][i],
        energy: i === 0 ? "high" : "medium",
      }),
    );
    const result = validateScenePlan(plan(scenes));
    expect(result.issues.some((i) => i.includes("stagger"))).toBe(true);
  });

  it("13. a valid 6-scene plan → pass:true", () => {
    const scenes: ScenePlanEntry[] = [
      entry({ index: 0, purpose: "hook", heroElement: "text", layout: "center", backgroundMode: "gradient", transition: "fade", energy: "high", stagger: "tight", supportElements: ["metric", "icon"] }),
      entry({ index: 1, purpose: "context", heroElement: "bar-chart", layout: "column", backgroundMode: "dark", transition: "slide", energy: "medium", stagger: "normal", supportElements: ["text"] }),
      entry({ index: 2, purpose: "breakdown", heroElement: "comparison", layout: "row", backgroundMode: "light", transition: "wipe", energy: "low", stagger: "relaxed", supportElements: ["icon"] }),
      entry({ index: 3, purpose: "deep-dive", heroElement: "timeline", layout: "column", backgroundMode: "image", transition: "zoom-out", energy: "medium", stagger: "normal", supportElements: ["text"] }),
      entry({ index: 4, purpose: "climax", heroElement: "metric", layout: "center", backgroundMode: "effect", transition: "iris", energy: "high", stagger: "dramatic", supportElements: ["kawaii"] }),
      entry({ index: 5, purpose: "close", heroElement: "callout", layout: "row", backgroundMode: "dark", transition: "dissolve", energy: "medium", stagger: "relaxed", supportElements: ["icon"] }),
    ];
    const result = validateScenePlan(plan(scenes));
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
