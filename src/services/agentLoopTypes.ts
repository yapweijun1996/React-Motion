/**
 * Types for the OODAE Agent Loop.
 */

import type { BudgetSummary } from "./budgetTracker";

export type AgentProgress = {
  iteration: number;
  maxIterations: number;
  action: string;
  detail?: string;
};

export type AgentLoopResult = {
  /** The final script JSON (from produce_script tool) */
  scriptJson: Record<string, unknown>;
  /** Full conversation log for debugging */
  conversationLog: AgentProgress[];
  /** How many iterations the agent used */
  iterations: number;
  /** Token budget summary for observability */
  budgetSummary: BudgetSummary;
};
