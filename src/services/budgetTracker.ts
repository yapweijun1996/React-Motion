/**
 * Token Budget Tracker — structured token tracking for agentLoop
 *
 * Inspired by Claude Code's BudgetTracker pattern.
 * Tracks cumulative token usage by category, detects diminishing returns,
 * and returns actionable decisions (continue / warn / force_finish).
 */

// --- Constants ---

const DEFAULT_BUDGET_TOKENS = 150_000; // ~600K chars at /4
const WARN_THRESHOLD = 0.70;           // 70% → lower temperature, restrict tools
const FORCE_THRESHOLD = 0.90;          // 90% → force produce_script
const DIMINISHING_TURNS = 2;           // consecutive low-output turns to trigger
const DIMINISHING_MIN_TOKENS = 100;    // model must produce > this per turn

// --- Types ---

export type TokenBreakdown = {
  system: number;
  user: number;
  model: number;
  toolResults: number;
};

type TurnSnapshot = {
  iteration: number;
  modelTokensDelta: number;
};

export type BudgetDecision =
  | { action: "continue" }
  | { action: "warn"; pctUsed: number; message: string }
  | { action: "force_finish"; pctUsed: number; message: string };

export type BudgetSummary = {
  totalEstimatedTokens: number;
  breakdown: TokenBreakdown;
  pctOfBudget: number;
  decisionsIssued: { warn: number; force: number };
  diminishingReturnsDetected: boolean;
};

export type BudgetTracker = {
  breakdown: TokenBreakdown;
  turnSnapshots: TurnSnapshot[];
  warnCount: number;
  forceCount: number;
  readonly budget: number;
};

// --- Token estimation ---

export function estimateTokens(text: string, isJson: boolean): number {
  if (!text) return 0;
  return Math.ceil(text.length / (isJson ? 2 : 4));
}

// --- Factory ---

export function createBudgetTracker(
  systemPromptChars: number,
  userMessageChars: number,
  budget: number = DEFAULT_BUDGET_TOKENS,
): BudgetTracker {
  return {
    breakdown: {
      system: Math.ceil(systemPromptChars / 4),
      user: Math.ceil(userMessageChars / 4),
      model: 0,
      toolResults: 0,
    },
    turnSnapshots: [],
    warnCount: 0,
    forceCount: 0,
    budget,
  };
}

// --- Recording functions ---

/** Record model response tokens (text + function calls). Call once per iteration. */
export function recordModelOutput(
  tracker: BudgetTracker,
  iteration: number,
  parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }>,
): void {
  let chars = 0;
  for (const p of parts) {
    if (p.text) {
      chars += p.text.length;
    } else if (p.functionCall) {
      chars += p.functionCall.name.length;
      chars += JSON.stringify(p.functionCall.args).length;
    }
  }
  const tokens = Math.ceil(chars / 4);
  tracker.breakdown.model += tokens;
  tracker.turnSnapshots.push({ iteration, modelTokensDelta: tokens });
}

/** Record tool result tokens (JSON payloads at /2). */
export function recordToolResults(
  tracker: BudgetTracker,
  responseParts: Array<{ functionResponse?: { name: string; response: Record<string, unknown> } }>,
): void {
  let tokens = 0;
  for (const p of responseParts) {
    if (p.functionResponse) {
      tokens += Math.ceil(JSON.stringify(p.functionResponse).length / 2);
    }
  }
  tracker.breakdown.toolResults += tokens;
}

/** Record injected user messages (nudges, advisories, quality feedback). */
export function recordUserMessage(tracker: BudgetTracker, text: string): void {
  tracker.breakdown.user += estimateTokens(text, false);
}

// --- Decision ---

function getTotalTokens(tracker: BudgetTracker): number {
  const { system, user, model, toolResults } = tracker.breakdown;
  return system + user + model + toolResults;
}

function detectDiminishingReturns(tracker: BudgetTracker): boolean {
  const snaps = tracker.turnSnapshots;
  if (snaps.length < DIMINISHING_TURNS) return false;
  const recent = snaps.slice(-DIMINISHING_TURNS);
  return recent.every((s) => s.modelTokensDelta < DIMINISHING_MIN_TOKENS);
}

/** Check budget status and return an actionable decision. */
export function checkBudget(tracker: BudgetTracker): BudgetDecision {
  const total = getTotalTokens(tracker);
  const pct = total / tracker.budget;
  const pctRounded = Math.round(pct * 100);
  const isDiminishing = detectDiminishingReturns(tracker);

  if (isDiminishing || pct >= FORCE_THRESHOLD) {
    tracker.forceCount++;
    const reason = isDiminishing
      ? "diminishing returns"
      : `${pctRounded}% of budget`;
    return {
      action: "force_finish",
      pctUsed: pctRounded,
      message: `Budget critical (${reason}). Call produce_script NOW with your best script.`,
    };
  }

  if (pct >= WARN_THRESHOLD) {
    tracker.warnCount++;
    return {
      action: "warn",
      pctUsed: pctRounded,
      message: `${pctRounded}% of token budget used (~${Math.round(total / 1000)}K tokens). Wrap up and call produce_script soon.`,
    };
  }

  return { action: "continue" };
}

// --- Summary ---

export function getBudgetSummary(tracker: BudgetTracker): BudgetSummary {
  const total = getTotalTokens(tracker);
  return {
    totalEstimatedTokens: total,
    breakdown: { ...tracker.breakdown },
    pctOfBudget: Math.round((total / tracker.budget) * 100),
    decisionsIssued: { warn: tracker.warnCount, force: tracker.forceCount },
    diminishingReturnsDetected: detectDiminishingReturns(tracker),
  };
}
