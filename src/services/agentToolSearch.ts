/**
 * search_reference tool — structures AI's search intent for Google Search grounding.
 * Sits in Observe/Orient phase: generates targeted queries so AI can ground
 * its narrative in real-world benchmarks, case studies, and trends.
 */
import { register } from "./agentToolRegistry";

const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Focus configs: query templates + reference angles
// ---------------------------------------------------------------------------

type FocusKey = "benchmark" | "case_study" | "trend" | "comparison";

type FocusConfig = {
  buildQuery: (t: string, ind: string, reg: string) => string;
  angles: string[];
};

const FOCUS_MAP: Record<FocusKey, FocusConfig> = {
  benchmark: {
    buildQuery: (t, ind, reg) =>
      clean(`${t} ${ind} industry benchmark average ${reg} ${CURRENT_YEAR}`),
    angles: [
      "industry average & median",
      "top-quartile performance",
      "year-over-year benchmark shift",
    ],
  },
  case_study: {
    buildQuery: (t, ind, reg) =>
      clean(`${t} ${ind} case study real-world example ${reg}`),
    angles: [
      "company-specific outcomes",
      "implementation approach & timeline",
      "lessons learned & pitfalls",
    ],
  },
  trend: {
    buildQuery: (t, _ind, reg) =>
      clean(`${t} trend forecast ${reg} ${CURRENT_YEAR} ${CURRENT_YEAR + 1}`),
    angles: [
      "year-over-year trajectory",
      "inflection points & driving factors",
      "forecast confidence range",
    ],
  },
  comparison: {
    buildQuery: (t, ind, reg) =>
      clean(`${t} competitors market share comparison ${ind} ${reg}`),
    angles: [
      "relative positioning & ranking",
      "gap analysis between leaders and laggards",
      "competitive differentiation factors",
    ],
  },
};

const VALID_FOCUSES = new Set<string>(Object.keys(FOCUS_MAP));
const DEFAULT_FOCUSES: FocusKey[] = ["benchmark", "trend", "comparison"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collapse whitespace & trim */
function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Resolve AI parameter aliases (same pattern as generate_palette) */
function resolveParam(
  args: Record<string, unknown>,
  primary: string,
  aliases: string[],
): string {
  const v = args[primary];
  if (typeof v === "string" && v.trim()) return v.trim();
  for (const alias of aliases) {
    const a = args[alias];
    if (typeof a === "string" && a.trim()) return a.trim();
  }
  return "";
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

register(
  {
    name: "search_reference",
    description:
      "Plan targeted web searches for real-world context: industry benchmarks, " +
      "case studies, trends, comparisons. Call in Observe/Orient phase BEFORE " +
      "drafting the storyboard. Returns structured search queries — use Google " +
      "Search grounding on your next turn to execute them.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The data theme or subject to research, e.g. 'global EV market share 2025', " +
            "'SaaS churn rates by company size'.",
        },
        industry: {
          type: "string",
          description:
            "Industry vertical for context, e.g. 'fintech', 'healthcare', 'e-commerce'.",
        },
        region: {
          type: "string",
          description:
            "Geographic focus, e.g. 'North America', 'APAC', 'Germany', 'global'.",
        },
        focus: {
          type: "string",
          description:
            "Reference type to prioritize: 'benchmark' (industry averages), " +
            "'case_study' (real examples), 'trend' (forecasts), 'comparison' (competitive).",
        },
      },
      required: ["topic"],
    },
  },

  // Executor
  async (args) => {
    // 1. Resolve parameters with alias tolerance
    const topic = resolveParam(args, "topic", ["subject", "theme", "query", "data_topic"]);
    const industry = resolveParam(args, "industry", ["vertical", "sector", "domain"]);
    const region = resolveParam(args, "region", ["geography", "market", "country"]);
    const rawFocus = resolveParam(args, "focus", ["type", "search_type", "mode"]);

    // 2. Validate topic
    if (!topic) {
      return { result: { error: "topic is required and must be non-empty." } };
    }

    // 3. Determine focus list
    const focuses: FocusKey[] = VALID_FOCUSES.has(rawFocus)
      ? [rawFocus as FocusKey]
      : DEFAULT_FOCUSES;

    // 4. Build queries — always start with the raw topic
    const queries: string[] = [clean(`${topic} ${industry} ${region} ${CURRENT_YEAR}`)];
    const allAngles: string[] = [];

    for (const f of focuses) {
      const cfg = FOCUS_MAP[f];
      queries.push(cfg.buildQuery(topic, industry, region));
      allAngles.push(...cfg.angles);
    }

    // 5. Deduplicate queries
    const uniqueQueries = [...new Set(queries)];

    return {
      result: {
        queries: uniqueQueries,
        referenceAngles: allAngles,
        groundingHint:
          "Use Google Search grounding on your NEXT turn to execute these queries. " +
          "Look for quantitative data points you can cite in narration. " +
          "Cross-reference findings with the user's data for 'So What?' insights.",
      },
    };
  },
);
