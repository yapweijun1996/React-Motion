import type { FunctionDeclaration } from "./gemini";
import type { BusinessData } from "../types";
import { generatePalette, type PaletteScheme } from "./palette";
import { ELEMENT_CATALOG, STAGGER_SYSTEM, ELEMENT_TIPS } from "./elementCatalog";

// --- Tool result type ---

export type ToolResult = {
  result: Record<string, unknown>;
};

// --- Tool executor signature ---

export type ToolExecutor = (
  args: Record<string, unknown>,
  context: ToolContext,
) => Promise<ToolResult>;

export type ToolContext = {
  userPrompt: string;
  data?: BusinessData;
};

// --- Tool registry ---

type ToolEntry = {
  declaration: FunctionDeclaration;
  execute: ToolExecutor;
};

const TOOL_REGISTRY = new Map<string, ToolEntry>();

function register(declaration: FunctionDeclaration, execute: ToolExecutor) {
  TOOL_REGISTRY.set(declaration.name, { declaration, execute });
}

export function getToolDeclarations(): FunctionDeclaration[] {
  return Array.from(TOOL_REGISTRY.values()).map((t) => t.declaration);
}

export function getToolExecutor(name: string): ToolExecutor | undefined {
  return TOOL_REGISTRY.get(name)?.execute;
}

// ============================================================
// Tool: analyze_data
// OODAE phase: Observe + Orient
// AI calls this to compute statistics from the user's raw data
// ============================================================

register(
  {
    name: "analyze_data",
    description:
      "Analyze the user's raw data to extract insights: rankings, percentages, totals, comparisons, trends, outliers. " +
      "Call this BEFORE drafting the storyboard so you understand what the data says.",
    parameters: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: "What analysis to perform, e.g. 'rank by value', 'compute percentage share', 'find top 3 and bottom 3'.",
        },
      },
      required: ["instruction"],
    },
  },
  async (args, context) => {
    // We feed the data + instruction back as structured context.
    // The AI will interpret this on the next turn.
    const dataSnapshot = context.data
      ? JSON.stringify(context.data, null, 2)
      : extractInlineData(context.userPrompt);

    return {
      result: {
        data_snapshot: dataSnapshot,
        analysis_instruction: args.instruction,
        note: "Data provided above. Perform the requested analysis and use the results in your storyboard.",
      },
    };
  },
);

// ============================================================
// Tool: draft_storyboard
// OODAE phase: Decide
// AI writes a narrative outline before generating JSON
// ============================================================

register(
  {
    name: "draft_storyboard",
    description:
      "Write a director's storyboard BEFORE generating the final script. " +
      "You MUST plan a narrative arc: Hook → Context → Tension → Evidence → Climax → Resolution → Close. " +
      "For EACH planned scene, specify: (1) its ROLE in the arc, (2) the ONE key insight, (3) the 'So What?' interpretation, (4) which element types to use. " +
      "Also plan breathing scenes (1 per 2-3 data scenes) and pacing variation.",
    parameters: {
      type: "object",
      properties: {
        storyboard: {
          type: "string",
          description:
            "The full storyboard with narrative arc. For each scene include: " +
            "[Scene N] Role: hook/context/tension/evidence/climax/resolution/breathing/close | " +
            "Insight: the one key point | So What: interpretation for the audience | " +
            "Elements: planned element types | Duration: short/medium/long",
        },
        scene_count: {
          type: "number",
          description: "Planned number of scenes (7-12 recommended for a good narrative arc).",
        },
        color_mood: {
          type: "string",
          description: "Color palette mood, e.g. 'professional blue', 'warm corporate', 'bold contrast'.",
        },
        pacing: {
          type: "string",
          description: "Pacing variation plan, e.g. 'short hook → medium context → long evidence → dramatic climax → short close'.",
        },
        climax_scene: {
          type: "number",
          description: "Which scene number is the climax (most important finding). This scene gets clock-wipe transition and dramatic stagger.",
        },
      },
      required: ["storyboard", "scene_count"],
    },
  },
  async (args) => {
    console.log("[Tool:draft_storyboard] Scenes:", args.scene_count, "| Mood:", args.color_mood, "| Climax:", args.climax_scene);
    return {
      result: {
        storyboard: args.storyboard,
        scene_count: args.scene_count,
        color_mood: args.color_mood ?? "professional",
        pacing: args.pacing ?? "steady",
        climax_scene: args.climax_scene,
        reminders: {
          narrative_arc: "Ensure your storyboard follows: Hook → Context → Tension → Evidence → Climax → Resolution → Close",
          so_what: "Every chart/metric scene MUST include a 'So What?' interpretation in narration — don't just read data, EXPLAIN what it means",
          breathing: "Insert 1 breathing scene (single metric, kawaii, or callout) after every 2-3 data-heavy scenes",
          variety: "Use at least 4 different element types. Never use the same element type 3 scenes in a row",
          pacing: "Vary scene durations: hook=150f, context=180f, data=210f, climax=270f, close=150f",
        },
        status: "Storyboard saved. Next steps: (1) call get_element_catalog, (2) call generate_palette with your color_mood — REQUIRED, (3) produce_script using palette colors and narrative arc.",
      },
    };
  },
);

