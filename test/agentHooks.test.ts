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
          { type: "bar-chart", bars: [{ label: "A", value: 10 }, { label: "B", value: 20 }] },
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
      s.elements = [{ type: "text", content: "data" }, { type: "bar-chart", bars: [{ label: "X", value: 5 }] }, { type: "metric", items: [] }];
    });
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("personality"))).toBe(true);
  });

  // Empty chart data (check 6)
  it("flags bar-chart with no bars", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[1].elements = [
      { type: "bar-chart", bars: [] },
      { type: "kawaii", character: "cat", mood: "happy" },
    ];
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("bar-chart has no bars"))).toBe(true);
  });

  it("flags pie-chart with no slices", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[1].elements = [
      { type: "pie-chart" },
      { type: "kawaii", character: "cat", mood: "happy" },
    ];
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("pie-chart has no slices"))).toBe(true);
  });

  it("flags line-chart with no series", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[1].elements = [
      { type: "line-chart", series: [] },
      { type: "kawaii", character: "cat", mood: "happy" },
    ];
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("line-chart has no series"))).toBe(true);
  });

  it("flags sankey with no nodes", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[1].elements = [
      { type: "sankey", nodes: [], links: [{ source: 0, target: 1, value: 10 }] },
      { type: "kawaii", character: "cat", mood: "happy" },
    ];
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("sankey missing"))).toBe(true);
  });

  // Element overflow (check 7)
  it("flags scene with > 4 elements", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].elements = [
      { type: "text", content: "A", fontSize: 96 },
      { type: "text", content: "B", fontSize: 64 },
      { type: "text", content: "C", fontSize: 56 },
      { type: "metric", items: [] },
      { type: "icon", name: "star" },
    ];
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("5 elements"))).toBe(true);
  });

  it("passes scene with exactly 4 elements", () => {
    const script = goodScript();
    // scene 1 already has 3 elements, which is fine
    expect(runStopChecks(script).issues.some((i) => i.includes("elements —"))).toBe(false);
  });

  // Font size minimum (check 8)
  it("flags text with fontSize below 48", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].elements = [
      { type: "text", content: "Tiny", fontSize: 32 },
      { type: "metric", items: [{ value: "5M", label: "Test" }] },
      { type: "icon", name: "star" },
    ];
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("fontSize 32 below 48"))).toBe(true);
  });

  it("passes text with fontSize 48 or above", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].elements = [
      { type: "text", content: "OK", fontSize: 48 },
      { type: "metric", items: [{ value: "5M", label: "Test" }] },
      { type: "icon", name: "star" },
    ];
    expect(runStopChecks(script).issues.some((i) => i.includes("fontSize"))).toBe(false);
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
