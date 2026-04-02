/**
 * ScenePlan Validator — deterministic rhythm checks.
 *
 * Pure functions, ~0ms execution. No AI calls.
 * Validates that AI's visual rhythm plan meets diversity and rhythm rules.
 *
 * Rules are scene-count-aware: short videos (2-4 scenes) have relaxed thresholds.
 */

import type { ScenePlan, ScenePlanEntry } from "../types/scenePlan";

export type ValidationResult = {
  pass: boolean;
  issues: string[];
};

/**
 * Run all rhythm validation checks on a ScenePlan.
 */
export function validateScenePlan(plan: ScenePlan): ValidationResult {
  const issues: string[] = [];
  const scenes = plan.scenes;
  const n = scenes.length;

  if (n === 0) {
    return { pass: false, issues: ["ScenePlan has no scenes."] };
  }

  // Guard: 1-scene videos pass trivially
  if (n === 1) {
    return { pass: true, issues: [] };
  }

  // 1. Layout repetition: no 3 consecutive same (applies when n >= 3)
  if (n >= 3) {
    checkConsecutive(scenes, "layout", 3, issues, "layout");
  }

  // 2. Hero element repetition: no 3 consecutive same (applies when n >= 3)
  if (n >= 3) {
    checkConsecutive(scenes, "heroElement", 3, issues, "hero element");
  }

  // 3. Element diversity: 2-4 scenes => >=3, 5+ scenes => >=5
  const allElements = new Set<string>();
  for (const s of scenes) {
    allElements.add(s.heroElement);
    for (const sup of s.supportElements) allElements.add(sup);
  }
  const minElements = n >= 5 ? 5 : 3;
  if (allElements.size < minElements) {
    issues.push(
      `Only ${allElements.size} unique element types — need ≥${minElements} for ${n} scenes. ` +
      `Use more diverse hero/support elements (svg, comparison, timeline, progress, map).`,
    );
  }

  // 4. Transition diversity: 2-4 scenes => >=2, 5+ scenes => >=4; no 3 consecutive same
  const transitions = new Set(scenes.map((s) => s.transition));
  const minTransitions = n >= 5 ? 4 : 2;
  if (transitions.size < minTransitions) {
    issues.push(
      `Only ${transitions.size} unique transition(s) — need ≥${minTransitions}. ` +
      `Available: fade, slide, wipe, clock-wipe, radial-wipe, diamond-wipe, iris, zoom-out, zoom-blur, slide-up, split, rotate, dissolve, pixelate.`,
    );
  }
  if (n >= 3) {
    checkConsecutive(scenes, "transition", 3, issues, "transition");
  }

  // 5. Background diversity: no 3 consecutive same mode (applies when n >= 3)
  if (n >= 3) {
    checkConsecutive(scenes, "backgroundMode", 3, issues, "background mode");
  }

  // 6. Breathing scene: at least 1 scene with energy "low" (applies when n >= 5)
  if (n >= 5) {
    const hasBreathing = scenes.some((s) => s.energy === "low");
    if (!hasBreathing) {
      issues.push(
        "No breathing scene (energy: 'low') found. Videos with 5+ scenes need at least 1 low-energy moment for visual rhythm.",
      );
    }
  }

  // 7. Climax scene: at least 1 scene with energy "high" (applies when n >= 3)
  if (n >= 3) {
    const hasClimax = scenes.some((s) => s.energy === "high");
    if (!hasClimax) {
      issues.push(
        "No high-energy scene found. Include at least 1 scene with energy: 'high' for visual impact (climax or hook).",
      );
    }
  }

  // 8. Effect budget: max 3 scenes with backgroundMode "effect"
  const effectScenes = scenes.filter((s) => s.backgroundMode === "effect");
  if (effectScenes.length > 3) {
    issues.push(
      `Too many effect backgrounds (${effectScenes.length}) — max 3. Canvas effects are GPU-intensive.`,
    );
  }

  // 9. Gradient/image presence: at least 1 non-solid background (applies when n >= 5)
  if (n >= 5) {
    const hasRich = scenes.some(
      (s) => s.backgroundMode === "gradient" || s.backgroundMode === "image" || s.backgroundMode === "effect",
    );
    if (!hasRich) {
      issues.push(
        "All backgrounds are solid colors (dark/light/accent). Add at least 1 gradient, image, or effect background for visual depth.",
      );
    }
  }

  // 10. Stagger variety: at least 2 different stagger values (applies when n >= 4)
  if (n >= 4) {
    const staggers = new Set(scenes.map((s) => s.stagger));
    if (staggers.size < 2) {
      issues.push(
        `All scenes use the same stagger ('${scenes[0].stagger}'). Vary between tight/normal/relaxed/dramatic for pacing.`,
      );
    }
  }

  return { pass: issues.length === 0, issues };
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Check that no `maxRun` consecutive scenes share the same value for `field`.
 */
function checkConsecutive(
  scenes: ScenePlanEntry[],
  field: keyof ScenePlanEntry,
  maxRun: number,
  issues: string[],
  label: string,
): void {
  let run = 1;
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i][field] === scenes[i - 1][field]) {
      run++;
      if (run >= maxRun) {
        issues.push(
          `${maxRun} consecutive scenes (${i - maxRun + 2}–${i + 1}) use the same ${label} ('${String(scenes[i][field])}'). Alternate for visual rhythm.`,
        );
        break;
      }
    } else {
      run = 1;
    }
  }
}
