/**
 * Director Mode quality gates — visual rhythm checks for final VideoScript.
 *
 * Complements scenePlanValidator.ts (which checks the PLAN).
 * These checks verify the FINAL SCRIPT meets rhythm standards,
 * plus conformance with the ScenePlan's "must match" fields.
 *
 * Pure functions, ~0ms. No AI calls.
 */

import { getLastScenePlan } from "./agentToolRegistry";
import type { ScenePlan, BackgroundMode } from "../types/scenePlan";

/**
 * Run rhythm-specific quality checks on the final script.
 * Called from runStopChecks() in agentHooks.ts.
 */
export function checkRhythmGates(
  scenes: Record<string, unknown>[],
): string[] {
  const issues: string[] = [];
  const n = scenes.length;
  if (n < 3) return issues;

  // 1. Layout consecutive: no 3 same in a row
  checkConsecutiveField(scenes, "layout", 3, "layout", issues);

  // 2. Transition consecutive: no 3 same in a row (for 5+ scenes)
  if (n >= 5) {
    checkConsecutiveField(scenes, "transition", 3, "transition", issues);
  }

  // 3. Stagger variety: at least 2 different values (for 4+ scenes)
  if (n >= 4) {
    const staggers = new Set<string>();
    for (const scene of scenes) {
      const elements = (scene.elements as Record<string, unknown>[]) ?? [];
      for (const el of elements) {
        if (typeof el.stagger === "string") staggers.add(el.stagger);
      }
    }
    if (staggers.size > 0 && staggers.size < 2) {
      issues.push(
        `All elements use the same stagger ('${[...staggers][0]}') — vary between tight/normal/relaxed/dramatic for pacing.`,
      );
    }
  }

  // 4. Background variety (migrated from agentHooks.ts)
  const bgIssues = checkBackgroundVariety(scenes);
  issues.push(...bgIssues);

  // 5. ScenePlan conformance: layout + backgroundMode must match plan
  const plan = getLastScenePlan();
  if (plan) {
    const conformanceIssues = checkPlanConformance(scenes, plan);
    issues.push(...conformanceIssues);
  } else {
    console.log("[RhythmGate] No ScenePlan available — skipping conformance checks (degraded mode)");
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function checkConsecutiveField(
  scenes: Record<string, unknown>[],
  field: string,
  maxRun: number,
  label: string,
  issues: string[],
): void {
  let run = 1;
  for (let i = 1; i < scenes.length; i++) {
    const curr = String(scenes[i][field] ?? "");
    const prev = String(scenes[i - 1][field] ?? "");
    if (curr === prev && curr.length > 0) {
      run++;
      if (run >= maxRun) {
        issues.push(
          `${maxRun} consecutive scenes (${i - maxRun + 2}–${i + 1}) use the same ${label} ('${curr}') — alternate for visual rhythm.`,
        );
        break;
      }
    } else {
      run = 1;
    }
  }
}

/**
 * Verify final script conforms to ScenePlan's "must match" fields.
 * Must match: layout, backgroundMode (mapped to bgColor/bgGradient/bgEffect).
 */
function checkPlanConformance(
  scenes: Record<string, unknown>[],
  plan: ScenePlan,
): string[] {
  const issues: string[] = [];
  const planScenes = plan.scenes;

  for (let i = 0; i < Math.min(scenes.length, planScenes.length); i++) {
    const script = scenes[i];
    const planned = planScenes[i];

    // Layout conformance
    if (typeof script.layout === "string" && script.layout !== planned.layout) {
      issues.push(
        `Scene ${i + 1}: layout '${script.layout}' deviates from plan '${planned.layout}' — layout must match the visual rhythm plan.`,
      );
    }

    // BackgroundMode conformance: infer actual mode from script fields
    const actualMode = inferBackgroundMode(script);
    if (actualMode && actualMode !== planned.backgroundMode) {
      issues.push(
        `Scene ${i + 1}: background mode '${actualMode}' deviates from plan '${planned.backgroundMode}' — background mode must match the visual rhythm plan.`,
      );
    }
  }

  return issues;
}

/**
 * Infer background mode from script scene fields.
 * Maps concrete CSS properties back to BackgroundMode categories.
 */
function inferBackgroundMode(scene: Record<string, unknown>): BackgroundMode | null {
  if (typeof scene.bgEffect === "string" && scene.bgEffect.length > 0) return "effect";
  if (typeof scene.imagePrompt === "string" && scene.imagePrompt.length > 0) return "image";
  if (typeof scene.bgGradient === "string" && scene.bgGradient.length > 0) return "gradient";
  // Solid colors (dark/light/accent) can't be distinguished without palette — skip conformance.
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Background variety (migrated from agentHooks.ts)
// ═══════════════════════════════════════════════════════════════════

const CHART_TYPES = new Set(["bar-chart", "pie-chart", "line-chart", "sankey"]);

/** Check background canvas effect diversity (activated >= 4 scenes). */
export function checkBackgroundVariety(scenes: Record<string, unknown>[]): string[] {
  const issues: string[] = [];
  if (scenes.length < 4) return issues;

  const bgEffectScenes: { index: number; effect: string }[] = [];
  const chartWithCanvas: number[] = [];

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const effect = scene.bgEffect;
    if (typeof effect !== "string" || effect.length === 0) continue;
    bgEffectScenes.push({ index: si, effect });
    const elements = (scene.elements as Record<string, unknown>[]) ?? [];
    if (elements.some((el) => CHART_TYPES.has(String(el.type)))) chartWithCanvas.push(si + 1);
  }

  if (bgEffectScenes.length > 3) {
    issues.push(
      `Too many scenes use animated canvas background (${bgEffectScenes.length}) — reduce to 2-3 max`,
    );
  }
  if (bgEffectScenes.length >= 2) {
    const unique = new Set(bgEffectScenes.map((s) => s.effect));
    if (unique.size === 1) {
      issues.push(
        `Background canvas repeats "${bgEffectScenes[0].effect}" — use different effects (bokeh/flow/rising)`,
      );
    }
  }
  if (chartWithCanvas.length > 0) {
    issues.push(
      `Chart-heavy scene(s) ${chartWithCanvas.join(", ")} should not use bgEffect — particles compete with data`,
    );
  }
  if (scenes.length >= 5) {
    let hasGradient = false, hasImage = false;
    const hasCanvas = bgEffectScenes.length > 0;
    for (const scene of scenes) {
      if (typeof scene.bgGradient === "string" && scene.bgGradient.length > 0) hasGradient = true;
      if (typeof scene.imagePrompt === "string" && scene.imagePrompt.length > 0) hasImage = true;
    }
    if (!hasGradient && !hasImage && !hasCanvas) {
      issues.push("All scenes use plain bgColor only — add bgGradient, imagePrompt, or bgEffect on 1-2 key scenes");
    }
  }
  return issues;
}
