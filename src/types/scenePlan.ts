/**
 * ScenePlan — visual rhythm layer on top of StoryboardPlan.
 *
 * StoryboardPlan handles narrative structure (Apple 6-beat).
 * ScenePlan handles visual rhythm: layout, background, transition, energy.
 *
 * Flow: StoryboardPlan (narrative) → ScenePlan (visual) → VideoScript (final)
 */

import type { AppleBeat } from "./video";

// ═══════════════════════════════════════════════════════════════════
// ScenePlan — full-video visual rhythm blueprint
// ═══════════════════════════════════════════════════════════════════

export type ScenePlan = {
  /** 1-sentence overall visual direction for the entire video */
  visualThesis: string;
  /** Rhythm pattern label, e.g. "build-build-breathe-climax-resolve" */
  rhythmPattern: string;
  /** Per-scene visual decisions */
  scenes: ScenePlanEntry[];
};

export type ScenePlanEntry = {
  index: number;
  /** Aligned with AppleBeat — no separate "breathing" purpose; use energy: "low" instead */
  purpose: AppleBeat;
  /** Primary element type for this scene */
  heroElement: string;
  /** Secondary element types */
  supportElements: string[];
  /** Scene layout */
  layout: "column" | "center" | "row";
  /** Background treatment mode */
  backgroundMode: BackgroundMode;
  /** Canvas particle effect — only when backgroundMode === "effect" */
  bgEffectType?: "bokeh" | "flow" | "rising";
  /** Scene transition to next scene */
  transition: string;
  /** Visual energy level — controls animation intensity and element density */
  energy: EnergyLevel;
  /** Element entrance timing */
  stagger: "tight" | "normal" | "relaxed" | "dramatic";
  /** Why this scene uses these visual choices */
  rationale: string;
};

// ═══════════════════════════════════════════════════════════════════
// Supporting types
// ═══════════════════════════════════════════════════════════════════

export type BackgroundMode = "dark" | "light" | "accent" | "gradient" | "image" | "effect";

/**
 * Energy levels define concrete rendering behavior:
 * - low:    fade-only entrance, relaxed/dramatic stagger, max 2 elements
 * - medium: standard animations, normal stagger, up to 3 elements
 * - high:   bold animations (zoom/bounce/scale-rotate), tight stagger, up to 4 elements
 */
export type EnergyLevel = "low" | "medium" | "high";

// ═══════════════════════════════════════════════════════════════════
// Deviation tolerance — what produce_script must/may match from plan
// ═══════════════════════════════════════════════════════════════════

/**
 * Must match: layout, backgroundMode (visual rhythm skeleton)
 * May deviate: heroElement (swap if data demands), supportElements (±1), stagger (±1 level)
 * Free to decide: content, narration, data mapping, element props, entrance animations
 */
export const PLAN_MUST_MATCH = ["layout", "backgroundMode"] as const;
export const PLAN_MAY_DEVIATE = ["heroElement", "supportElements", "stagger"] as const;
