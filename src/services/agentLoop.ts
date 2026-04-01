/** OODAE Agent Loop — Observe → Orient → Decide → Act → Evaluate */

import {
  callGeminiRaw,
  type GeminiMessage,
  type GeminiPart,
  type GeminiTool,
  type GeminiCallResult,
} from "./gemini";
import {
  getToolDeclarations,
  getToolExecutor,
  resetPaletteState,
  type ToolContext,
} from "./agentTools";
import { runStopChecks } from "./agentHooks";
import { evaluateScriptJson } from "./evaluate";
import { ClassifiedError, logError } from "./errors";
import {
  createBudgetTracker,
  recordModelOutput,
  recordToolResults,
  recordUserMessage,
  checkBudget,
  getBudgetSummary,
} from "./budgetTracker";
import type { AgentProgress, AgentLoopResult } from "./agentLoopTypes";

// Re-export for backward compatibility
export type { AgentProgress, AgentLoopResult } from "./agentLoopTypes";

const MAX_ITERATIONS = 12;

export async function runAgentLoop(
  systemPrompt: string,
  userMessage: string,
  context: ToolContext,
  onProgress?: (p: AgentProgress) => void,
): Promise<AgentLoopResult> {
  resetPaletteState();

  const messages: GeminiMessage[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const tools: GeminiTool[] = [
    { function_declarations: getToolDeclarations() },
    { google_search: {} },
  ];

  // Budget pressure: restrict to terminal tools only
  const toolsMinimal: GeminiTool[] = [{
    function_declarations: getToolDeclarations().filter(
      (d) => d.name === "produce_script" || d.name === "draft_storyboard",
    ),
  }];

  const log: AgentProgress[] = [];

  // --- Hook state ---
  const calledTools = new Set<string>();
  let textOnlyStreak = 0;
  let stopRetried = false;
  let evalRetried = false;
  let storyboardAdvisoryGiven = false;
  let visualAdvisoryGiven = false;
  const budget = createBudgetTracker(systemPrompt.length, userMessage.length);

  function report(iteration: number, action: string, detail?: string) {
    const p: AgentProgress = { iteration, maxIterations: MAX_ITERATIONS, action, detail };
    log.push(p);
    onProgress?.(p);
    console.log(`[Agent] Turn ${iteration}/${MAX_ITERATIONS}: ${action}${detail ? ` — ${detail}` : ""}`);
  }

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    report(i, "thinking", "Calling Gemini with tools...");

    // RM-143e: Budget-driven temperature + tool selection
    const isUnderPressure = budget.warnCount > 0 || budget.forceCount > 0;
    const result: GeminiCallResult = await callGeminiRaw(
      systemPrompt,
      messages,
      { tools: isUnderPressure ? toolsMinimal : tools, temperature: isUnderPressure ? 0.5 : 0.8 },
    );

    // RM-143e: Record model output tokens
    recordModelOutput(budget, i, result.parts);

    const functionCalls = result.parts.filter((p) => p.functionCall);
    const textParts = result.parts.filter((p) => p.text);

    // RM-143d: Smart text-only handling
    if (functionCalls.length === 0) {
      const text = textParts.map((p) => p.text).join("");
      report(i, "text_only", `${textParts.length} text parts`);
      console.log("[Agent] AI text:", text.slice(0, 300) + (text.length > 300 ? "..." : ""));

      // Try parsing as fallback JSON
      if (text.includes('"scenes"')) {
        try {
          const parsed = JSON.parse(text);
          report(i, "fallback_json", "Parsed text as VideoScript JSON");
          return { scriptJson: parsed, conversationLog: log, iterations: i, budgetSummary: getBudgetSummary(budget) };
        } catch { /* not valid JSON, continue */ }
      }

      textOnlyStreak++;
      messages.push({ role: "model", parts: result.parts as GeminiPart[] });

      // First text-only: allow AI to think. Second+: gentle guidance.
      if (textOnlyStreak >= 2) {
        const nudge = "When you're ready, please use the available tools to proceed. Start with draft_storyboard if you haven't yet.";
        messages.push({ role: "user", parts: [{ text: nudge }] });
        recordUserMessage(budget, nudge);
      }
      continue;
    }

    // AI called tools — reset streak
    textOnlyStreak = 0;

    if (textParts.length > 0) {
      const reasoning = textParts.map((p) => p.text).join("");
      console.log("[Agent] AI reasoning:", reasoning.slice(0, 300) + (reasoning.length > 300 ? "..." : ""));
    }

    messages.push({ role: "model", parts: result.parts as GeminiPart[] });

    // Execute each function call
    const responseParts: GeminiPart[] = [];
    let terminalScript: Record<string, unknown> | null = null;

    for (const part of functionCalls) {
      const { name, args } = part.functionCall!;
      report(i, `tool:${name}`, JSON.stringify(args).slice(0, 200));

      const executor = getToolExecutor(name);
      if (!executor) {
        // RM-143c: is_error flag
        responseParts.push({
          functionResponse: {
            name,
            response: { error: `Unknown tool: ${name}`, is_error: true },
          },
        });
        continue;
      }

      try {
        const toolResult = await executor(args, context);
        const resultKeys = Object.keys(toolResult.result);
        console.log(`[Agent] Tool "${name}" returned: { ${resultKeys.join(", ")} }`);

        calledTools.add(name);

        // Capture terminal result — don't return yet (hooks run after inner loop)
        if (name === "produce_script" && toolResult.result.terminal) {
          terminalScript = toolResult.result.script as Record<string, unknown>;
        }

        responseParts.push({
          functionResponse: { name, response: toolResult.result },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report(i, `tool_error:${name}`, msg);
        // RM-143c: is_error flag
        responseParts.push({
          functionResponse: { name, response: { error: msg, is_error: true } },
        });
      }
    }

    // Send tool results back to AI
    messages.push({ role: "user", parts: responseParts });
    recordToolResults(budget, responseParts as Array<{ functionResponse?: { name: string; response: Record<string, unknown> } }>);

    // --- Budget decision ---
    const budgetDecision = checkBudget(budget);
    if (budgetDecision.action !== "continue") {
      report(i, "budget_" + budgetDecision.action,
        `${budgetDecision.pctUsed}% — ${budgetDecision.message}`);
    }
    if (budgetDecision.action === "force_finish" && !terminalScript) {
      messages.push({
        role: "user",
        parts: [{ text: budgetDecision.message + " Do not call any other tools." }],
      });
      recordUserMessage(budget, budgetDecision.message);
      continue;
    }

    // --- Post-tool hooks: only when produce_script returned terminal ---
    if (terminalScript) {
      // RM-143a: PostToolUse — storyboard advisory (one-time)
      if (!calledTools.has("draft_storyboard") && !storyboardAdvisoryGiven) {
        storyboardAdvisoryGiven = true;
        report(i, "advisory", "No storyboard drafted before produce_script");
        const advisory = "Note: You produced a script without drafting a storyboard. " +
          "Scripts without narrative planning typically lack: " +
          "a compelling hook (scene 1), emotional arc (tension → climax), and action close. " +
          "Consider calling draft_storyboard first and then produce_script again with an improved narrative.";
        messages.push({ role: "user", parts: [{ text: advisory }] });
        recordUserMessage(budget, advisory);
        terminalScript = null;
        continue; // AI gets a chance to revise
      }

      // RM-157: PostToolUse — visual direction advisory (one-time)
      if (!calledTools.has("direct_visuals") && !visualAdvisoryGiven) {
        visualAdvisoryGiven = true;
        report(i, "advisory", "No visual direction before produce_script");
        const advisory = "You produced a script without visual direction. " +
          "Call direct_visuals to plan visual metaphors for each scene — " +
          "decide where to use SVG diagrams, maps, progress gauges, comparisons, or timelines " +
          "instead of defaulting to bar-chart/pie-chart for everything.";
        messages.push({ role: "user", parts: [{ text: advisory }] });
        recordUserMessage(budget, advisory);
        terminalScript = null;
        continue;
      }

      // RM-143b: Stop hook — deterministic quality gate
      const checks = runStopChecks(terminalScript);
      if (!checks.pass && !stopRetried) {
        stopRetried = true;
        report(i, "quality_gate", checks.issues.join("; "));
        const qualityMsg = "Quality check found issues with the script:\n" +
          checks.issues.map((s) => "- " + s).join("\n") +
          "\nPlease fix these issues and call produce_script again.";
        messages.push({ role: "user", parts: [{ text: qualityMsg }] });
        recordUserMessage(budget, qualityMsg);
        terminalScript = null;
        continue; // one retry
      }

      // RM-155: Evaluate gate — AI quality check (one retry)
      if (!evalRetried) {
        try {
          report(i, "evaluate", "Running AI quality evaluation...");
          const evalResult = await evaluateScriptJson(context.userPrompt, terminalScript);
          if (!evalResult.pass && evalResult.issues.length > 0) {
            evalRetried = true;
            report(i, "evaluate_retry", evalResult.issues.join("; "));
            const evalMsg = "AI evaluation found issues with the script:\n" +
              evalResult.issues.map((s) => "- " + s).join("\n") +
              "\nPlease fix these issues and call produce_script again.";
            messages.push({ role: "user", parts: [{ text: evalMsg }] });
            recordUserMessage(budget, evalMsg);
            terminalScript = null;
            continue; // one retry
          }
        } catch (err) {
          console.warn("[Agent] Evaluate failed (non-fatal), accepting script:", err);
        }
      }

      // All gates passed — accept and return
      const finalScript = terminalScript!;
      const sceneCount = (finalScript.scenes as unknown[])?.length ?? "?";
      report(i, "produce_script", `Script produced — ${sceneCount} scenes`);
      console.log("[Agent] Final script:", JSON.stringify(finalScript).slice(0, 500) + "...");
      return { scriptJson: finalScript, conversationLog: log, iterations: i, budgetSummary: getBudgetSummary(budget) };
    }
  }

  // Max iterations reached — force JSON output
  report(MAX_ITERATIONS, "max_reached", "Requesting final output...");
  const forceMsg = "You have reached the maximum number of iterations. Please output the final VideoScript JSON now. Return ONLY the JSON object.";
  messages.push({ role: "user", parts: [{ text: forceMsg }] });
  recordUserMessage(budget, forceMsg);
  const finalResult = await callGeminiRaw(systemPrompt, messages, {
    temperature: 0.5,
    jsonOutput: true,
  });

  const finalText = finalResult.parts.find((p) => p.text)?.text;
  if (!finalText) {
    throw new ClassifiedError(
      "AGENT_NO_OUTPUT",
      "Agent loop ended without producing a script — Gemini returned no text.",
    );
  }

  try {
    const parsed = JSON.parse(finalText);
    report(MAX_ITERATIONS, "force_output", "Parsed forced JSON output");
    return { scriptJson: parsed, conversationLog: log, iterations: MAX_ITERATIONS, budgetSummary: getBudgetSummary(budget) };
  } catch (parseErr) {
    logError("Agent", "AGENT_MAX_ITERATIONS", parseErr, {
      responseLength: finalText.length,
      responsePreview: finalText.slice(0, 200),
    });
    throw new ClassifiedError(
      "AGENT_MAX_ITERATIONS",
      `Agent forced output was not valid JSON (${finalText.length} chars)`,
    );
  }
}
