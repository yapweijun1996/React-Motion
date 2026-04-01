/**
 * Agent Loop — routing entry point.
 *
 * Routes between single-agent (original) and multi-agent (3-role) modes
 * based on the agentMode setting. Default: "single" for zero-risk rollout.
 *
 * Single-agent: agentLoopSingle.ts (original OODAE loop, unchanged)
 * Multi-agent: agentLoopMulti.ts (Storyboard → Visual Director → Reviewer)
 */

import { runSingleAgentLoop } from "./agentLoopSingle";
import { runMultiAgentLoop } from "./agentLoopMulti";
import type { ToolContext } from "./agentToolRegistry";
import type { AgentProgress, AgentLoopResult } from "./agentLoopTypes";

// Re-export for backward compatibility
export type { AgentProgress, AgentLoopResult } from "./agentLoopTypes";

export type AgentMode = "single" | "multi";

/** Read agent mode from settings. Defaults to "single". */
function getAgentMode(): AgentMode {
  try {
    const raw = localStorage.getItem("react-motion-settings");
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.agentMode === "multi") return "multi";
    }
  } catch { /* ignore */ }
  return "single";
}

export async function runAgentLoop(
  systemPrompt: string,
  userMessage: string,
  context: ToolContext,
  onProgress?: (p: AgentProgress) => void,
): Promise<AgentLoopResult> {
  const mode = getAgentMode();

  if (mode === "multi") {
    try {
      console.log("[Agent] Using multi-agent mode (3-role collaboration)");
      return await runMultiAgentLoop(userMessage, context, onProgress);
    } catch (err) {
      console.warn("[Agent] Multi-agent failed, falling back to single:", err);
      // Automatic fallback to single-agent mode
    }
  }

  console.log("[Agent] Using single-agent mode");
  const result = await runSingleAgentLoop(systemPrompt, userMessage, context, onProgress);
  return { ...result, agentMode: "single" };
}
