import { describe, it, expect, beforeEach } from "vitest";
import {
  resetCostTracker,
  recordTokenCost,
  recordUnitCost,
  recordBgmCost,
  recordImageCost,
  recordGroundingCost,
  getCostSummary,
  formatCost,
  formatCostLog,
} from "../src/services/costTracker";

beforeEach(() => {
  resetCostTracker();
});

// ═══════════════════════════════════════════════════════════════════
// Pricing accuracy for each supported model
// ═══════════════════════════════════════════════════════════════════

describe("pricing accuracy", () => {
  const cases: Array<{
    model: string;
    input: number;
    output: number;
    expectedCostApprox: number;
    label: string;
  }> = [
    // Flash 2.0: $0.10 / $0.40 per 1M
    { model: "gemini-2.0-flash", input: 1000, output: 500, expectedCostApprox: (1000 * 0.10 + 500 * 0.40) / 1e6, label: "gemini-2.0-flash" },
    // Flash 2.5: $0.30 / $2.50
    { model: "gemini-2.5-flash", input: 10000, output: 2000, expectedCostApprox: (10000 * 0.30 + 2000 * 2.50) / 1e6, label: "gemini-2.5-flash" },
    { model: "gemini-2.5-flash-preview-05-20", input: 10000, output: 2000, expectedCostApprox: (10000 * 0.30 + 2000 * 2.50) / 1e6, label: "gemini-2.5-flash-preview-05-20" },
    { model: "gemini-2.5-flash-preview", input: 10000, output: 2000, expectedCostApprox: (10000 * 0.30 + 2000 * 2.50) / 1e6, label: "gemini-2.5-flash-preview" },
    // Flash Lite 3.1: $0.25 / $1.50
    { model: "gemini-3.1-flash-lite-preview", input: 5000, output: 1000, expectedCostApprox: (5000 * 0.25 + 1000 * 1.50) / 1e6, label: "gemini-3.1-flash-lite-preview" },
    // Flash 3: $0.50 / $3.00
    { model: "gemini-3-flash-preview", input: 5000, output: 1000, expectedCostApprox: (5000 * 0.50 + 1000 * 3.00) / 1e6, label: "gemini-3-flash-preview" },
    // TTS: $0.50 / $10.00
    { model: "gemini-2.5-flash-preview-tts", input: 500, output: 20000, expectedCostApprox: (500 * 0.50 + 20000 * 10.00) / 1e6, label: "gemini-2.5-flash-preview-tts" },
    // Image gen token component: $0.30 input / $0 output (per-image is separate)
    { model: "gemini-2.5-flash-image", input: 2000, output: 0, expectedCostApprox: (2000 * 0.30) / 1e6, label: "gemini-2.5-flash-image" },
  ];

  for (const c of cases) {
    it(`correct price for ${c.label}`, () => {
      recordTokenCost("agent", c.model, c.input, c.output);
      const summary = getCostSummary();
      expect(summary.totalUsd).toBeCloseTo(c.expectedCostApprox, 10);
      expect(summary.estimateStatus).toBe("complete");
      expect(summary.warnings).toHaveLength(0);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Pro models — tiered pricing based on prompt length
// ═══════════════════════════════════════════════════════════════════

describe("Pro model tiered pricing", () => {
  it("gemini-2.5-pro standard tier (<=200k tokens)", () => {
    recordTokenCost("agent", "gemini-2.5-pro", 100_000, 5000);
    const s = getCostSummary();
    // Standard: $1.25 / $10.00
    expect(s.totalUsd).toBeCloseTo((100_000 * 1.25 + 5000 * 10.00) / 1e6, 10);
    expect(s.estimateStatus).toBe("complete");
  });

  it("gemini-2.5-pro long tier (>200k tokens)", () => {
    recordTokenCost("agent", "gemini-2.5-pro", 300_000, 5000);
    const s = getCostSummary();
    // Long: $2.50 / $15.00
    expect(s.totalUsd).toBeCloseTo((300_000 * 2.50 + 5000 * 15.00) / 1e6, 10);
  });

  it("gemini-2.5-pro at exactly 200k uses standard tier", () => {
    recordTokenCost("agent", "gemini-2.5-pro", 200_000, 1000);
    const s = getCostSummary();
    expect(s.totalUsd).toBeCloseTo((200_000 * 1.25 + 1000 * 10.00) / 1e6, 10);
  });

  it("gemini-3.1-pro-preview standard tier", () => {
    recordTokenCost("agent", "gemini-3.1-pro-preview", 50_000, 2000);
    const s = getCostSummary();
    // Standard: $2.00 / $12.00
    expect(s.totalUsd).toBeCloseTo((50_000 * 2.00 + 2000 * 12.00) / 1e6, 10);
  });

  it("gemini-3.1-pro-preview long tier", () => {
    recordTokenCost("agent", "gemini-3.1-pro-preview", 250_000, 2000);
    const s = getCostSummary();
    // Long: $4.00 / $18.00
    expect(s.totalUsd).toBeCloseTo((250_000 * 4.00 + 2000 * 18.00) / 1e6, 10);
  });

  it("gemini-3-pro-preview tiered", () => {
    recordTokenCost("agent", "gemini-3-pro-preview", 50_000, 1000);
    const s1 = getCostSummary();
    expect(s1.totalUsd).toBeCloseTo((50_000 * 2.00 + 1000 * 12.00) / 1e6, 10);

    resetCostTracker();
    recordTokenCost("agent", "gemini-3-pro-preview", 250_000, 1000);
    const s2 = getCostSummary();
    expect(s2.totalUsd).toBeCloseTo((250_000 * 4.00 + 1000 * 18.00) / 1e6, 10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Prefix match — model with date suffix
// ═══════════════════════════════════════════════════════════════════

describe("prefix match for suffixed models", () => {
  it("gemini-2.5-flash-preview-05-20-extra matches 2.5-flash-preview-05-20", () => {
    recordTokenCost("agent", "gemini-2.5-flash-preview-05-20-extra", 1000, 500);
    const s = getCostSummary();
    expect(s.totalUsd).toBeCloseTo((1000 * 0.30 + 500 * 2.50) / 1e6, 10);
    expect(s.estimateStatus).toBe("complete");
  });

  it("gemini-3.1-pro-preview-0402 matches gemini-3.1-pro-preview", () => {
    recordTokenCost("agent", "gemini-3.1-pro-preview-0402", 50_000, 1000);
    const s = getCostSummary();
    expect(s.totalUsd).toBeCloseTo((50_000 * 2.00 + 1000 * 12.00) / 1e6, 10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Unknown model — partial status, excluded from total
// ═══════════════════════════════════════════════════════════════════

describe("unknown model handling", () => {
  it("unknown model records tokens but zero cost", () => {
    recordTokenCost("agent", "gemini-99-ultra", 10000, 5000);
    const s = getCostSummary();
    expect(s.totalUsd).toBe(0);
    expect(s.totalInputTokens).toBe(10000);
    expect(s.totalOutputTokens).toBe(5000);
    expect(s.callCount).toBe(1);
    expect(s.estimateStatus).toBe("partial");
    expect(s.warnings.length).toBeGreaterThan(0);
    expect(s.warnings[0]).toContain("gemini-99-ultra");
  });

  it("same unknown model called twice produces only one warning", () => {
    recordTokenCost("agent", "gemini-99-ultra", 5000, 1000);
    recordTokenCost("agent", "gemini-99-ultra", 5000, 1000);
    const s = getCostSummary();
    expect(s.warnings).toHaveLength(1);
    expect(s.callCount).toBe(2);
    expect(s.totalUsd).toBe(0);
  });

  it("mixed known + unknown — known cost counted, unknown excluded", () => {
    recordTokenCost("agent", "gemini-2.0-flash", 1000, 500);
    recordTokenCost("agent", "gemini-99-ultra", 5000, 1000);
    const s = getCostSummary();
    expect(s.totalUsd).toBeCloseTo((1000 * 0.10 + 500 * 0.40) / 1e6, 10);
    expect(s.estimateStatus).toBe("partial");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Grounding surcharge
// ═══════════════════════════════════════════════════════════════════

describe("grounding surcharge", () => {
  it("Gemini 3.x — per-query billing", () => {
    recordGroundingCost("gemini-3.1-flash-preview", ["query1", "query2", "query3"], true);
    const s = getCostSummary();
    expect(s.breakdown.grounding).toBeCloseTo(3 * (14 / 1000), 10);
    expect(s.callCount).toBe(0); // grounding is not an API call
  });

  it("Gemini 3.x — deduplicates queries", () => {
    recordGroundingCost("gemini-3-flash-preview", ["q1", "q1", "q2", "q2"], true);
    const s = getCostSummary();
    expect(s.breakdown.grounding).toBeCloseTo(2 * (14 / 1000), 10);
  });

  it("Gemini 3.x — empty queries with no evidence = no surcharge", () => {
    recordGroundingCost("gemini-3-flash-preview", [], false);
    const s = getCostSummary();
    expect(s.breakdown.grounding).toBe(0);
    expect(s.estimateStatus).toBe("complete");
  });

  it("Gemini 3.x — evidence but no queries = partial + warning", () => {
    recordGroundingCost("gemini-3.1-pro-preview", [], true);
    const s = getCostSummary();
    expect(s.breakdown.grounding).toBe(0);
    expect(s.estimateStatus).toBe("partial");
    expect(s.warnings.some(w => w.includes("missing query metadata"))).toBe(true);
  });

  it("Gemini 2.x — per-grounded-prompt billing", () => {
    recordGroundingCost("gemini-2.5-flash", [], true);
    const s = getCostSummary();
    expect(s.breakdown.grounding).toBeCloseTo(35 / 1000, 10);
    expect(s.callCount).toBe(0);
  });

  it("Gemini 2.x — no evidence = no surcharge", () => {
    recordGroundingCost("gemini-2.5-flash", ["some query"], false);
    const s = getCostSummary();
    // 2.x requires hadGroundingEvidence, queries alone don't trigger per-prompt billing
    expect(s.breakdown.grounding).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// callCount — must not double-count image/grounding
// ═══════════════════════════════════════════════════════════════════

describe("callCount accuracy", () => {
  it("image: token cost + per-image surcharge = 1 API call", () => {
    // Simulate what generateScript does for one image
    recordTokenCost("imageGen", "gemini-2.5-flash-image", 2000, 0);
    recordImageCost(1); // per-image surcharge, countTowardApiCall: false
    const s = getCostSummary();
    expect(s.callCount).toBe(1); // Only the token cost counts
    expect(s.breakdown.imageGen).toBeGreaterThan(0);
  });

  it("BGM counts as 1 API call", () => {
    recordBgmCost();
    const s = getCostSummary();
    expect(s.callCount).toBe(1);
  });

  it("grounding surcharge does not increment callCount", () => {
    recordTokenCost("agent", "gemini-2.5-flash", 10000, 2000);
    recordGroundingCost("gemini-2.5-flash", [], true);
    const s = getCostSummary();
    expect(s.callCount).toBe(1); // only the token call, not grounding
  });

  it("mixed scenario: agent + TTS + image + BGM + grounding", () => {
    // 3 agent calls
    recordTokenCost("agent", "gemini-2.5-flash", 10000, 2000);
    recordTokenCost("agent", "gemini-2.5-flash", 8000, 1500);
    recordTokenCost("agent", "gemini-2.5-flash", 9000, 1800);
    // Grounding on one agent call
    recordGroundingCost("gemini-2.5-flash", [], true);
    // 1 TTS call
    recordTokenCost("tts", "gemini-2.5-flash-preview-tts", 500, 20000);
    // 1 BGM
    recordBgmCost();
    // 2 images (each = 1 token cost + 1 surcharge)
    recordTokenCost("imageGen", "gemini-2.5-flash-image", 1000, 0);
    recordImageCost(1);
    recordTokenCost("imageGen", "gemini-2.5-flash-image", 1200, 0);
    recordImageCost(1);

    const s = getCostSummary();
    // 3 agent + 1 TTS + 1 BGM + 2 image token costs = 7
    expect(s.callCount).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Category breakdown
// ═══════════════════════════════════════════════════════════════════

describe("category breakdown", () => {
  it("entries go to correct categories", () => {
    recordTokenCost("agent", "gemini-2.5-flash", 1000, 500);
    recordTokenCost("svgGen", "gemini-2.5-flash", 800, 400);
    recordTokenCost("tts", "gemini-2.5-flash-preview-tts", 200, 10000);
    recordBgmCost();
    recordTokenCost("imageGen", "gemini-2.5-flash-image", 500, 0);
    recordImageCost(1);
    recordGroundingCost("gemini-2.5-flash", [], true);

    const s = getCostSummary();
    expect(s.breakdown.agent).toBeGreaterThan(0);
    expect(s.breakdown.svgGen).toBeGreaterThan(0);
    expect(s.breakdown.tts).toBeGreaterThan(0);
    expect(s.breakdown.bgm).toBe(0.04);
    expect(s.breakdown.imageGen).toBeGreaterThan(0);
    expect(s.breakdown.grounding).toBeGreaterThan(0);
    expect(s.breakdown.other).toBe(0);
  });

  it("all categories present in summary even if unused", () => {
    const s = getCostSummary();
    expect(Object.keys(s.breakdown)).toEqual(
      expect.arrayContaining(["agent", "svgGen", "tts", "bgm", "imageGen", "grounding", "other"]),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// formatCost
// ═══════════════════════════════════════════════════════════════════

describe("formatCost", () => {
  it("tiny cost", () => expect(formatCost(0.0001)).toBe("< US$0.001"));
  it("small cost", () => expect(formatCost(0.0056)).toBe("US$0.0056"));
  it("medium cost", () => expect(formatCost(0.123)).toBe("US$0.123"));
  it("large cost", () => expect(formatCost(1.50)).toBe("US$1.50"));
});

// ═══════════════════════════════════════════════════════════════════
// formatCostLog
// ═══════════════════════════════════════════════════════════════════

describe("formatCostLog", () => {
  it("includes [PARTIAL] for partial estimates", () => {
    recordTokenCost("agent", "gemini-99-ultra", 1000, 500);
    const s = getCostSummary();
    const log = formatCostLog(s);
    expect(log).toContain("[PARTIAL]");
  });

  it("no [PARTIAL] for complete estimates", () => {
    recordTokenCost("agent", "gemini-2.5-flash", 1000, 500);
    const s = getCostSummary();
    const log = formatCostLog(s);
    expect(log).not.toContain("[PARTIAL]");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Summary version
// ═══════════════════════════════════════════════════════════════════

describe("summary version", () => {
  it("always returns version 2", () => {
    const s = getCostSummary();
    expect(s.version).toBe(2);
  });
});
