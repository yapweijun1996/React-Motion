import { describe, it, expect } from "vitest";
import { STORYBOARD_PROMPT } from "../src/services/promptStoryboard";
import { VISUAL_DIRECTOR_PROMPT_TEMPLATE } from "../src/services/promptVisualDirector";
import {
  extractStoryboardPlan,
  buildStoryboardPrompt,
  buildVisualDirectorPrompt,
} from "../src/services/promptAgents";
import type { StoryboardPlan, AppleBeat } from "../src/types";

// ============================================================
// 1. Storyboard prompt steers away from title-card / thank-you
// ============================================================

describe("Storyboard prompt: Apple narrative discipline", () => {
  const prompt = STORYBOARD_PROMPT;

  it("contains Apple 6-beat structure", () => {
    expect(prompt).toContain("Hook");
    expect(prompt).toContain("WHY IT MATTERS");
    expect(prompt).toContain("HOW IT WORKS");
    expect(prompt).toContain("PROOF");
    expect(prompt).toContain("CLIMAX");
    expect(prompt).toContain("RESOLUTION");
  });

  it("forbids title-card and thank-you scenes", () => {
    expect(prompt).toContain("title card");
    expect(prompt).toContain("thank you");
    // Should mention avoiding these
    expect(prompt.toLowerCase()).toMatch(/avoid.*title card/i);
  });

  it("recommends 6-9 scene count", () => {
    expect(prompt).toContain("6-9");
  });

  it("includes tone ladder", () => {
    expect(prompt).toContain("default");
    expect(prompt).toContain("elevated");
    expect(prompt).toContain("launch");
  });

  it("includes audienceMode concept", () => {
    expect(prompt).toContain("audienceMode");
    expect(prompt).toContain("business");
    expect(prompt).toContain("product");
    expect(prompt).toContain("education");
    expect(prompt).toContain("mixed");
  });

  it("includes coreTakeaway and hookStatement in output instructions", () => {
    expect(prompt).toContain("core_takeaway");
    expect(prompt).toContain("hook_statement");
  });

  it("leads with conclusion, not topic — bad/good examples present", () => {
    expect(prompt).toContain("BAD:");
    expect(prompt).toContain("GOOD:");
    // Hook section should have negative examples about generic titles
    expect(prompt).toMatch(/BAD.*Q3/i);
  });

  it("narration rules: sentence discipline", () => {
    expect(prompt).toContain("Sentence 1");
    expect(prompt).toContain("Sentence 2");
  });

  it("narration rules: no verbatim chart reading", () => {
    expect(prompt).toContain("Never read charts verbatim");
  });
});

// ============================================================
// 2. StoryboardPlan can express Apple 6-beat structure
// ============================================================

describe("StoryboardPlan: Apple 6-beat output", () => {
  const APPLE_BEATS: AppleBeat[] = [
    "hook", "why-it-matters", "how-it-works", "proof", "climax", "resolution",
  ];

  it("extractStoryboardPlan populates new Apple fields", () => {
    const toolResult = {
      storyboard: "[Scene 1: hook] Insight: Revenue grew 22% | So What: Fastest growth in 3 years",
      scene_count: 7,
      color_mood: "professional blue",
      pacing: "short hook → long proof → peak climax",
      climax_scene: 6,
      audience_mode: "business",
      core_takeaway: "Revenue grew 22% driven by APAC expansion",
      hook_statement: "This quarter, revenue surged 22% — the fastest growth in three years.",
    };

    const plan = extractStoryboardPlan(toolResult, "user data here", "Create a video about Q3");

    expect(plan.audienceMode).toBe("business");
    expect(plan.storyMode).toBe("adapted-apple");
    expect(plan.coreTakeaway).toBe("Revenue grew 22% driven by APAC expansion");
    expect(plan.hookStatement).toContain("22%");
  });

  it("extractStoryboardPlan defaults audienceMode to mixed", () => {
    const plan = extractStoryboardPlan(
      { storyboard: "test", scene_count: 6 },
      "data", "prompt",
    );
    expect(plan.audienceMode).toBe("mixed");
    expect(plan.storyMode).toBe("adapted-apple");
  });

  it("all Apple beat values are valid role types", () => {
    // Type-level check: each AppleBeat should be assignable to StoryboardScenePlan.role
    const plan: StoryboardPlan = {
      storyboard: "",
      sceneCount: 6,
      colorMood: "test",
      pacing: "test",
      scenePlan: APPLE_BEATS.map((beat, i) => ({
        sceneNumber: i + 1,
        role: beat,
        beat,
        insight: "test",
        soWhat: "test",
        elementHints: [],
        duration: "medium" as const,
      })),
      userPrompt: "test",
      dataContext: "test",
    };
    expect(plan.scenePlan).toHaveLength(6);
    expect(plan.scenePlan.map((s) => s.beat)).toEqual(APPLE_BEATS);
  });
});

