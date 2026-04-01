/**
 * Generic phase executor for multi-agent loop.
 *
 * Extracted from the agentLoop iteration body — a single Gemini conversation
 * with a constrained tool set and configurable termination condition.
 */

import {
  callGeminiRaw,
  type GeminiMessage,
  type GeminiPart,
  type GeminiTool,
} from "./gemini";
import { getToolExecutor } from "./agentToolRegistry";
import {
  type BudgetTracker,
  recordModelOutput,
  recordToolResults,
  recordUserMessage,
  checkBudget,
} from "./budgetTracker";
import type { FunctionDeclaration } from "./gemini";
import type { ToolContext } from "./agentToolRegistry";
import type { AgentProgress } from "./agentLoopTypes";
import {
  TEMP_NORMAL,
  TEMP_PRESSURE,
  TEXT_ONLY_NUDGE_THRESHOLD,
} from "./agentConfig";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type PhaseConfig = {
  name: string;
  systemPrompt: string;
  userMessage: string;
  toolDeclarations: FunctionDeclaration[];
  maxIterations: number;
  context: ToolContext;
  budget: BudgetTracker;
  /** Tool name that terminates the phase (e.g., "draft_storyboard" or "produce_script"). */
  terminalTool: string;
  onProgress?: (p: AgentProgress) => void;
  /** Override model for this phase (e.g. Pro model for SVG-heavy scripts). */
  modelOverride?: string;
};

export type PhaseResult = {
  /** The result from the terminal tool call (null if phase ended without it). */
  terminalResult: Record<string, unknown> | null;
  /** All tool results captured during the phase, keyed by tool name. */
  toolResults: Map<string, Record<string, unknown>>;
  iterations: number;
  /** The conversation messages (for potential retry with feedback injection). */
  messages: GeminiMessage[];
};

// ═══════════════════════════════════════════════════════════════════
// Phase executor
// ═══════════════════════════════════════════════════════════════════