// ============================================================
// Tool: get_element_catalog
// OODAE phase: Decide
// AI discovers what visual elements are available
// ============================================================

register(
  {
    name: "get_element_catalog",
    description:
      "Get the catalog of available visual elements you can use in scenes. " +
      "Call this to discover element types, their properties, and usage tips.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  async () => {
    return {
      result: {
        elements: ELEMENT_CATALOG,
        stagger_system: STAGGER_SYSTEM,
        tips: ELEMENT_TIPS,
      },
    };
  },
);

// ============================================================
// Tool: generate_palette
// OODAE phase: Decide
// AI picks a color or mood → gets a full harmonious palette
// ============================================================

register(
  {
    name: "generate_palette",
    description:
      "Generate a harmonious color palette from a primary color (hex) or mood keyword. " +
      "Returns: primary, secondary, accent, 8 chart colors, background colors (light/dark), and text colors. " +
      "Call this BEFORE produce_script so you have a cohesive palette for the video. " +
      "Mood keywords: professional, corporate, warm, cool, bold, calm, elegant, playful, nature, tech, finance, energy.",
    parameters: {
      type: "object",
      properties: {
        color_or_mood: {
          type: "string",
          description: "A hex color (e.g. '#2563eb') OR a mood keyword (e.g. 'warm', 'tech', 'elegant').",
        },
        scheme: {
          type: "string",
          description: "Color harmony scheme: 'analogous' (default, safe), 'complementary' (high contrast), 'triadic' (vibrant), 'split-complementary' (balanced contrast), 'monochrome' (subtle).",
        },
      },
      required: ["color_or_mood"],
    },
  },
  async (args) => {
    const input = args.color_or_mood as string;
    const scheme = (args.scheme as PaletteScheme) ?? "analogous";
    const palette = generatePalette(input, scheme);

    console.log("[Tool:generate_palette] Input:", input, "| Scheme:", scheme, "| Primary:", palette.primary);

    return {
      result: {
        palette,
        usage_guide: {
          "theme.primaryColor": palette.primary,
          "theme.secondaryColor": palette.secondary,
          scene_backgrounds: "Alternate between palette.background.light and palette.background.dark",
          chart_colors: "Use palette.chart array for bar/pie/line/sankey element colors",
          text_on_dark_bg: palette.text.light,
          text_on_light_bg: palette.text.dark,
          accent_for_callouts: palette.accent,
        },
      },
    };
  },
);

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
    return { result: { script, terminal: true } };
  },
);

// --- Helpers ---

function extractInlineData(prompt: string): string {
  // Return the raw prompt as data context when no structured BusinessData provided
  return `[User's raw prompt contains inline data]:\n${prompt}`;
}