// ============================================================
// 3. Visual Director maps beats to single-focus layouts
// ============================================================

describe("Visual Director: Apple visual grammar", () => {
  const template = VISUAL_DIRECTOR_PROMPT_TEMPLATE;

  it("contains beat-to-visual mapping for all 6 beats", () => {
    expect(template).toContain("Hook → Single focal impact");
    expect(template).toContain("Why It Matters → Metric + context");
    expect(template).toContain("How It Works → Structure + flow");
    expect(template).toContain("Proof → Evidence with interpretation");
    expect(template).toContain("Climax → Maximum contrast");
    expect(template).toContain("Resolution → Clean compression");
  });

  it("hook maps to center layout", () => {
    // Extract the Hook section and check for center layout
    const hookSection = template.slice(
      template.indexOf("### Hook"),
      template.indexOf("### Why It Matters"),
    );
    expect(hookSection).toContain("center");
  });

  it("climax includes spotlight guidance", () => {
    const climaxSection = template.slice(
      template.indexOf("### Climax"),
      template.indexOf("### Resolution"),
    );
    expect(climaxSection).toContain("spotlight");
  });

  it("enforces max 1 hero element per scene", () => {
    expect(template).toContain("Max 1 hero element per scene");
  });

  it("enforces max 3 content elements per scene", () => {
    expect(template).toContain("Max 3 content elements per scene");
  });

  it("spotlight restricted to climax or one proof scene", () => {
    expect(template).toMatch(/spotlight.*only.*climax/i);
  });

  it("background rhythm supports arc", () => {
    // Background rhythm section — may be original or linter-expanded version
    expect(template).toContain("Background rhythm");
    expect(template).toContain("Climax");
    expect(template).toContain("Resolution");
  });
});

// ============================================================
// 4. Prompt rules: one focal message per scene
// ============================================================

describe("Prompt rules: focal message discipline", () => {
  it("storyboard prompt enforces one piece of evidence per proof scene", () => {
    expect(STORYBOARD_PROMPT).toContain("ONE piece of evidence");
  });

  it("visual director enforces single dominant element", () => {
    expect(VISUAL_DIRECTOR_PROMPT_TEMPLATE).toContain("1 dominant element");
  });
});

// ============================================================
// 5. Evaluation rules: Apple narrative checks
// ============================================================

describe("Evaluate: Apple narrative discipline checks", () => {
  // We can't easily test the evaluate prompt without importing it directly,
  // so we test the evaluate.ts module structure indirectly via the exports.
  // The key test is that EVALUATE_SYSTEM contains the new checks.

  it("evaluate module exports evaluateScript and evaluateScriptJson", async () => {
    const mod = await import("../src/services/evaluate");
    expect(typeof mod.evaluateScript).toBe("function");
    expect(typeof mod.evaluateScriptJson).toBe("function");
  });
});

// ============================================================
// 6. parseScenePlan handles Apple beats
// ============================================================

