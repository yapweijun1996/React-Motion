/**
 * Multi-Agent Loop — three sequential phases:
 *   Phase 1: Storyboard Agent (编剧) — narrative planning
 *   Phase 2: Visual Director Agent (导演) — visual design + script production
 *   Phase 3: Quality Reviewer Agent (审核) — independent evaluation
 */

import {
  callGeminiRaw,
  getSvgModel,
  type GeminiMessage,
} from "./gemini";
import {
  resetPaletteState,
  resetScriptState,
  resetImageHints,
  type ToolContext,
} from "./agentTools";
import {
  getToolDeclarationsFiltered,
  STORYBOARD_TOOLS,
  VISUAL_DIRECTOR_TOOLS,
} from "./agentToolRegistry";
import { runStopChecks } from "./agentHooks";
import { createBudgetTracker, getBudgetSummary } from "./budgetTracker";
import { runPhase, retryPhaseWithFeedback } from "./agentPhase";
import {
  buildStoryboardPrompt,
  buildVisualDirectorPrompt,
  buildReviewerPrompt,
  formatStoryboardHandoff,
  extractStoryboardPlan,
  buildDefaultStoryboardPlan,
  parseReviewResult,
} from "./promptAgents";
import type { AgentProgress, AgentLoopResult } from "./agentLoopTypes";
import {
  DEFAULT_BUDGET_TOKENS,
  MULTI_REPORT_MAX_ITERATIONS,
  MULTI_STORYBOARD_MAX_ITERATIONS,
  MULTI_DIRECTOR_MAX_ITERATIONS,
  MULTI_RETRY_MAX_ITERATIONS,
  TEMP_REVIEWER,
} from "./agentConfig";

// ═══════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════