export async function runPhase(config: PhaseConfig): Promise<PhaseResult> {
  const {
    name, systemPrompt, userMessage, toolDeclarations,
    maxIterations, context, budget, terminalTool, onProgress,
    modelOverride,
  } = config;

  const messages: GeminiMessage[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const tools: GeminiTool[] = [
    { function_declarations: toolDeclarations },
  ];

  const toolResults = new Map<string, Record<string, unknown>>();
  let terminalResult: Record<string, unknown> | null = null;
  let textOnlyStreak = 0;

  function report(iteration: number, action: string, detail?: string) {
    const p: AgentProgress = {
      iteration,
      maxIterations,
      action: `${name}:${action}`,
      detail,
    };
    onProgress?.(p);
    console.log(`[${name}] Turn ${iteration}/${maxIterations}: ${action}${detail ? ` — ${detail}` : ""}`);
  }

  for (let i = 1; i <= maxIterations; i++) {
    report(i, "thinking", "Calling Gemini...");

    const isUnderPressure = budget.warnCount > 0 || budget.forceCount > 0;
    const result = await callGeminiRaw(
      systemPrompt,
      messages,
      { tools, temperature: isUnderPressure ? TEMP_PRESSURE : TEMP_NORMAL, modelOverride },
    );

    recordModelOutput(budget, i, result.parts);

    const functionCalls = result.parts.filter((p) => p.functionCall);

    // Text-only response handling
    if (functionCalls.length === 0) {
      textOnlyStreak++;
      messages.push({ role: "model", parts: result.parts as GeminiPart[] });

      if (textOnlyStreak >= TEXT_ONLY_NUDGE_THRESHOLD) {
        const nudge = `Please use your available tools to proceed. Call \`${terminalTool}\` when ready.`;
        messages.push({ role: "user", parts: [{ text: nudge }] });
        recordUserMessage(budget, nudge);
      }
      continue;
    }

    textOnlyStreak = 0;
    messages.push({ role: "model", parts: result.parts as GeminiPart[] });

    // Execute tool calls
    const responseParts: GeminiPart[] = [];

    for (const part of functionCalls) {
      const { name: toolName, args } = part.functionCall!;
      report(i, `tool:${toolName}`, JSON.stringify(args).slice(0, 200));

      const executor = getToolExecutor(toolName);
      if (!executor) {
        responseParts.push({
          functionResponse: {
            name: toolName,
            response: { error: `Unknown tool: ${toolName}`, is_error: true },
          },
        });
        continue;
      }

      try {
        const toolResult = await executor(args, context);
        toolResults.set(toolName, toolResult.result);

        // Check for terminal tool
        if (toolName === terminalTool) {
          terminalResult = toolResult.result;
          console.log(`[${name}] ✔ Terminal tool "${terminalTool}" detected at iteration ${i}, will exit after processing`);
        }

        responseParts.push({
          functionResponse: { name: toolName, response: toolResult.result },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report(i, `tool_error:${toolName}`, msg);
        responseParts.push({
          functionResponse: { name: toolName, response: { error: msg, is_error: true } },
        });
      }
    }

    messages.push({ role: "user", parts: responseParts });
    recordToolResults(budget, responseParts as Array<{ functionResponse?: { name: string; response: Record<string, unknown> } }>);

    // Budget check
    const budgetDecision = checkBudget(budget);
    if (budgetDecision.action === "force_finish") {
      report(i, "budget_force", `${budgetDecision.pctUsed}%`);
      if (!terminalResult) {
        console.log(`[${name}] Budget force at iteration ${i} but terminal not yet reached — nudging model`);
        const forceMsg = `Budget pressure — please call \`${terminalTool}\` now.`;
        messages.push({ role: "user", parts: [{ text: forceMsg }] });
        recordUserMessage(budget, forceMsg);
        continue;
      }
      console.log(`[${name}] Budget force at iteration ${i} AND terminal reached — exiting`);
    }

    // Phase complete when terminal tool returned
    if (terminalResult) {
      console.log(`[${name}] Exiting phase at iteration ${i}/${maxIterations} — terminal tool "${terminalTool}" result received`);
      report(i, "complete", `${terminalTool} returned`);
      return { terminalResult, toolResults, iterations: i, messages };
    }
    console.log(`[${name}] Iteration ${i} done, terminalResult=null — continuing to next iteration`);
  }

  // Max iterations reached without terminal tool
  report(maxIterations, "max_reached", `${terminalTool} not called`);
  return { terminalResult: null, toolResults, iterations: maxIterations, messages };
}

/**
 * Re-run a phase with injected feedback in the conversation history.
 * Used when Quality Reviewer routes issues back to a specific agent.
 */
export async function retryPhaseWithFeedback(
  config: Omit<PhaseConfig, "userMessage">,
  priorMessages: GeminiMessage[],
  feedback: string,
): Promise<PhaseResult> {
  const { name, systemPrompt, toolDeclarations, context, budget, terminalTool, onProgress } = config;

  // Append feedback to prior conversation
  priorMessages.push({ role: "user", parts: [{ text: feedback }] });
  recordUserMessage(budget, feedback);

  // Re-run with existing messages (max 2 additional iterations)
  const retryConfig: PhaseConfig = {
    name: `${name}-retry`,
    systemPrompt,
    userMessage: "", // not used — messages already built
    toolDeclarations,
    maxIterations: 2,
    context,
    budget,
    terminalTool,
    onProgress,
  };

  // Override: use priorMessages instead of creating fresh ones
  return runPhaseWithMessages(retryConfig, priorMessages);
}

/** Internal: run phase with pre-built message history (for retries). */
async function runPhaseWithMessages(
  config: PhaseConfig,
  messages: GeminiMessage[],
): Promise<PhaseResult> {
  const {
    name, systemPrompt, toolDeclarations,
    maxIterations, context, budget, terminalTool, onProgress,
  } = config;

  const tools: GeminiTool[] = [
    { function_declarations: toolDeclarations },
  ];

  const toolResults = new Map<string, Record<string, unknown>>();
  let terminalResult: Record<string, unknown> | null = null;

  function report(iteration: number, action: string, detail?: string) {
    const p: AgentProgress = {
      iteration,
      maxIterations,
      action: `${name}:${action}`,
      detail,
    };
    onProgress?.(p);
    console.log(`[${name}] Retry ${iteration}/${maxIterations}: ${action}${detail ? ` — ${detail}` : ""}`);
  }

  for (let i = 1; i <= maxIterations; i++) {
    const isUnderPressure = budget.warnCount > 0 || budget.forceCount > 0;
    const result = await callGeminiRaw(
      systemPrompt, messages,
      { tools, temperature: isUnderPressure ? TEMP_PRESSURE : TEMP_NORMAL },
    );
    recordModelOutput(budget, i, result.parts);

    const functionCalls = result.parts.filter((p) => p.functionCall);
    if (functionCalls.length === 0) {
      messages.push({ role: "model", parts: result.parts as GeminiPart[] });
      continue;
    }

    messages.push({ role: "model", parts: result.parts as GeminiPart[] });

    const responseParts: GeminiPart[] = [];
    for (const part of functionCalls) {
      const { name: toolName, args } = part.functionCall!;
      report(i, `tool:${toolName}`);

      const executor = getToolExecutor(toolName);
      if (!executor) {
        responseParts.push({ functionResponse: { name: toolName, response: { error: `Unknown tool: ${toolName}`, is_error: true } } });
        continue;
      }
      try {
        const tr = await executor(args, context);
        toolResults.set(toolName, tr.result);
        if (toolName === terminalTool) terminalResult = tr.result;
        responseParts.push({ functionResponse: { name: toolName, response: tr.result } });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        responseParts.push({ functionResponse: { name: toolName, response: { error: msg, is_error: true } } });
      }
    }

    messages.push({ role: "user", parts: responseParts });
    recordToolResults(budget, responseParts as Array<{ functionResponse?: { name: string; response: Record<string, unknown> } }>);

    if (terminalResult) {
      return { terminalResult, toolResults, iterations: i, messages };
    }
  }

  return { terminalResult: null, toolResults, iterations: maxIterations, messages };
}
