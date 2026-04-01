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
  const audienceMode = toolResult.audience_mode as StoryboardPlan["audienceMode"] | undefined;
  return {
    storyboard,
    sceneCount: Number(toolResult.scene_count ?? 7),
    colorMood: String(toolResult.color_mood ?? "professional"),
    pacing: String(toolResult.pacing ?? "steady"),
    climaxScene: toolResult.climax_scene as number | undefined,
    scenePlan: parseScenePlan(storyboard),
    userPrompt,
    dataContext: userMessage,
    audienceMode: audienceMode ?? "mixed",
    storyMode: "adapted-apple",
    coreTakeaway: toolResult.core_takeaway ? String(toolResult.core_takeaway) : undefined,
    hookStatement: toolResult.hook_statement ? String(toolResult.hook_statement) : undefined,
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
    `Story mode: ${plan.storyMode ?? "adapted-apple"}`,
    `Audience: ${plan.audienceMode ?? "mixed"}`,
    `Scenes: ${plan.sceneCount}`,
    `Color mood: ${plan.colorMood}`,
    `Pacing: ${plan.pacing}`,
    plan.climaxScene != null ? `Climax scene: ${plan.climaxScene}` : "",
    plan.coreTakeaway ? `Core takeaway: ${plan.coreTakeaway}` : "",
    plan.hookStatement ? `Hook statement: ${plan.hookStatement}` : "",
    "",
    "## Narrative Plan",
    plan.storyboard,
  ];
  if (plan.scenePlan.length > 0) {
    lines.push("", "## Scene-by-Scene Breakdown (Apple 6-Beat)");
    for (const s of plan.scenePlan) {
      const beatLabel = s.beat ?? s.role;
      lines.push(
        `Scene ${s.sceneNumber} [${beatLabel}]: ${s.insight}`,
        `  So What: ${s.soWhat}`,
        `  Suggested elements: ${s.elementHints.join(", ")}`,
        `  Duration: ${s.duration}`,
      );
    }
  }
  return lines.filter(Boolean).join("\n");
}

/** Apple 6-beat values (source of truth) */
const APPLE_BEATS = new Set(["hook", "why-it-matters", "how-it-works", "proof", "climax", "resolution"]);
/** Legacy roles kept for backward compatibility */
const LEGACY_ROLES = new Set(["context", "tension", "evidence", "breathing", "close"]);
/** Map legacy roles to nearest Apple beat for the `beat` field */
const LEGACY_TO_BEAT: Record<string, string> = {
  context: "why-it-matters",
  tension: "how-it-works",
  evidence: "proof",
  breathing: "proof",
  close: "resolution",
};

/** Best-effort parse of scene plan from storyboard text. */
function parseScenePlan(storyboard: string): StoryboardPlan["scenePlan"] {
  const scenes: StoryboardPlan["scenePlan"] = [];

  const scenePattern = /\[?Scene\s*(\d+)[:\s]*([A-Za-z-]+)\]?[:\s]*(.*?)(?=\[?Scene\s*\d+|$)/gis;
  let match;
  while ((match = scenePattern.exec(storyboard)) !== null) {
    const num = parseInt(match[1], 10);
    const rawRole = match[2].toLowerCase();
    const block = match[3].trim();

    const insightMatch = block.match(/Insight:\s*(.+?)(?:\||$)/i);
    const soWhatMatch = block.match(/So What:\s*(.+?)(?:\||$)/i);
    const elemMatch = block.match(/Suggested elements?:\s*(.+?)(?:\||$)/i);
    const durMatch = block.match(/Duration:\s*(short|medium|long)/i);

    // Determine role: prefer Apple beat, fallback to legacy, default to "proof"
    let role: StoryboardPlan["scenePlan"][0]["role"];
    if (APPLE_BEATS.has(rawRole)) {
      role = rawRole as StoryboardPlan["scenePlan"][0]["role"];
    } else if (LEGACY_ROLES.has(rawRole)) {
      role = rawRole as StoryboardPlan["scenePlan"][0]["role"];
    } else {
      role = "proof";
    }

    // Derive Apple beat — source of truth for visual grammar mapping
    const beat = APPLE_BEATS.has(rawRole)
      ? rawRole as StoryboardPlan["scenePlan"][0]["beat"]
      : (LEGACY_TO_BEAT[rawRole] as StoryboardPlan["scenePlan"][0]["beat"]) ?? "proof";

    scenes.push({
      sceneNumber: num,
      role,
      beat,
      insight: insightMatch?.[1]?.trim() ?? block.slice(0, 120),
      soWhat: soWhatMatch?.[1]?.trim() ?? "",
      elementHints: elemMatch?.[1]?.split(",").map((s) => s.trim()) ?? [],
      duration: (durMatch?.[1]?.toLowerCase() as "short" | "medium" | "long") ?? "medium",
    });
  }
  return scenes;
}
