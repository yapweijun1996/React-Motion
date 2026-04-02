import { register, setLastPalette, setImageHints } from "./agentToolRegistry";
import { generatePalette, type PaletteScheme } from "./palette";
import { ELEMENT_CATALOG, STAGGER_SYSTEM, SPOTLIGHT_SYSTEM, CAMERA_SYSTEM } from "./elementCatalog";

// Side-effect imports: ensure tools are registered
import "./agentToolScript";
import "./agentToolRefine";
import "./agentToolSearch";
import "./agentToolScenePlan";

// Re-export for backward compatibility
export { resetPaletteState, resetScriptState, resetImageHints, getImageHints, resetScenePlanState, getLastScenePlan, getToolDeclarations, getToolExecutor } from "./agentToolRegistry";
export type { ToolResult, ToolExecutor, ToolContext } from "./agentToolRegistry";

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
    // Detect inline numeric data in user prompt (numbers, percentages, currency, or data patterns)
    const numericPattern = /\d[\d,.]*\s*[%$€£¥]|[$€£¥]\s*\d|\d+\s*(million|billion|thousand|M|B|K)\b/gi;
    // Also detect data-rich patterns: multiple "number + unit" pairs (e.g. "0.39 AU", "88 days", "91,119 quantity")
    const dataPattern = /\d[\d,.]*\s+(?:AU|days?|hours?|km|miles?|units?|pieces?|PCS|kg|tons?|percent|points?|bps)\b/gi;
    const dataMatches = context.userPrompt.match(dataPattern) ?? [];
    const hasInlineData = numericPattern.test(context.userPrompt) || dataMatches.length >= 3;
    const hasAnyData = hasStructuredData || hasInlineData;

    if (!hasAnyData) {
      return {
        result: {
          has_data: false,
          analysis_instruction: args.instruction,
          warning: "⚠ HARD CONSTRAINT: NO numeric data found in user prompt. This is a TOPIC-ONLY request. You MUST follow No-Data Mode from your system instructions. Any invented number will be flagged as a quality violation.",
          guidance: "Build a conceptual/structural narrative. Use qualitative claims for the hook. Use process flows, categories, and principles for proof scenes. Do NOT fabricate statistics, percentages, costs, or counts. Skip draft_storyboard if you cannot do it without inventing numbers — re-read your No-Data Mode instructions first.",
        },
      };
    }

    return {
      result: {
        has_data: true,
        analysis_instruction: args.instruction,
        data_location: hasStructuredData
          ? "Structured data is in the user message above (rows, columns, aggregations)."
          : "Inline numeric data detected in the user's prompt text above.",
        note: "Perform the requested analysis on the data already in context, then use results in your storyboard. Use ONLY the numbers provided — do not invent additional data.",
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
      "Write a director's storyboard BEFORE generating the final script using the Apple 6-beat narrative contract. " +
      "You MUST plan: Hook → Why It Matters → How It Works → Proof → Climax → Resolution. " +
      "For EACH planned scene, specify: (1) its BEAT in the arc, (2) the ONE key insight, (3) the 'So What?' interpretation, (4) which element types to use. " +
      "Lead with the conclusion in the hook, not a topic title. Reserve the strongest reveal for climax. " +
      "Compress the resolution to one takeaway — no recap dumps.",
    parameters: {
      type: "object",
      properties: {
        storyboard: {
          type: "string",
          description:
            "The full storyboard with Apple 6-beat narrative arc. For each scene include: " +
            "[Scene N: BEAT] Insight: the one key point | So What: interpretation for the audience | " +
            "Suggested elements: planned element types | Duration: short/medium/long. " +
            "BEAT is one of: hook, why-it-matters, how-it-works, proof, climax, resolution.",
        },
        scene_count: {
          type: "number",
          description: "Planned number of scenes (6-9 recommended. 6 for compact, 7-8 for moderate, 9 max for complex data).",
        },
        color_mood: {
          type: "string",
          description: "Color palette mood, e.g. 'professional blue', 'warm corporate', 'bold contrast'.",
        },
        pacing: {
          type: "string",
          description: "Pacing variation plan, e.g. 'short hook → medium why → long proof → peak climax → compressed close'.",
        },
        climax_scene: {
          type: "number",
          description: "Which scene number is the climax (strongest insight). This scene gets maximum visual impact.",
        },
        audience_mode: {
          type: "string",
          description: "Audience type: business (formal/executive), product (cinematic/aspirational), education (structured/progressive), mixed (default to business-safe).",
          enum: ["business", "product", "education", "mixed"],
        },
        core_takeaway: {
          type: "string",
          description: "ONE sentence — the single most important conclusion the audience should remember.",
        },
        hook_statement: {
          type: "string",
          description: "ONE sentence — the bold, specific opening claim that states the conclusion immediately.",
        },
      },
      required: ["storyboard", "scene_count"],
    },
  },
  async (args) => {
    console.log("[Tool:draft_storyboard] Scenes:", args.scene_count, "| Mood:", args.color_mood, "| Climax:", args.climax_scene, "| Audience:", args.audience_mode);
    return {
      result: {
        storyboard: args.storyboard,
        scene_count: args.scene_count,
        color_mood: args.color_mood ?? "professional",
        pacing: args.pacing ?? "steady",
        climax_scene: args.climax_scene,
        audience_mode: args.audience_mode ?? "mixed",
        core_takeaway: args.core_takeaway,
        hook_statement: args.hook_statement,
        status: "storyboard_complete",
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
    // Return full element catalog — system prompt only has type names for brevity.
    // AI calls this to get detailed schemas, props, and usage tips before produce_script.
    const elements = ELEMENT_CATALOG.map((e) => {
      const rec = e as Record<string, unknown>;
      return {
        type: e.type,
        props: e.props,
        description: e.description,
        ...(rec.usage_tips ? { usage_tips: rec.usage_tips } : {}),
        ...(rec.svg_quality_rules ? { svg_quality_rules: rec.svg_quality_rules } : {}),
        ...(rec.markup_example ? { markup_example: rec.markup_example } : {}),
      };
    });
    return {
      result: {
        elements,
        stagger: STAGGER_SYSTEM,
        spotlight: SPOTLIGHT_SYSTEM,
        camera: CAMERA_SYSTEM,
        note: "Use these schemas when building scene elements. Any element supports spotlight:{at,duration} for cinematic focus. Each scene supports camera prop for cinematic movement.",
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
    // Gracefully handle common AI parameter naming variants
    const input = (args.color_or_mood ?? args.mood ?? args.hex ?? args.color ?? "professional") as string;
    const scheme = (args.scheme as PaletteScheme) ?? "analogous";
    const palette = generatePalette(input, scheme);

    console.log("[Tool:generate_palette] Input:", input, "| Scheme:", scheme, "| Primary:", palette.primary);
    setLastPalette(palette);

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
  "svg", "svg-3d", "map", "progress", "comparison", "timeline",
]);

register(
  {
    name: "direct_visuals",
    description:
      "Visual direction for each scene — called AFTER storyboard and palette, BEFORE produce_script. " +
      "You are now the DIRECTOR: for each scene, decide the concrete visual approach. " +
      "Do NOT default to bar-chart for everything. Think: what VISUAL METAPHOR makes this data memorable? " +
      "At least 2 scenes MUST use rich visual elements (svg, map, progress, comparison, timeline). " +
      "Icons, kawaii, and annotation do NOT count as rich visuals — annotation is decoration only.",
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
                description: "Apple 6-beat role: hook/why-it-matters/how-it-works/proof/climax/resolution (legacy: context/tension/evidence/breathing/close also accepted).",
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
              image_prompt: {
                type: "string",
                description: "Optional — AI background image prompt for this scene. Describe mood/style/lighting in 1-2 sentences (e.g. 'Soft bokeh office lighting, warm tones'). Use on 1-3 key scenes (hook, climax, close) for cinematic depth. Skip on chart-heavy scenes.",
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

    // AI sometimes sends free-text visual_direction instead of structured scenes array
    const textDirection = args.visual_direction as string | undefined;
    const richSceneIds = (args.rich_visual_scenes as number[]) ?? [];

    const directedCount = scenes.length > 0
      ? scenes.length
      : textDirection ? (textDirection.match(/\[Scene \d+\]/gi)?.length ?? 0) : 0;

    const richCount = scenes.length > 0
      ? scenes.filter((s) => RICH_VISUAL_TYPES.has(String(s.primary_element))).length
      : richSceneIds.length;

    console.log(
      `[Tool:direct_visuals] ${directedCount} scenes directed | ${richCount} rich visuals`,
    );

    // Capture image_prompt hints for post-injection into final script
    const imageHints = scenes
      .map((s, i) => ({ sceneIndex: i, imagePrompt: String(s.image_prompt ?? "") }))
      .filter((h) => h.imagePrompt);
    if (imageHints.length > 0) {
      setImageHints(imageHints);
      console.log(`[Tool:direct_visuals] Captured ${imageHints.length} image prompt hints`);
    }

    const imagePromptCount = imageHints.length;

    let guidance = richCount < 2
      ? `Only ${richCount} scene(s) use rich visuals. Replace some bar-chart/pie-chart scenes with svg, map, progress, comparison, or timeline. Aim for at least 2 rich visual scenes.`
      : "visual_plan_accepted";

    if (imagePromptCount === 0) {
      guidance += " Tip: consider adding imagePrompt on 1-3 key scenes (hook, climax, close) for AI-generated background imagery. Describe mood and lighting, not content.";
    }

    return {
      result: {
        visual_plan: scenes.length > 0 ? scenes : textDirection ?? [],
        richVisualCount: richCount,
        guidance,
      },
    };
  },
);