describe("parseScenePlan: Apple beat parsing", () => {
  it("parses Apple-style beats from storyboard text", () => {
    const toolResult = {
      storyboard: [
        "[Scene 1: hook] Insight: Revenue grew 22% | So What: Fastest growth | Suggested elements: metric, text | Duration: short",
        "[Scene 2: why-it-matters] Insight: APAC expansion | So What: New markets | Suggested elements: comparison | Duration: medium",
        "[Scene 3: how-it-works] Insight: Three drivers | So What: Structural | Suggested elements: svg, timeline | Duration: medium",
        "[Scene 4: proof] Insight: Q3 vs Q2 | So What: Acceleration | Suggested elements: bar-chart | Duration: long",
        "[Scene 5: climax] Insight: Margin improvement | So What: Profitability | Suggested elements: progress | Duration: long",
        "[Scene 6: resolution] Insight: Continue APAC | So What: Next quarter | Suggested elements: callout | Duration: short",
      ].join("\n"),
      scene_count: 6,
    };

    const plan = extractStoryboardPlan(toolResult, "data", "prompt");

    expect(plan.scenePlan).toHaveLength(6);
    expect(plan.scenePlan[0].role).toBe("hook");
    expect(plan.scenePlan[0].beat).toBe("hook");
    expect(plan.scenePlan[1].role).toBe("why-it-matters");
    expect(plan.scenePlan[1].beat).toBe("why-it-matters");
    expect(plan.scenePlan[2].role).toBe("how-it-works");
    expect(plan.scenePlan[2].beat).toBe("how-it-works");
    expect(plan.scenePlan[3].role).toBe("proof");
    expect(plan.scenePlan[3].beat).toBe("proof");
    expect(plan.scenePlan[4].role).toBe("climax");
    expect(plan.scenePlan[4].beat).toBe("climax");
    expect(plan.scenePlan[5].role).toBe("resolution");
    expect(plan.scenePlan[5].beat).toBe("resolution");
  });

  it("maps legacy roles to Apple beats", () => {
    const toolResult = {
      storyboard: [
        "[Scene 1: hook] Insight: test | Duration: short",
        "[Scene 2: context] Insight: test | Duration: medium",
        "[Scene 3: tension] Insight: test | Duration: medium",
        "[Scene 4: evidence] Insight: test | Duration: long",
        "[Scene 5: climax] Insight: test | Duration: long",
        "[Scene 6: close] Insight: test | Duration: short",
      ].join("\n"),
      scene_count: 6,
    };

    const plan = extractStoryboardPlan(toolResult, "data", "prompt");

    // Legacy roles preserved as role
    expect(plan.scenePlan[1].role).toBe("context");
    expect(plan.scenePlan[2].role).toBe("tension");
    expect(plan.scenePlan[3].role).toBe("evidence");
    expect(plan.scenePlan[5].role).toBe("close");

    // But beat maps to nearest Apple equivalent
    expect(plan.scenePlan[1].beat).toBe("why-it-matters");
    expect(plan.scenePlan[2].beat).toBe("how-it-works");
    expect(plan.scenePlan[3].beat).toBe("proof");
    expect(plan.scenePlan[5].beat).toBe("resolution");
  });
});

// ============================================================
// 6b. parseScenePlan handles space-separated beat labels (RM-189)
// ============================================================

