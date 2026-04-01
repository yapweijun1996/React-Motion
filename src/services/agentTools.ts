import type { FunctionDeclaration } from "./gemini";
import type { BusinessData } from "../types";
import { generatePalette, type Palette, type PaletteScheme } from "./palette";
import { ELEMENT_CATALOG, STAGGER_SYSTEM } from "./elementCatalog";

// --- Palette state (captured by generate_palette, consumed by produce_script) ---

let lastGeneratedPalette: Palette | null = null;

/** Reset palette state between generation runs. Called at start of agentLoop. */
export function resetPaletteState(): void {
  lastGeneratedPalette = null;
}

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
    // Data is already in the user message (buildUserMessage sends it).
    // Do NOT echo it back — that doubles payload for zero benefit.
    const hasStructuredData = !!context.data?.rows?.length;
    return {
      result: {
        analysis_instruction: args.instruction,
        data_location: hasStructuredData
          ? "Structured data is in the user message above (rows, columns, aggregations)."
          : "Inline data is in the user's prompt text above.",
        note: "Perform the requested analysis on the data already in context, then use results in your storyboard.",
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
    // Reminders removed — all rules are already in the system prompt.
    return {
      result: {
        storyboard: args.storyboard,
        scene_count: args.scene_count,
        color_mood: args.color_mood ?? "professional",
        pacing: args.pacing ?? "steady",
        climax_scene: args.climax_scene,
        status: "Storyboard saved. Next: call generate_palette (REQUIRED), then produce_script.",
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
    // Full element schemas are already in the system prompt.
    // Return only a lightweight index to avoid ~12KB duplication in conversation history.
    const typeIndex = ELEMENT_CATALOG.map((e) => e.type);
    return {
      result: {
        available_types: typeIndex,
        stagger_values: Object.keys(STAGGER_SYSTEM.values),
        note: "Full element schemas and props are in your system instructions. Refer to them directly when building scenes.",
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
    lastGeneratedPalette = palette;

    return {
      result: { palette },
    };
  },
);

// ============================================================
// Tool: direct_visuals
// OODAE phase: Decide (Director)
// AI makes explicit visual decisions for each scene
// ============================================================

const RICH_VISUAL_TYPES = new Set([
  "svg", "map", "annotation", "progress", "comparison", "timeline",
]);

register(
  {
    name: "direct_visuals",
    description:
      "Visual direction for each scene — called AFTER storyboard and palette, BEFORE produce_script. " +
      "You are now the DIRECTOR: for each scene, decide the concrete visual approach. " +
      "Do NOT default to bar-chart for everything. Think: what VISUAL METAPHOR makes this data memorable? " +
      "At least 2 scenes MUST use rich visual elements (svg, map, annotation, progress, comparison, timeline). " +
      "Icons and kawaii do NOT count as rich visuals.",
    parameters: {
      type: "object",
      properties: {
        scenes: {
          type: "array",
          description: "Visual direction for each planned scene.",
          items: {
            type: "object",
            properties: {
              scene_role: {
                type: "string",
                description: "Role in narrative arc: hook/context/tension/evidence/climax/resolution/breathing/close.",
              },
              primary_element: {
                type: "string",
                description: "Main visual element type for this scene (e.g. 'bar-chart', 'svg', 'map', 'progress', 'comparison', 'timeline', 'metric').",
              },
              visual_metaphor: {
                type: "string",
                description: "How the data is visually represented. Be specific: 'SVG flowchart showing fund allocation path', 'progress ring showing 73% target achieved', 'map highlighting APAC revenue concentration'. Do NOT write 'bar chart showing values' — that's not a metaphor.",
              },
              supporting_elements: {
                type: "array",
                items: { type: "string" },
                description: "Additional elements: annotation circles on key data, icon pairs, callout for insight, etc.",
              },
              emotion: {
                type: "string",
                description: "Scene emotion: confident/alarming/celebratory/neutral/dramatic/hopeful.",
              },
            },
            required: ["scene_role", "primary_element", "visual_metaphor"],
          },
        },
      },
      required: ["scenes"],
    },
  },
  async (args) => {
    const scenes = (args.scenes as Array<Record<string, unknown>>) ?? [];
    const richCount = scenes.filter((s) =>
      RICH_VISUAL_TYPES.has(String(s.primary_element)),
    ).length;

    console.log(
      `[Tool:direct_visuals] ${scenes.length} scenes directed | ${richCount} rich visuals`,
    );

    const guidance = richCount < 2
      ? `Only ${richCount} scene(s) use rich visuals. Replace some bar-chart/pie-chart scenes with svg, map, progress, comparison, or timeline. Aim for at least 2 rich visual scenes.`
      : "Visual plan accepted. Now call produce_script — follow these visual directions for each scene.";

    return {
      result: {
        visual_plan: scenes,
        richVisualCount: richCount,
        guidance,
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
    // Auto-inject palette chartColors if AI didn't set them
    if (lastGeneratedPalette) {
      const theme = (script.theme as Record<string, unknown>) ?? {};
      if (!Array.isArray(theme.chartColors) || (theme.chartColors as unknown[]).length === 0) {
        theme.chartColors = lastGeneratedPalette.chart;
        script.theme = theme;
        console.log("[produce_script] Auto-injected palette.chart →", lastGeneratedPalette.chart.length, "colors");
      }
    }

    return { result: { script, terminal: true } };
  },
);

