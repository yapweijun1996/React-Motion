/**
 * Tool: produce_script — OODAE phase: Act (TERMINATES the loop)
 */

import { register, getLastPalette } from "./agentToolRegistry";

// ============================================================
// Tool: produce_script
// OODAE phase: Act — TERMINATES the loop
// AI outputs the final VideoScript JSON
// ============================================================

register(
  {
    name: "produce_script",
    description:
      "Output the final VideoScript JSON. This ENDS the agent loop. " +
      "Only call this after you have analyzed data, drafted a storyboard, and reviewed the element catalog. " +
      "The script must follow the VideoScript schema exactly. " +
      "Pass the entire VideoScript as a JSON **string** (not an object).",
    parameters: {
      type: "object",
      properties: {
        script_json: {
          type: "string",
          description:
            "The complete VideoScript as a JSON string, e.g. '{\"id\":\"...\",\"title\":\"...\",\"scenes\":[...]}'.",
        },
      },
      required: ["script_json"],
    },
  },
  async (args) => {
    const raw = args.script_json as string;
    let script: Record<string, unknown>;
    try {
      script = JSON.parse(raw);
    } catch {
      // Gemini may still pass an object despite the string schema — accept it
      if (typeof raw === "object" && raw !== null) {
        script = raw as unknown as Record<string, unknown>;
      } else {
        return {
          result: {
            error: "script_json is not valid JSON. Please return a valid JSON string.",
            terminal: false,
          },
        };
      }
    }
    // Auto-inject palette chartColors if AI didn't set them
    const lastPalette = getLastPalette();
    if (lastPalette) {
      const theme = (script.theme as Record<string, unknown>) ?? {};
      if (!Array.isArray(theme.chartColors) || (theme.chartColors as unknown[]).length === 0) {
        theme.chartColors = lastPalette.chart;
        script.theme = theme;
        console.log("[produce_script] Auto-injected palette.chart →", lastPalette.chart.length, "colors");
      }
    }

    return { result: { script, terminal: true } };
  },
);
