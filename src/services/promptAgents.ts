/**
 * Multi-Agent Prompt Builders — entry point for three role-specific agents.
 *
 * Prompt text lives in separate files to stay under 300-line limit:
 *   promptStoryboard.ts, promptVisualDirector.ts, promptReviewer.ts
 */

import type { StoryboardPlan, ReviewResult, ReviewIssue } from "../types";
import { STORYBOARD_PROMPT } from "./promptStoryboard";
import { VISUAL_DIRECTOR_PROMPT_TEMPLATE } from "./promptVisualDirector";
import { REVIEWER_PROMPT } from "./promptReviewer";

// ═══════════════════════════════════════════════════════════════════
// Prompt builders
// ═══════════════════════════════════════════════════════════════════

/** Agent 1: Storyboard Agent (编剧) — narrative planning specialist. */
export function buildStoryboardPrompt(): string {
  return STORYBOARD_PROMPT;
}

/** Agent 2: Visual Director Agent (导演) — visual production specialist. */
export function buildVisualDirectorPrompt(plan: StoryboardPlan): string {
  return VISUAL_DIRECTOR_PROMPT_TEMPLATE
    .replace("{{STORYBOARD_PLAN}}", formatStoryboardForPrompt(plan));
}

/** Agent 3: Quality Reviewer Agent (审核) — independent evaluator. */
export function buildReviewerPrompt(): string {
  return REVIEWER_PROMPT;
}

// ═══════════════════════════════════════════════════════════════════
// Handoff & extraction helpers
// ═══════════════════════════════════════════════════════════════════

/** Format StoryboardPlan as a user message for the Visual Director. */
export function formatStoryboardHandoff(plan: StoryboardPlan): string {
  return [
    "## Storyboard Plan",
    formatStoryboardForPrompt(plan),
    "",
    "## Original User Request",
    plan.userPrompt,
    "",
    "## Data Context",
    plan.dataContext,
  ].join("\n");
}

/** Extract StoryboardPlan from draft_storyboard tool result. */
export function extractStoryboardPlan(
  toolResult: Record<string, unknown>,
  userMessage: string,
  userPrompt: string,
): StoryboardPlan {
  const storyboard = String(toolResult.storyboard ?? "");
  return {
    storyboard,
    sceneCount: Number(toolResult.scene_count ?? 8),
    colorMood: String(toolResult.color_mood ?? "professional"),
    pacing: String(toolResult.pacing ?? "steady"),
    climaxScene: toolResult.climax_scene as number | undefined,
    scenePlan: parseScenePlan(storyboard),
    userPrompt,
    dataContext: userMessage,
  };
}

/** Parse reviewer output into structured ReviewResult. */
export function parseReviewResult(raw: string): ReviewResult {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.pass === "boolean" && Array.isArray(parsed.issues)) {
      return {
        pass: parsed.pass,
        issues: parsed.issues.map((i: Record<string, unknown>): ReviewIssue => ({
          target: i.target === "storyboard" ? "storyboard" : "visual",
          category: String(i.category ?? "unknown"),
          description: String(i.description ?? ""),
          sceneIds: Array.isArray(i.sceneIds) ? i.sceneIds.map(String) : undefined,
        })),
      };
    }
  } catch { /* parse failure — treat as pass */ }

  return { pass: true, issues: [] };
}

/** Build a default StoryboardPlan for fallback when Phase 1 fails. */
export function buildDefaultStoryboardPlan(
  userMessage: string,
  userPrompt: string,
): StoryboardPlan {
  return {
    storyboard: "Default plan: auto-generate narrative from data.",
    sceneCount: 8,
    colorMood: "professional",
    pacing: "steady",
    scenePlan: [],
    userPrompt,
    dataContext: userMessage,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════

function formatStoryboardForPrompt(plan: StoryboardPlan): string {
  const lines = [
    `Scenes: ${plan.sceneCount}`,
    `Color mood: ${plan.colorMood}`,
    `Pacing: ${plan.pacing}`,
    plan.climaxScene != null ? `Climax scene: ${plan.climaxScene}` : "",
    "",
    "## Narrative Plan",
    plan.storyboard,
  ];
  if (plan.scenePlan.length > 0) {
    lines.push("", "## Scene-by-Scene Breakdown");
    for (const s of plan.scenePlan) {
      lines.push(
        `Scene ${s.sceneNumber} [${s.role}]: ${s.insight}`,
        `  So What: ${s.soWhat}`,
        `  Suggested elements: ${s.elementHints.join(", ")}`,
        `  Duration: ${s.duration}`,
      );
    }
  }
  return lines.filter(Boolean).join("\n");
}

/** Best-effort parse of scene plan from storyboard text. */
function parseScenePlan(storyboard: string): StoryboardPlan["scenePlan"] {
  const scenes: StoryboardPlan["scenePlan"] = [];
  const validRoles = new Set(["hook", "context", "tension", "evidence", "climax", "resolution", "breathing", "close"]);

  const scenePattern = /\[?Scene\s*(\d+)[:\s]*([A-Za-z]+)\]?[:\s]*(.*?)(?=\[?Scene\s*\d+|$)/gis;
  let match;
  while ((match = scenePattern.exec(storyboard)) !== null) {
    const num = parseInt(match[1], 10);
    const rawRole = match[2].toLowerCase();
    const block = match[3].trim();

    const insightMatch = block.match(/Insight:\s*(.+?)(?:\||$)/i);
    const soWhatMatch = block.match(/So What:\s*(.+?)(?:\||$)/i);
    const elemMatch = block.match(/Suggested elements?:\s*(.+?)(?:\||$)/i);
    const durMatch = block.match(/Duration:\s*(short|medium|long)/i);

    scenes.push({
      sceneNumber: num,
      role: validRoles.has(rawRole) ? rawRole as StoryboardPlan["scenePlan"][0]["role"] : "evidence",
      insight: insightMatch?.[1]?.trim() ?? block.slice(0, 120),
      soWhat: soWhatMatch?.[1]?.trim() ?? "",
      elementHints: elemMatch?.[1]?.split(",").map((s) => s.trim()) ?? [],
      duration: (durMatch?.[1]?.toLowerCase() as "short" | "medium" | "long") ?? "medium",
    });
  }
  return scenes;
}