describe("parseScenePlan: space-separated beat labels (bug fix)", () => {
  it("parses 'WHY IT MATTERS' as why-it-matters (not fallback to proof)", () => {
    const toolResult = {
      storyboard: [
        "[Scene 1: HOOK] Insight: Breach cost is $4.88M | So What: Financial impact | Duration: short",
        "[Scene 2: WHY IT MATTERS] Insight: Healthcare 41% | So What: Essential sectors | Duration: medium",
        "[Scene 3: HOW IT WORKS] Insight: Battery + Supercharger | So What: Ecosystem | Duration: medium",
        "[Scene 4: PROOF] Insight: Production acceleration | So What: Scale confirmed | Duration: medium",
        "[Scene 5: CLIMAX] Insight: 20M tons CO2 saved | So What: Net-zero | Duration: long",
        "[Scene 6: RESOLUTION] Insight: Point of no return | So What: Scale the grid | Duration: short",
      ].join("\n"),
      scene_count: 6,
    };

    const plan = extractStoryboardPlan(toolResult, "data", "prompt");

    expect(plan.scenePlan).toHaveLength(6);
    expect(plan.scenePlan[0].beat).toBe("hook");
    expect(plan.scenePlan[1].beat).toBe("why-it-matters");
    expect(plan.scenePlan[2].beat).toBe("how-it-works");
    expect(plan.scenePlan[3].beat).toBe("proof");
    expect(plan.scenePlan[4].beat).toBe("climax");
    expect(plan.scenePlan[5].beat).toBe("resolution");
  });

  it("parses mixed case and extra spaces", () => {
    const toolResult = {
      storyboard: [
        "[Scene 1: Hook] Insight: test | Duration: short",
        "[Scene 2:  Why It Matters ] Insight: test | Duration: medium",
        "[Scene 3: HOW  IT  WORKS] Insight: test | Duration: medium",
      ].join("\n"),
      scene_count: 3,
    };

    const plan = extractStoryboardPlan(toolResult, "data", "prompt");

    expect(plan.scenePlan).toHaveLength(3);
    expect(plan.scenePlan[0].beat).toBe("hook");
    expect(plan.scenePlan[1].beat).toBe("why-it-matters");
    expect(plan.scenePlan[2].beat).toBe("how-it-works");
  });

  it("3-scene compressed format: no beat falls back to proof incorrectly", () => {
    // Real-world case from Gemini flash-lite output
    const toolResult = {
      storyboard: [
        "[Scene 1: HOOK] Insight: Average breach cost is $4.88M, a 10% YoY increase. | So What: Financial impact is compounding. | Suggested elements: metric, text | Duration: short",
        "[Scene 2: WHY IT MATTERS] Insight: Healthcare and Finance represent 41% of all targeted incidents. | So What: Essential infrastructure sectors under pressure. | Suggested elements: pie-chart, callout | Duration: medium",
        "[Scene 3: CLIMAX] Insight: The mean time to identify and contain a breach is 258 days. | So What: This massive window of exposure drives rising costs. | Suggested elements: timeline, annotation | Duration: long",
      ].join("\n"),
      scene_count: 3,
    };

    const plan = extractStoryboardPlan(toolResult, "cyber data", "cybersecurity briefing");

    expect(plan.scenePlan).toHaveLength(3);
    // The critical assertion: WHY IT MATTERS must NOT fall back to "proof"
    expect(plan.scenePlan[1].beat).toBe("why-it-matters");
    expect(plan.scenePlan[1].role).toBe("why-it-matters");
    // Verify other scenes are correct too
    expect(plan.scenePlan[0].beat).toBe("hook");
    expect(plan.scenePlan[2].beat).toBe("climax");
  });

  it("still defaults unknown labels to proof", () => {
    const toolResult = {
      storyboard: "[Scene 1: INTRODUCTION] Insight: test | Duration: short",
      scene_count: 1,
    };

    const plan = extractStoryboardPlan(toolResult, "data", "prompt");

    expect(plan.scenePlan).toHaveLength(1);
    expect(plan.scenePlan[0].role).toBe("proof");
    expect(plan.scenePlan[0].beat).toBe("proof");
  });
});

// ============================================================
// 7. Handoff format includes Apple fields
// ============================================================

describe("Handoff format: Apple fields in Visual Director prompt", () => {
  it("buildVisualDirectorPrompt includes audienceMode and coreTakeaway", () => {
    const plan: StoryboardPlan = {
      storyboard: "[Scene 1: hook] Insight: test",
      sceneCount: 6,
      colorMood: "professional blue",
      pacing: "compact",
      scenePlan: [],
      userPrompt: "test prompt",
      dataContext: "test data",
      audienceMode: "business",
      storyMode: "adapted-apple",
      coreTakeaway: "Revenue grew 22%",
      hookStatement: "This quarter changed everything.",
    };

    const prompt = buildVisualDirectorPrompt(plan);
    expect(prompt).toContain("adapted-apple");
    expect(prompt).toContain("business");
    expect(prompt).toContain("Revenue grew 22%");
    expect(prompt).toContain("This quarter changed everything.");
  });
});

// ============================================================
// 8. Existing schema/parse tests compatibility
// ============================================================

describe("Backward compatibility: existing types still work", () => {
  it("StoryboardPlan without Apple fields is valid", () => {
    const plan: StoryboardPlan = {
      storyboard: "test",
      sceneCount: 8,
      colorMood: "warm",
      pacing: "steady",
      scenePlan: [{
        sceneNumber: 1,
        role: "evidence",  // legacy role still works
        insight: "test",
        soWhat: "test",
        elementHints: ["bar-chart"],
        duration: "medium",
      }],
      userPrompt: "test",
      dataContext: "test",
      // No Apple fields — all optional
    };
    expect(plan.audienceMode).toBeUndefined();
    expect(plan.storyMode).toBeUndefined();
    expect(plan.scenePlan[0].beat).toBeUndefined();
  });

  it("buildStoryboardPrompt returns non-empty string", () => {
    const prompt = buildStoryboardPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });
});
