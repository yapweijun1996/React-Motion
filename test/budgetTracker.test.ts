import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  createBudgetTracker,
  recordModelOutput,
  recordToolResults,
  recordUserMessage,
  checkBudget,
  getBudgetSummary,
} from "../src/services/budgetTracker";
import { DEFAULT_BUDGET_TOKENS } from "../src/services/agentConfig";

describe("estimateTokens", () => {
  it("estimates text at /4", () => {
    expect(estimateTokens("abcdefgh", false)).toBe(2); // 8/4
  });

  it("estimates JSON at /2", () => {
    expect(estimateTokens("abcdefgh", true)).toBe(4); // 8/2
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("", false)).toBe(0);
  });
});

describe("createBudgetTracker", () => {
  it("initializes breakdown from char counts", () => {
    const t = createBudgetTracker(400, 200);
    expect(t.breakdown.system).toBe(100); // 400/4
    expect(t.breakdown.user).toBe(50);    // 200/4
    expect(t.breakdown.model).toBe(0);
    expect(t.breakdown.toolResults).toBe(0);
    expect(t.budget).toBe(DEFAULT_BUDGET_TOKENS);
  });

  it("accepts custom budget", () => {
    const t = createBudgetTracker(0, 0, 5000);
    expect(t.budget).toBe(5000);
  });
});

describe("recordModelOutput", () => {
  it("accumulates model tokens from text parts", () => {
    const t = createBudgetTracker(0, 0, 10000);
    // 80 chars of text → 80/4 = 20 tokens
    recordModelOutput(t, 1, [{ text: "a".repeat(80) }]);
    expect(t.breakdown.model).toBe(20);
    expect(t.turnSnapshots).toHaveLength(1);
    expect(t.turnSnapshots[0].modelTokensDelta).toBe(20);
  });

  it("accumulates model tokens from functionCall parts", () => {
    const t = createBudgetTracker(0, 0, 10000);
    recordModelOutput(t, 1, [{
      functionCall: { name: "produce_script", args: { key: "value" } },
    }]);
    expect(t.breakdown.model).toBeGreaterThan(0);
  });

  it("accumulates across multiple calls", () => {
    const t = createBudgetTracker(0, 0, 10000);
    recordModelOutput(t, 1, [{ text: "a".repeat(40) }]); // 10 tokens
    recordModelOutput(t, 2, [{ text: "b".repeat(40) }]); // 10 tokens
    expect(t.breakdown.model).toBe(20);
    expect(t.turnSnapshots).toHaveLength(2);
  });
});

describe("recordToolResults", () => {
  it("estimates JSON tool results at /2", () => {
    const t = createBudgetTracker(0, 0, 10000);
    recordToolResults(t, [{
      functionResponse: { name: "test", response: { data: "hello" } },
    }]);
    expect(t.breakdown.toolResults).toBeGreaterThan(0);
  });

  it("skips parts without functionResponse", () => {
    const t = createBudgetTracker(0, 0, 10000);
    recordToolResults(t, [{ text: "ignored" } as never]);
    expect(t.breakdown.toolResults).toBe(0);
  });
});

describe("recordUserMessage", () => {
  it("adds user tokens at /4", () => {
    const t = createBudgetTracker(0, 0, 10000);
    recordUserMessage(t, "a".repeat(100)); // 100/4 = 25
    expect(t.breakdown.user).toBe(25);
  });
});

describe("checkBudget", () => {
  it("returns continue when under 70%", () => {
    const t = createBudgetTracker(0, 0, 1000);
    t.breakdown.model = 600; // 60%
    expect(checkBudget(t)).toEqual({ action: "continue" });
  });

  it("returns warn at 70-89%", () => {
    const t = createBudgetTracker(0, 0, 1000);
    t.breakdown.model = 750; // 75%
    const d = checkBudget(t);
    expect(d.action).toBe("warn");
    if (d.action === "warn") {
      expect(d.pctUsed).toBe(75);
      expect(d.message).toContain("75%");
    }
  });

  it("returns force_finish at 90%+", () => {
    const t = createBudgetTracker(0, 0, 1000);
    t.breakdown.model = 950; // 95%
    const d = checkBudget(t);
    expect(d.action).toBe("force_finish");
    if (d.action === "force_finish") {
      expect(d.pctUsed).toBe(95);
    }
  });

  it("detects diminishing returns — 2 consecutive low-output turns", () => {
    const t = createBudgetTracker(0, 0, 100000);
    // Two turns with < 100 tokens each
    t.turnSnapshots.push({ iteration: 1, modelTokensDelta: 50 });
    t.turnSnapshots.push({ iteration: 2, modelTokensDelta: 30 });
    t.breakdown.model = 80; // way under budget, but diminishing
    const d = checkBudget(t);
    expect(d.action).toBe("force_finish");
    if (d.action === "force_finish") {
      expect(d.message).toContain("diminishing");
    }
  });

  it("no diminishing returns with sufficient delta", () => {
    const t = createBudgetTracker(0, 0, 100000);
    t.turnSnapshots.push({ iteration: 1, modelTokensDelta: 200 });
    t.turnSnapshots.push({ iteration: 2, modelTokensDelta: 150 });
    t.breakdown.model = 350;
    expect(checkBudget(t)).toEqual({ action: "continue" });
  });

  it("increments warnCount on repeated warns", () => {
    const t = createBudgetTracker(0, 0, 1000);
    t.breakdown.model = 750;
    checkBudget(t);
    checkBudget(t);
    expect(t.warnCount).toBe(2);
  });

  it("increments forceCount", () => {
    const t = createBudgetTracker(0, 0, 1000);
    t.breakdown.model = 950;
    checkBudget(t);
    expect(t.forceCount).toBe(1);
  });
});

describe("getBudgetSummary", () => {
  it("aggregates all breakdown fields", () => {
    const t = createBudgetTracker(400, 200, 10000); // sys=100, usr=50
    t.breakdown.model = 300;
    t.breakdown.toolResults = 150;
    const s = getBudgetSummary(t);
    expect(s.totalEstimatedTokens).toBe(600); // 100+50+300+150
    expect(s.pctOfBudget).toBe(6); // 600/10000 = 6%
    expect(s.breakdown.system).toBe(100);
    expect(s.breakdown.model).toBe(300);
    expect(s.decisionsIssued).toEqual({ warn: 0, force: 0 });
    expect(s.diminishingReturnsDetected).toBe(false);
  });

  it("reflects decisions issued", () => {
    const t = createBudgetTracker(0, 0, 1000);
    t.breakdown.model = 800;
    checkBudget(t); // warn
    const s = getBudgetSummary(t);
    expect(s.decisionsIssued.warn).toBe(1);
  });
});
