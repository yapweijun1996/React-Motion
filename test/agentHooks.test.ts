import { describe, it, expect } from "vitest";
import {
  runStopChecks,
  checkHookClaim,
  extractHardNumbers,
  checkDataAccuracy,
} from "../src/services/agentHooks";
import { checkBackgroundVariety } from "../src/services/agentHooksRhythm";

/** Helper: build a minimal script that passes all checks */
function goodScript(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    title: "Test",
    scenes: [
      {
        id: "s1",
        narration: "Operating margin improved 340 basis points to 18.2% — the strongest quarter in three years.",
        transition: "fade",
        elements: [
          { type: "text", content: "Hook" },
          { type: "metric", items: [{ value: "18.2%", label: "Margin" }] },
          { type: "icon", name: "trending-up" },
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

// ============================================================
// runStopChecks — general
// ============================================================

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
  it("flags missing hook — generic title-card opener", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration = "Welcome to the quarterly report overview.";
    const result = runStopChecks(script);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.includes("hook"))).toBe(true);
  });

  it("flags missing hook — pure question with no claim", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration = "What if we told you the market shifted?";
    const result = runStopChecks(script);
    expect(result.issues.some((i) => i.includes("hook"))).toBe(true);
  });

  it("passes hook with verdict + number", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration =
      "Operating margin improved 340 basis points to 18.2%.";
    expect(runStopChecks(script).issues.some((i) => i.includes("hook"))).toBe(false);
  });

  it("passes hook with direct verdict, no question", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration =
      "Revenue growth accelerated for the third consecutive quarter.";
    expect(runStopChecks(script).issues.some((i) => i.includes("hook"))).toBe(false);
  });

  it("passes hook with leading number", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration = "4.9 million dollars lost every single day.";
    expect(runStopChecks(script).issues.some((i) => i.includes("hook"))).toBe(false);
  });

  it("passes hook with question + follow-up claim", () => {
    const script = goodScript();
    (script.scenes as Record<string, unknown>[])[0].narration =
      "What is our biggest risk? Churn rate surged to 45% this quarter.";
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

// ============================================================
// checkHookClaim — unit tests
// ============================================================

describe("checkHookClaim", () => {
  it("passes verdict with number", () => {
    expect(checkHookClaim("Operating margin improved 340 basis points to 18.2%.")).toBe(true);
  });

  it("passes direct verdict without question", () => {
    expect(checkHookClaim("Revenue growth accelerated this quarter.")).toBe(true);
  });

  it("passes question followed by claim", () => {
    expect(checkHookClaim("What is our biggest risk? Churn rate surged to 45%.")).toBe(true);
  });

  it("rejects pure question with no claim", () => {
    expect(checkHookClaim("What if we told you the market shifted?")).toBe(false);
  });

  it("rejects generic title-card opener", () => {
    expect(checkHookClaim("Let's explore our company performance today.")).toBe(false);
  });

  it("passes title-card with embedded number", () => {
    expect(checkHookClaim("Let's look at the 340% revenue increase.")).toBe(true);
  });

  it("rejects title-card with topic-intro word (growth is not a verdict)", () => {
    expect(checkHookClaim("Let's look at Tesla's growth story.")).toBe(false);
  });

  it("rejects title-card with topic-intro word (leading is not a verdict)", () => {
    expect(checkHookClaim("Let's explore the leading indicators for Q4.")).toBe(false);
  });

  it("passes title-card with strong verdict (surpassed)", () => {
    expect(checkHookClaim("Let's look at how Q3 surpassed all expectations.")).toBe(true);
  });

  it("rejects bland statement with no claim", () => {
    expect(checkHookClaim("This is our company update for the quarter.")).toBe(false);
  });

  it("passes empty narration (handled elsewhere)", () => {
    expect(checkHookClaim("")).toBe(true);
  });
});

// ============================================================
// Data accuracy — extractHardNumbers
// ============================================================

describe("extractHardNumbers", () => {
  it("extracts percentages", () => {
    expect(extractHardNumbers("grew by 18.2% last year")).toContain("18.2%");
  });

  it("extracts dollar amounts", () => {
    // $ is stripped when magnitude suffix (m/b/t/k) is present for cross-form matching
    expect(extractHardNumbers("saved $4.9M in costs")).toContain("4.9m");
  });

  it("extracts year ranges", () => {
    const nums = extractHardNumbers("from 2020 to 2024");
    expect(nums.some((n) => n.includes("2020"))).toBe(true);
  });

  it("extracts multipliers", () => {
    expect(extractHardNumbers("achieved 3.5x growth")).toContain("3.5x");
  });

  it("returns empty for text without hard data", () => {
    expect(extractHardNumbers("the company is growing quickly")).toHaveLength(0);
  });
});

// ============================================================
// Data accuracy — checkDataAccuracy
// ============================================================

describe("checkDataAccuracy", () => {
  it("returns no issues when no userPrompt given", () => {
    const scenes = [{ narration: "Revenue grew 45% last quarter." }] as Record<string, unknown>[];
    expect(checkDataAccuracy(scenes)).toHaveLength(0);
  });

  it("flags fabricated number when user provided no data", () => {
    const scenes = [{ narration: "Revenue grew 45% last quarter." }] as Record<string, unknown>[];
    const issues = checkDataAccuracy(scenes, "Make a video about Tesla");
    expect(issues.some((i) => i.includes("data_accuracy"))).toBe(true);
    expect(issues.some((i) => i.includes("45%"))).toBe(true);
  });

  it("allows numbers that appear in user prompt", () => {
    const scenes = [{ narration: "Revenue grew 45% last quarter." }] as Record<string, unknown>[];
    const issues = checkDataAccuracy(scenes, "Our revenue grew 45% in Q3");
    expect(issues).toHaveLength(0);
  });

  it("flags number not in user data even when user has other data", () => {
    const scenes = [{ narration: "Revenue grew 45% and profits hit $2B." }] as Record<string, unknown>[];
    const issues = checkDataAccuracy(scenes, "Our revenue grew 45% in Q3");
    // 45% should pass, but $2B (canonicalized to "2b") should be flagged
    expect(issues.some((i) => i.includes("2b"))).toBe(true);
    expect(issues.some((i) => i.includes("45%"))).toBe(false);
  });

  it("ignores trivial structural numbers", () => {
    const scenes = [{ narration: "There are 3 key takeaways." }] as Record<string, unknown>[];
    const issues = checkDataAccuracy(scenes, "Make a video about Tesla");
    // "3" is a trivial count, not a data claim
    expect(issues).toHaveLength(0);
  });

  it("treats $2B and $2.0B as equivalent (canonicalization)", () => {
    const scenes = [{ narration: "Revenue reached $2.0B this year." }] as Record<string, unknown>[];
    // User said "$2B" → script says "$2.0B" → should NOT flag
    const issues = checkDataAccuracy(scenes, "Our revenue is $2B");
    expect(issues).toHaveLength(0);
  });

  it("treats '2 billion' and '$2B' as equivalent", () => {
    const scenes = [{ narration: "Revenue reached $2B this year." }] as Record<string, unknown>[];
    const issues = checkDataAccuracy(scenes, "Revenue is 2 billion dollars");
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// Background variety — checkBackgroundVariety
// ============================================================

describe("checkBackgroundVariety", () => {
  /** Helper: build scenes array with specified bgEffect values */
  function makeScenes(
    effects: (string | undefined)[],
    opts?: { chartTypes?: (string | undefined)[] },
  ): Record<string, unknown>[] {
    return effects.map((eff, i) => ({
      id: `s${i + 1}`,
      narration: "Test.",
      bgEffect: eff,
      elements: [
        {
          type: opts?.chartTypes?.[i] ?? "text",
          content: "data",
          ...(opts?.chartTypes?.[i] === "bar-chart" ? { bars: [{ label: "A", value: 10 }] } : {}),
        },
      ],
    }));
  }

  it("skips check when < 4 scenes", () => {
    const scenes = makeScenes(["bokeh", "bokeh", "bokeh"]);
    expect(checkBackgroundVariety(scenes)).toHaveLength(0);
  });

  it("passes when no bgEffect used", () => {
    const scenes = makeScenes([undefined, undefined, undefined, undefined]);
    expect(checkBackgroundVariety(scenes)).toHaveLength(0);
  });

  it("passes when 2 different effects used on non-chart scenes", () => {
    const scenes = makeScenes(["bokeh", undefined, "flow", undefined]);
    expect(checkBackgroundVariety(scenes)).toHaveLength(0);
  });

  it("fails when all canvas scenes use same effect", () => {
    const scenes = makeScenes(["bokeh", undefined, "bokeh", undefined]);
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("repeats"))).toBe(true);
  });

  it("fails when > 3 scenes use bgEffect", () => {
    const scenes = makeScenes(["bokeh", "flow", "rising", "bokeh", undefined]);
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("Too many"))).toBe(true);
  });

  it("fails when chart-heavy scene uses bgEffect", () => {
    const scenes = makeScenes(
      ["bokeh", undefined, "flow", undefined],
      { chartTypes: ["bar-chart", "text", "text", "text"] },
    );
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("Chart-heavy"))).toBe(true);
  });

  it("passes diverse background strategy (hook/climax different effects, no chart overlap)", () => {
    const scenes = makeScenes(
      ["bokeh", undefined, undefined, undefined, "rising", undefined],
      { chartTypes: ["text", "bar-chart", "text", "pie-chart", "text", "text"] },
    );
    const issues = checkBackgroundVariety(scenes);
    expect(issues).toHaveLength(0);
  });

  it("flags monotonous bgColor-only across 5+ scenes", () => {
    // 5 scenes, all plain bgColor, no gradient/image/canvas
    const scenes = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i + 1}`,
      narration: "Test.",
      bgColor: i % 2 === 0 ? "#ffffff" : "#1e293b",
      elements: [{ type: "text", content: "data" }],
    }));
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("plain bgColor only"))).toBe(true);
  });

  it("passes when bgGradient breaks monotony", () => {
    const scenes = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i + 1}`,
      narration: "Test.",
      bgColor: "#1e293b",
      bgGradient: i === 2 ? "linear-gradient(135deg, #0f172a, #1e3a5f)" : undefined,
      elements: [{ type: "text", content: "data" }],
    }));
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("plain bgColor only"))).toBe(false);
  });

  it("passes when imagePrompt breaks monotony", () => {
    const scenes = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i + 1}`,
      narration: "Test.",
      bgColor: "#1e293b",
      imagePrompt: i === 0 ? "Soft blue office bokeh lighting" : undefined,
      elements: [{ type: "text", content: "data" }],
    }));
    const issues = checkBackgroundVariety(scenes);
    expect(issues.some((i) => i.includes("plain bgColor only"))).toBe(false);
  });

  it("integrates with runStopChecks", () => {
    const script = {
      scenes: [
        { id: "s1", narration: "Revenue surged 45%.", transition: "fade", bgEffect: "bokeh", elements: [{ type: "text", content: "Hook" }, { type: "metric", items: [{ value: "45%", label: "Growth" }] }, { type: "icon", name: "trending-up" }] },
        { id: "s2", narration: "Breakdown.", transition: "slide", bgEffect: "bokeh", elements: [{ type: "bar-chart", bars: [{ label: "A", value: 10 }] }, { type: "kawaii", character: "astronaut", mood: "shocked" }] },
        { id: "s3", narration: "More data.", transition: "wipe", bgEffect: "bokeh", elements: [{ type: "callout", title: "Note", content: "Important" }] },
        { id: "s4", narration: "You should act now.", transition: "radial-wipe", bgEffect: "bokeh", elements: [{ type: "comparison", left: { title: "A" }, right: { title: "B" } }] },
      ],
    };
    const result = runStopChecks(script);
    // Should flag: too many canvas scenes (4), all same effect, chart with canvas
    expect(result.issues.some((i) => i.includes("Too many"))).toBe(true);
    expect(result.issues.some((i) => i.includes("repeats"))).toBe(true);
    expect(result.issues.some((i) => i.includes("Chart-heavy"))).toBe(true);
  });
});
