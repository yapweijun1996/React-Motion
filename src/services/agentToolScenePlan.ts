/**
 * plan_visual_rhythm tool — AI plans full-video visual rhythm before scripting.
 *
 * Non-terminal tool. Stores ScenePlan in shared state for produce_script to consume.
 * Runs deterministic validation (scenePlanValidator) before accepting.
 *
 * Flow: AI calls plan_visual_rhythm → validator checks rhythm rules →
 *       plan stored in shared state → AI calls produce_script with plan as context.
 */

import {
  register,
  setLastScenePlan,
} from "./agentToolRegistry";
import { validateScenePlan } from "./scenePlanValidator";
import type { ScenePlan, ScenePlanEntry } from "../types/scenePlan";

// ═══════════════════════════════════════════════════════════════════
// Tool declaration
// ═══════════════════════════════════════════════════════════════════

register(
  {
    name: "plan_visual_rhythm",
    description:
      "Plan the visual rhythm for the entire video BEFORE generating the script. " +
      "Call this after drafting a storyboard and before produce_script. " +
      "Output per-scene visual decisions: layout, background mode, transition, energy, hero element. " +
      "The validator enforces rhythm rules (no 3 consecutive same layout/hero/background, " +
      "minimum element diversity, breathing + climax scenes required). " +
      "If validation fails, you get specific issues to fix and should call this tool again.",
    parameters: {
      type: "object",
      properties: {
        visualThesis: {
          type: "string",
          description:
            "1-sentence overall visual direction for the video, e.g. " +
            "'Dark cinematic palette with data bursts on key insights'",
        },
        rhythmPattern: {
          type: "string",
          description:
            "Rhythm label, e.g. 'build-build-breathe-climax-resolve'",
        },
        scenes: {
          type: "array",
          description: "Per-scene visual plan entries",
          items: {
            type: "object",
            properties: {
              index: { type: "number", description: "0-based scene index" },
              purpose: {
                type: "string",
                enum: ["hook", "why-it-matters", "how-it-works", "proof", "climax", "resolution"],
                description: "Apple 6-beat role for this scene",
              },
              heroElement: {
                type: "string",
                description: "Primary element type, e.g. 'bar-chart', 'metric', 'svg', 'comparison'",
              },
              supportElements: {
                type: "array",
                items: { type: "string" },
                description: "Secondary element types",
              },
              layout: {
                type: "string",
                enum: ["column", "center", "row"],
              },
              backgroundMode: {
                type: "string",
                enum: ["dark", "light", "accent", "gradient", "image", "effect"],
              },
              bgEffectType: {
                type: "string",
                enum: ["bokeh", "flow", "rising"],
                description: "Only set when backgroundMode is 'effect'",
              },
              transition: {
                type: "string",
                description: "Transition to next scene: fade, slide, wipe, clock-wipe, etc.",
              },
              energy: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "low=subtle/breathing, medium=standard, high=bold/climax",
              },
              stagger: {
                type: "string",
                enum: ["tight", "normal", "relaxed", "dramatic"],
              },
              rationale: {
                type: "string",
                description: "Why this scene uses these visual choices",
              },
            },
            required: [
              "index", "purpose", "heroElement", "supportElements",
              "layout", "backgroundMode", "transition", "energy",
              "stagger", "rationale",
            ],
          },
        },
      },
      required: ["visualThesis", "rhythmPattern", "scenes"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Executor
  // ═══════════════════════════════════════════════════════════════════

  async (args) => {
    const plan: ScenePlan = {
      visualThesis: String(args.visualThesis ?? ""),
      rhythmPattern: String(args.rhythmPattern ?? ""),
      scenes: parseSceneEntries(args.scenes),
    };

    // Run deterministic validation
    const validation = validateScenePlan(plan);

    if (!validation.pass) {
      return {
        result: {
          success: false,
          issues: validation.issues,
          hint: "Fix the issues above and call plan_visual_rhythm again.",
        },
      };
    }

    // Store in shared state for produce_script to consume
    setLastScenePlan(plan);

    return {
      result: {
        success: true,
        scenePlan: plan,
        hint:
          "Visual rhythm plan accepted. Now call produce_script. " +
          "Your script MUST match the plan's layout and backgroundMode per scene. " +
          "You may adjust heroElement if data structure demands it.",
      },
    };
  },
);

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function parseSceneEntries(raw: unknown): ScenePlanEntry[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((s, i) => ({
    index: typeof s.index === "number" ? s.index : i,
    purpose: String(s.purpose ?? "hook") as ScenePlanEntry["purpose"],
    heroElement: String(s.heroElement ?? "text"),
    supportElements: Array.isArray(s.supportElements)
      ? (s.supportElements as unknown[]).map(String)
      : [],
    layout: String(s.layout ?? "column") as ScenePlanEntry["layout"],
    backgroundMode: String(s.backgroundMode ?? "dark") as ScenePlanEntry["backgroundMode"],
    bgEffectType: s.bgEffectType ? String(s.bgEffectType) as ScenePlanEntry["bgEffectType"] : undefined,
    transition: String(s.transition ?? "fade"),
    energy: String(s.energy ?? "medium") as ScenePlanEntry["energy"],
    stagger: String(s.stagger ?? "normal") as ScenePlanEntry["stagger"],
    rationale: String(s.rationale ?? ""),
  }));
}
