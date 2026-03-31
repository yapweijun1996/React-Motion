/**
 * OODAE Agent Loop — Observe → Orient → Decide → Act → Evaluate
 *
 * AI drives the loop. It decides which tools to call and when to stop.
 * We do NOT hardcode the order of tool calls.
 * Max iterations prevent infinite loops.
 */

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
  type ToolContext,
} from "./agentTools";
import { ClassifiedError, logError } from "./errors";

const MAX_ITERATIONS = 12;

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
};

export async function runAgentLoop(
  systemPrompt: string,
  userMessage: string,
  context: ToolContext,
  onProgress?: (p: AgentProgress) => void,
): Promise<AgentLoopResult> {
  const messages: GeminiMessage[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const tools: GeminiTool[] = [
    { function_declarations: getToolDeclarations() },
    { google_search: {} },
  ];

  const log: AgentProgress[] = [];

  function report(iteration: number, action: string, detail?: string) {
    const p: AgentProgress = { iteration, maxIterations: MAX_ITERATIONS, action, detail };
    log.push(p);
    onProgress?.(p);
    console.log(`[Agent] Turn ${iteration}/${MAX_ITERATIONS}: ${action}${detail ? ` — ${detail}` : ""}`);
  }

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    report(i, "thinking", "Calling Gemini with tools...");

    // Call Gemini — it may return text, tool calls, or both
    const result: GeminiCallResult = await callGeminiRaw(
      systemPrompt,
      messages,
      { tools, temperature: 0.8 },
    );

    // Collect function calls from response
    const functionCalls = result.parts.filter((p) => p.functionCall);
    const textParts = result.parts.filter((p) => p.text);

    // If no function calls, AI produced only text — shouldn't happen with tools, but handle it
    if (functionCalls.length === 0) {
      const text = textParts.map((p) => p.text).join("");
      report(i, "text_only", `${textParts.length} text parts`);
      console.log("[Agent] AI text:", text.slice(0, 300) + (text.length > 300 ? "..." : ""));
      if (text.includes('"scenes"')) {
        try {
          const parsed = JSON.parse(text);
          report(i, "fallback_json", "Parsed text as VideoScript JSON");
          return { scriptJson: parsed, conversationLog: log, iterations: i };
        } catch { /* not valid JSON, continue */ }
      }

      // Add AI response to conversation and prompt it to use tools
      messages.push({ role: "model", parts: result.parts as GeminiPart[] });
      messages.push({
        role: "user",
        parts: [{ text: "Please use the available tools. Call analyze_data or draft_storyboard first, then produce_script when ready." }],
      });
      continue;
    }

    // Log AI reasoning if it included text alongside tool calls
    if (textParts.length > 0) {
      const reasoning = textParts.map((p) => p.text).join("");
      console.log("[Agent] AI reasoning:", reasoning.slice(0, 300) + (reasoning.length > 300 ? "..." : ""));
    }

    // Add model's response (with function calls) to conversation
    messages.push({ role: "model", parts: result.parts as GeminiPart[] });

    // Execute each function call
    const responseParts: GeminiPart[] = [];

    for (const part of functionCalls) {
      const { name, args } = part.functionCall!;
      report(i, `tool:${name}`, JSON.stringify(args).slice(0, 200));

      const executor = getToolExecutor(name);
      if (!executor) {
        responseParts.push({
          functionResponse: {
            name,
            response: { error: `Unknown tool: ${name}` },
          },
        });
        continue;
      }

      try {
        const toolResult = await executor(args, context);

        // Debug: log tool result summary
        const resultKeys = Object.keys(toolResult.result);
        console.log(`[Agent] Tool "${name}" returned: { ${resultKeys.join(", ")} }`);

        // Check if this is the terminal tool (produce_script)
        if (name === "produce_script" && toolResult.result.terminal) {
          const scriptJson = toolResult.result.script as Record<string, unknown>;
          const sceneCount = (scriptJson.scenes as unknown[])?.length ?? "?";
          report(i, "produce_script", `Script produced — ${sceneCount} scenes`);
          console.log("[Agent] Final script:", JSON.stringify(scriptJson).slice(0, 500) + "...");
          return { scriptJson, conversationLog: log, iterations: i };
        }

        responseParts.push({
          functionResponse: { name, response: toolResult.result },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report(i, `tool_error:${name}`, msg);
        responseParts.push({
          functionResponse: { name, response: { error: msg } },
        });
      }
    }

    // Send tool results back to AI
    messages.push({ role: "user", parts: responseParts });
  }

  // Max iterations reached — ask AI for final output as plain JSON
  report(MAX_ITERATIONS, "max_reached", "Requesting final output...");

  messages.push({
    role: "user",
    parts: [{
      text: "You have reached the maximum number of iterations. Please output the final VideoScript JSON now. Return ONLY the JSON object.",
    }],
  });

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
    return { scriptJson: parsed, conversationLog: log, iterations: MAX_ITERATIONS };
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
