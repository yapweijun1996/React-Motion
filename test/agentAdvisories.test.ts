import { describe, it, expect } from "vitest";
import { checkAdvisories } from "../src/services/agentAdvisories";

describe("checkAdvisories", () => {
  it("1. no tools called → returns draft_storyboard advisory", () => {
    const called = new Set<string>();
    const given = new Set<string>();
    const result = checkAdvisories(called, given);
    expect(result).not.toBeNull();
    expect(result!.tool).toBe("draft_storyboard");
  });

  it("2. only storyboard called → returns plan_visual_rhythm advisory", () => {
    const called = new Set(["draft_storyboard"]);
    const given = new Set<string>();
    const result = checkAdvisories(called, given);
    expect(result).not.toBeNull();
    expect(result!.tool).toBe("plan_visual_rhythm");
  });

  it("3. storyboard + plan called → returns direct_visuals advisory", () => {
    const called = new Set(["draft_storyboard", "plan_visual_rhythm"]);
    const given = new Set<string>();
    const result = checkAdvisories(called, given);
    expect(result).not.toBeNull();
    expect(result!.tool).toBe("direct_visuals");
  });

  it("4. all three called → returns null", () => {
    const called = new Set(["draft_storyboard", "plan_visual_rhythm", "direct_visuals"]);
    const given = new Set<string>();
    const result = checkAdvisories(called, given);
    expect(result).toBeNull();
  });

  it("5. advisory already given → skips it", () => {
    const called = new Set<string>();
    // draft_storyboard advisory was already given, so it should skip to plan_visual_rhythm
    const given = new Set(["draft_storyboard"]);
    const result = checkAdvisories(called, given);
    expect(result).not.toBeNull();
    expect(result!.tool).toBe("plan_visual_rhythm");
  });
});
