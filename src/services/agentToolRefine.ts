/**
 * Tool: refine_scene — OODAE phase: Act (non-terminal by default)
 *
 * Surgically replace one scene in the stored script without rewriting everything.
 * Requires a prior produce_script call (uses lastProducedScript shared state).
 */

import { register, getLastScript, setLastScript, getLastPalette } from "./agentToolRegistry";

register(
  {
    name: "refine_scene",
    description:
      "Surgically replace ONE scene in the current script without rewriting the whole thing. " +
      "Use this after produce_script was rejected by quality checks — fix only the problematic scenes. " +
      "You can call this multiple times for different scenes. " +
      "Set is_final=true on your LAST refinement to submit the patched script for quality checks.",
    parameters: {
      type: "object",
      properties: {
        scene_index: {
          type: "number",
          description: "0-based index of the scene to replace.",
        },
        updated_scene: {
          type: "string",
          description:
            "The complete replacement scene as a JSON string. Must include id, durationInFrames, elements[], narration, transition, etc.",
        },
        reason: {
          type: "string",
          description: "Why this scene needs refinement (reference the quality issue being fixed).",
        },
        is_final: {
          type: "boolean",
          description:
            "Set to true on your LAST refinement to submit the patched script for quality checks. " +
            "Default false — script stays non-terminal for further edits.",
        },
      },
      required: ["scene_index", "updated_scene", "reason"],
    },
  },
  async (args) => {
    const script = getLastScript();
    if (!script) {
      return {
        result: {
          error: "No script to refine. Call produce_script first to generate the initial script.",
          is_error: true,
        },
      };
    }

    const scenes = script.scenes as Record<string, unknown>[];
    if (!Array.isArray(scenes)) {
      return { result: { error: "Stored script has no scenes array.", is_error: true } };
    }

    const idx = args.scene_index as number;
    if (idx < 0 || idx >= scenes.length) {
      return {
        result: {
          error: `Invalid scene_index ${idx}. Script has ${scenes.length} scenes (0-${scenes.length - 1}).`,
          is_error: true,
        },
      };
    }

    // Parse updated scene — accept JSON string or object (same tolerance as produce_script)
    const raw = args.updated_scene;
    let newScene: Record<string, unknown>;
    try {
      newScene = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
    } catch {
      return {
        result: { error: "updated_scene is not valid JSON. Please return a valid JSON string.", is_error: true },
      };
    }

    // Patch the stored script
    scenes[idx] = newScene;
    script.scenes = scenes;
    setLastScript(script);

    const isFinal = args.is_final === true;
    console.log(`[Tool:refine_scene] Scene ${idx} patched | reason: ${args.reason} | is_final: ${isFinal}`);

    if (isFinal) {
      // Auto-inject palette chartColors (same logic as produce_script)
      const lastPalette = getLastPalette();
      if (lastPalette) {
        const theme = (script.theme as Record<string, unknown>) ?? {};
        if (!Array.isArray(theme.chartColors) || (theme.chartColors as unknown[]).length === 0) {
          theme.chartColors = lastPalette.chart;
          script.theme = theme;
          console.log("[refine_scene] Auto-injected palette.chart →", lastPalette.chart.length, "colors");
        }
      }
      return { result: { script, terminal: true } };
    }

    return {
      result: {
        patched_scene_index: idx,
        scene_count: scenes.length,
        status: `Scene ${idx} refined: ${args.reason}. ` +
          "Call refine_scene again for other scenes, or set is_final=true on your last refinement.",
      },
    };
  },
);
