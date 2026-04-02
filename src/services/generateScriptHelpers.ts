/**
 * Helper functions for generateScript.ts — extracted for 300-line compliance.
 */

import type { AgentProgress } from "./agentLoop";

/** Format agent progress into user-facing status message. */
export function formatAgentMessage(p: AgentProgress, completedTools: string[]): string {
  // Context-aware "thinking" labels
  if (p.action === "thinking") {
    if (completedTools.length === 0) return "Analyzing your data...";
    if (completedTools.includes("search_reference") && !completedTools.includes("draft_storyboard"))
      return "Incorporating research...";
    if (!completedTools.includes("draft_storyboard")) return "Planning storyboard...";
    if (!completedTools.includes("generate_palette")) return "Designing color palette...";
    if (!completedTools.includes("direct_visuals")) return "Directing visual approach...";
    if (!completedTools.includes("produce_script")) return "Writing final script...";
    return "Refining script...";
  }

  const LABELS: Record<string, string> = {
    "tool:analyze_data": "Analyzing data...",
    "tool:search_reference": "Researching context...",
    "tool:draft_storyboard": "Writing storyboard...",
    "tool:get_element_catalog": "Reviewing elements...",
    "tool:generate_palette": "Generating color palette...",
    "tool:direct_visuals": "Directing visual approach...",
    "tool:produce_script": "Producing video script...",
    quality_gate: "Checking script quality...",
    evaluate: "Evaluating script quality...",
    evaluate_retry: "Fixing evaluation issues...",
    advisory: "Reviewing narrative structure...",
    budget_warn: "Optimizing token usage...",
    budget_force_finish: "Wrapping up...",
    text_only: "Processing...",
    fallback_json: "Parsing output...",
    max_reached: "Finalizing...",
    force_output: "Generating final script...",
    produce_script: "Script produced",
  };

  // Handle tool_error:* pattern
  if (p.action.startsWith("tool_error:")) return "Retrying...";

  return LABELS[p.action] ?? `${p.action}`;
}

/** Simple concurrency pool — runs tasks with at most `limit` in flight. */
export async function concurrentPool<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number,
): Promise<void> {
  let idx = 0;
  const next = async (): Promise<void> => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(workers);
}
