import { describe, it, expect } from "vitest";
import { runStopChecks } from "../src/services/agentHooks";

/** Helper: build a minimal script that passes all checks */
function goodScript(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    title: "Test",
    scenes: [
      {
        id: "s1",
        narration: "Did you know that 5.4 million incidents happened last year?",
        transition: "fade",
        elements: [
          { type: "text", content: "Hook" },
          { type: "metric", items: [{ value: "5.4M", label: "Incidents" }] },
          { type: "icon", name: "alert-triangle" },
        ],
      },
      {
        id: "s2",
        narration: "Here's the breakdown by sector.",
        transition: "slide",
        elements: [
          { type: "bar-chart", bars: [] },
          { type: "kawaii", character: "astronaut", mood: "shocked" },
        ],
      },
      {
        id: "s3",
        narration: "You should prioritize healthcare security immediately.",
        transition: "radial-wipe",
        elements: [
          { type: "callout", title: "Action", content: "Focus on healthcare" },
        ],
      },
    ],
    ...overrides,
  };
}

describe("runStopChecks", () => {
  it("passes a well-structured script", () => {
    const result = runStopChecks(goodScript());
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns empty scenes issue", () => {
    const result = runStopChecks({ scenes: [] });
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain("No scenes");
  });

  // Hook test
  it("flags missing hook — no question or number in scene 1", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration = "Welcome to the quarterly report overview.";
    const result = runStopChecks(script);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.includes("hook"))).toBe(true);
  });

  it("passes hook with question mark", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration = "What if we told you the market shifted?";
    expect(runStopChecks(script).issues.some((i) => i.includes("hook"))).toBe(false);
  });

  it("passes hook with leading number", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration = "4.9 million dollars lost every single day.";
    expect(runStopChecks(script).issues.some((i) => i.includes("hook"))).toBe(false);
  });

  // Action close test
  it("flags missing call-to-action in last scene", () => {
    const script = goodScript();
    const scenes = script.scenes as Record<string, unknown>[];
    scenes[scenes.length - 1].narration = "Thank you for watching this presentation.";
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("call-to-action"))).toBe(true);
  });

  it("passes action close with action word", () => {
    const script = goodScript();
    const scenes = script.scenes as Record<string, unknown>[];
    scenes[scenes.length - 1].narration = "Teams should implement these changes by Friday.";
    expect(runStopChecks(script).issues.some((i) => i.includes("call-to-action"))).toBe(false);
  });

  // Element diversity
  it("flags low element diversity (< 3 types)", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[]).forEach((s) => {
      s.elements = [{ type: "text", content: "only text" }];
    });
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("element type"))).toBe(true);
  });

  // Transition diversity
  it("flags same transition on all scenes (> 2 scenes)", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[]).forEach((s) => {
      s.transition = "fade";
    });
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("transition"))).toBe(true);
  });

  it("skips transition check for <= 2 scenes", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[]).splice(2); // keep only 2 scenes
    (script.scenes as Record<string, unknown>[]).forEach((s) => { s.transition = "fade"; });
    // Fix: last scene still needs action close
    (script.scenes as Record<string, unknown>[])[1].narration = "You must act now.";
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("transition"))).toBe(false);
  });

  // Visual personality
  it("flags no personality elements", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[]).forEach((s) => {
      s.elements = [{ type: "text", content: "data" }, { type: "bar-chart", bars: [] }, { type: "metric", items: [] }];
    });
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("personality"))).toBe(true);
  });

  // Multiple issues accumulate
  it("accumulates multiple issues", () => {
    const script = {
      scenes: [
        { narration: "Overview.", elements: [{ type: "text" }], transition: "fade" },
        { narration: "Data.", elements: [{ type: "text" }], transition: "fade" },
        { narration: "Thanks.", elements: [{ type: "text" }], transition: "fade" },
      ],
    };
    const result = runStopChecks(script);
    expect(result.pass).toBe(false);
    // Should have: hook, action close, element diversity, transition diversity, personality
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
  });
});