export async function runMultiAgentLoop(
  userMessage: string,
  context: ToolContext,
  onProgress?: (p: AgentProgress) => void,
): Promise<AgentLoopResult> {
  resetPaletteState();
  resetScriptState();
  resetImageHints();

  const log: AgentProgress[] = [];
  let totalIterations = 0;
  const budget = createBudgetTracker(0, userMessage.length, DEFAULT_BUDGET_TOKENS);

  function report(action: string, detail?: string) {
    const p: AgentProgress = {
      iteration: totalIterations,
      maxIterations: MULTI_REPORT_MAX_ITERATIONS,
      action,
      detail,
    };
    log.push(p);
    onProgress?.(p);
    console.log(`[MultiAgent] ${action}${detail ? ` — ${detail}` : ""}`);
  }

  // ═══════════════════════════════════════════════════════════
  // Phase 1: Storyboard Agent (编剧)
  // Max 4 iterations, tools: analyze_data, draft_storyboard
  // ═══════════════════════════════════════════════════════════
  report("phase1_start", "Storyboard Agent");

  const storyboardPrompt = buildStoryboardPrompt();
  const phase1 = await runPhase({
    name: "Storyboard",
    systemPrompt: storyboardPrompt,
    userMessage,
    toolDeclarations: getToolDeclarationsFiltered(STORYBOARD_TOOLS),
    maxIterations: MULTI_STORYBOARD_MAX_ITERATIONS,
    context,
    budget,
    terminalTool: "draft_storyboard",
    onProgress,
  });

  totalIterations += phase1.iterations;

  // Extract StoryboardPlan from draft_storyboard result
  const sbResult = phase1.toolResults.get("draft_storyboard");
  const plan = sbResult
    ? extractStoryboardPlan(sbResult, userMessage, context.userPrompt)
    : buildDefaultStoryboardPlan(userMessage, context.userPrompt);

  report("phase1_done", `${plan.sceneCount} scenes, mood: ${plan.colorMood}`);

  // ═══════════════════════════════════════════════════════════
  // Phase 2: Visual Director Agent (导演)
  // Max 6 iterations, tools: generate_palette, direct_visuals,
  //   produce_script, get_element_catalog
  // ═══════════════════════════════════════════════════════════
  report("phase2_start", "Visual Director Agent");

  const visualPrompt = buildVisualDirectorPrompt(plan);
  const handoffMessage = formatStoryboardHandoff(plan);

  // Use Pro model for Visual Director when storyboard mentions svg-3d
  const storyboardText = plan.storyboard ?? "";
  const needsSvgModel = /svg-3d|svg\b.*layer|layered.*diagram|3d.*architect/i.test(storyboardText);
  const svgModelOverride = needsSvgModel ? getSvgModel() : undefined;
  if (svgModelOverride) {
    console.log(`[MultiAgent] SVG-3D detected in storyboard — using model: ${svgModelOverride}`);
  }

  const phase2 = await runPhase({
    name: "VisualDirector",
    systemPrompt: visualPrompt,
    userMessage: handoffMessage,
    toolDeclarations: getToolDeclarationsFiltered(VISUAL_DIRECTOR_TOOLS),
    maxIterations: MULTI_DIRECTOR_MAX_ITERATIONS,
    context,
    budget,
    terminalTool: "produce_script",
    onProgress,
    modelOverride: svgModelOverride,
  });

  totalIterations += phase2.iterations;

  // Extract script from produce_script result
  let terminalScript = phase2.terminalResult?.script as Record<string, unknown> | null ?? null;

  if (!terminalScript) {
    report("phase2_fail", "Visual Director did not produce script");
    throw new Error("Multi-agent Phase 2 failed: produce_script not called");
  }

  // ═══════════════════════════════════════════════════════════
  // Phase 2.5: Deterministic quality gate (9 checks incl. data accuracy)
  // ═══════════════════════════════════════════════════════════
  const checks = runStopChecks(terminalScript, context.userPrompt);
  if (!checks.pass) {
    report("quality_gate", checks.issues.join("; "));
    const qualityMsg = "Quality check found issues:\n" +
      checks.issues.map((s) => "- " + s).join("\n") +
      "\nPlease fix and call produce_script again.";

    const retry = await retryPhaseWithFeedback(
      {
        name: "VisualDirector",
        systemPrompt: visualPrompt,
        toolDeclarations: getToolDeclarationsFiltered(VISUAL_DIRECTOR_TOOLS),
        maxIterations: MULTI_RETRY_MAX_ITERATIONS,
        context,
        budget,
        terminalTool: "produce_script",
        onProgress,
      },
      phase2.messages,
      qualityMsg,
    );
    totalIterations += retry.iterations;

    if (retry.terminalResult?.script) {
      terminalScript = retry.terminalResult.script as Record<string, unknown>;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Phase 3: Quality Reviewer Agent (审核)
  // Single-turn evaluation — independent from creation process
  // ═══════════════════════════════════════════════════════════
  report("phase3_start", "Quality Reviewer Agent");

  const reviewPrompt = buildReviewerPrompt();
  const reviewInput = buildReviewInput(context.userPrompt, terminalScript);

  const reviewMessages: GeminiMessage[] = [
    { role: "user", parts: [{ text: reviewInput }] },
  ];

  try {
    const reviewResult = await callGeminiRaw(reviewPrompt, reviewMessages, {
      temperature: TEMP_REVIEWER,
      jsonOutput: true,
    });

    const reviewText = reviewResult.parts.find((p) => p.text)?.text ?? "";
    const review = parseReviewResult(reviewText);
    totalIterations += 1;

    if (!review.pass && review.issues.length > 0) {
      report("phase3_issues", `${review.issues.length} issues found`);

      // Route feedback to appropriate agent (one retry max)
      const visualIssues = review.issues.filter((i) => i.target === "visual");
      const storyboardIssues = review.issues.filter((i) => i.target === "storyboard");

      // Data accuracy issues (fabricated numbers) are fixable by Visual Director
      // even when classified as "storyboard" — VD controls narration + element data.
      // Route them to Phase 2 retry instead of only logging.
      const dataAccuracyFromStoryboard = storyboardIssues.filter(
        (i) => i.category === "data_accuracy",
      );
      const pureStoryboardIssues = storyboardIssues.filter(
        (i) => i.category !== "data_accuracy",
      );

      // Visual issues + data accuracy issues → retry Phase 2
      const retryableIssues = [...visualIssues, ...dataAccuracyFromStoryboard];
      if (retryableIssues.length > 0) {
        const feedback = "Quality reviewer found issues:\n" +
          retryableIssues.map((i) => `- [${i.category}] ${i.description}`).join("\n") +
          "\nPlease fix and call produce_script again.";

        const retry = await retryPhaseWithFeedback(
          {
            name: "VisualDirector",
            systemPrompt: visualPrompt,
            toolDeclarations: getToolDeclarationsFiltered(VISUAL_DIRECTOR_TOOLS),
            maxIterations: MULTI_RETRY_MAX_ITERATIONS,
            context,
            budget,
            terminalTool: "produce_script",
            onProgress,
          },
          phase2.messages,
          feedback,
        );
        totalIterations += retry.iterations;

        if (retry.terminalResult?.script) {
          terminalScript = retry.terminalResult.script as Record<string, unknown>;
        }
      }

      // Log pure storyboard issues (narrative arc, hook phrasing) for observability.
      // These require re-running Phase 1 which is too costly for a retry.
      if (pureStoryboardIssues.length > 0) {
        report("phase3_storyboard_issues",
          pureStoryboardIssues.map((i) => i.description).join("; "));
      }
    } else {
      report("phase3_pass", "All quality checks passed");
    }
  } catch (err) {
    console.warn("[MultiAgent] Reviewer failed (non-fatal), accepting script:", err);
  }

  // ═══════════════════════════════════════════════════════════
  // Return final result
  // ═══════════════════════════════════════════════════════════
  const sceneCount = (terminalScript.scenes as unknown[])?.length ?? "?";
  report("complete", `Script produced — ${sceneCount} scenes`);

  return {
    scriptJson: terminalScript,
    conversationLog: log,
    iterations: totalIterations,
    budgetSummary: getBudgetSummary(budget),
    agentMode: "multi",
  };
}

// ═══════════════════════════════════════════════════════════════════
// Helper: build review input
// ═══════════════════════════════════════════════════════════════════

function buildReviewInput(
  userPrompt: string,
  scriptJson: Record<string, unknown>,
): string {
  // Build a summarized version of the script for review
  // Strip rendering-only fields to reduce payload
  const scenes = Array.isArray(scriptJson.scenes) ? scriptJson.scenes : [];
  const summary = scenes.map((scene: Record<string, unknown>) => {
    const elements = Array.isArray(scene.elements)
      ? scene.elements.map((el: Record<string, unknown>) => summarizeElement(el))
      : [];
    return {
      id: scene.id,
      startFrame: scene.startFrame,
      durationInFrames: scene.durationInFrames,
      layout: scene.layout,
      transition: scene.transition,
      narration: scene.narration,
      elements,
    };
  });

  return [
    "## User's Original Request",
    userPrompt,
    "",
    "## Generated Script Summary",
    JSON.stringify({ title: scriptJson.title, scenes: summary }, null, 2),
  ].join("\n");
}

function summarizeElement(el: Record<string, unknown>): Record<string, unknown> {
  const type = el.type as string;
  const base: Record<string, unknown> = { type };

  switch (type) {
    case "text": base.content = el.content; base.fontSize = el.fontSize; break;
    case "metric": base.items = el.items; break;
    case "bar-chart": base.bars = el.bars; break;
    case "pie-chart": base.slices = el.slices; break;
    case "line-chart": base.series = el.series; break;
    case "sankey": base.nodes = el.nodes; base.links = el.links; break;
    case "list": base.items = el.items; base.icon = el.icon; break;
    case "callout": base.title = el.title; base.content = el.content; break;
    case "progress": base.value = el.value; base.max = el.max; base.label = el.label; break;
    case "timeline": base.items = el.items; break;
    case "comparison": base.left = el.left; base.right = el.right; break;
    case "map": base.countries = el.countries; break;
    case "kawaii": base.character = el.character; base.mood = el.mood; break;
    case "icon": base.name = el.name; base.label = el.label; break;
    case "annotation": base.shape = el.shape; base.label = el.label; break;
    default: break;
  }

  return base;
}
