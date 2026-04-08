/**
 * Cost Tracker v2 — estimates generation cost from actual Gemini API usage metadata.
 *
 * Pricing: Google Gemini Developer API — Paid Standard tier (as of 2026-04-08).
 * All token prices in USD per 1M tokens (except image/music which are per-unit).
 *
 * Tracks 7 cost categories: agent, svgGen, tts, bgm, imageGen, grounding, other.
 * Each API call reports { model, inputTokens, outputTokens } or per-unit costs.
 *
 * Unknown models are NOT silently priced — they are recorded but excluded from
 * the total, and the summary is marked as "partial" with a warning.
 */

// ═══════════════════════════════════════════════════════════════════
// Pricing table — Paid Standard tier, 2026-04-08
// ═══════════════════════════════════════════════════════════════════

type ModelPricing = {
  inputPerM: number;   // USD per 1M input tokens
  outputPerM: number;  // USD per 1M output tokens
};

type TieredPricing = {
  standard: ModelPricing;       // promptTokenCount <= 200_000
  long: ModelPricing;           // promptTokenCount > 200_000
};

/** Token-based model pricing — exact model ID mapping, no keyword fallback */
const FLAT_PRICING: Record<string, ModelPricing> = {
  // Flash 2.0
  "gemini-2.0-flash": { inputPerM: 0.10, outputPerM: 0.40 },
  // Flash 2.5
  "gemini-2.5-flash": { inputPerM: 0.30, outputPerM: 2.50 },
  "gemini-2.5-flash-preview-05-20": { inputPerM: 0.30, outputPerM: 2.50 },
  "gemini-2.5-flash-preview": { inputPerM: 0.30, outputPerM: 2.50 },
  // Flash Lite 3.1
  "gemini-3.1-flash-lite-preview": { inputPerM: 0.25, outputPerM: 1.50 },
  // Flash 3
  "gemini-3-flash-preview": { inputPerM: 0.50, outputPerM: 3.00 },
  // TTS
  "gemini-2.5-flash-preview-tts": { inputPerM: 0.50, outputPerM: 10.00 },
  // Image generation — token component (per-image surcharge handled separately)
  "gemini-2.5-flash-image": { inputPerM: 0.30, outputPerM: 0 },
};

/** Pro models with tiered pricing based on prompt length */
const TIERED_PRICING: Record<string, TieredPricing> = {
  "gemini-2.5-pro": {
    standard: { inputPerM: 1.25, outputPerM: 10.00 },
    long:     { inputPerM: 2.50, outputPerM: 15.00 },
  },
  "gemini-2.5-pro-preview-05-06": {
    standard: { inputPerM: 1.25, outputPerM: 10.00 },
    long:     { inputPerM: 2.50, outputPerM: 15.00 },
  },
  "gemini-3-pro-preview": {
    standard: { inputPerM: 2.00, outputPerM: 12.00 },
    long:     { inputPerM: 4.00, outputPerM: 18.00 },
  },
  "gemini-3.1-pro-preview": {
    standard: { inputPerM: 2.00, outputPerM: 12.00 },
    long:     { inputPerM: 4.00, outputPerM: 18.00 },
  },
  "gemini-3.1-pro-preview-customtools": {
    standard: { inputPerM: 2.00, outputPerM: 12.00 },
    long:     { inputPerM: 4.00, outputPerM: 18.00 },
  },
};

/** Model alias resolution — only official confirmed aliases */
const MODEL_ALIASES: Record<string, string> = {
  // No confirmed aliases at this time — all models use their exact IDs.
  // Add entries here only when Google officially documents an alias.
};

/** Fixed per-unit pricing */
const FIXED_PRICING = {
  imagePerUnit: 0.039,     // USD per generated image (1024x1024)
  bgmPerUnit: 0.04,        // USD per Lyria clip (30s)
};

/** Grounding surcharge rates */
const GROUNDING_PRICING = {
  /** Gemini 3.x / 3.1: $14 per 1000 web search queries */
  perQueryRate: 14 / 1000,
  /** Gemini 2.x: $35 per 1000 grounded prompts */
  perPromptRate: 35 / 1000,
};

const LONG_PROMPT_THRESHOLD = 200_000;

// ═══════════════════════════════════════════════════════════════════
// Cost category types
// ═══════════════════════════════════════════════════════════════════

export type CostCategory = "agent" | "svgGen" | "tts" | "bgm" | "imageGen" | "grounding" | "other";

export type CostEntry = {
  category: CostCategory;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
  /** If false, this entry is a derived surcharge (e.g. grounding) — not a real API call. Default true. */
  countTowardApiCall?: boolean;
};

export type CostSummary = {
  version: 2;
  totalUsd: number;
  breakdown: Record<CostCategory, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
  /** Count of real external API calls (excludes derived surcharges) */
  callCount: number;
  entries: CostEntry[];
  estimateStatus: "complete" | "partial" | "legacy";
  warnings: string[];
};

// ═══════════════════════════════════════════════════════════════════
// Tracker instance
// ═══════════════════════════════════════════════════════════════════

let entries: CostEntry[] = [];
let warnings: Set<string> = new Set();

const COST_CACHE_KEY = "rm_last_cost";

/** Reset tracker for a new generation run */
export function resetCostTracker(): void {
  entries = [];
  warnings = new Set();
}

/** Persist last cost summary to localStorage for page refresh recovery */
export function saveCostToCache(summary: CostSummary): void {
  try {
    localStorage.setItem(COST_CACHE_KEY, JSON.stringify(summary));
  } catch { /* quota exceeded — non-fatal */ }
}

/** Load last cost summary from localStorage */
export function loadCostFromCache(): CostSummary | null {
  try {
    const raw = localStorage.getItem(COST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Upgrade v1 cache to v2 shape
    if (!parsed.version) return upgradeLegacySummary(parsed);
    return parsed;
  } catch { return null; }
}

/**
 * Record a token-based API call cost.
 * Call this after every Gemini API response that includes usageMetadata.
 */
export function recordTokenCost(
  category: CostCategory,
  model: string,
  inputTokens: number,
  outputTokens: number,
): void {
  const resolved = resolveModel(model);
  const pricing = findPricing(resolved, inputTokens);

  if (!pricing) {
    // Unknown model — record tokens but zero cost, mark partial
    warnings.add(`Unknown model "${model}" — cost excluded from total`);
    entries.push({
      category,
      model: normalizeModelName(resolved),
      inputTokens,
      outputTokens,
      costUsd: 0,
      timestamp: Date.now(),
    });
    return;
  }

  const costUsd =
    (inputTokens * pricing.inputPerM + outputTokens * pricing.outputPerM) / 1_000_000;

  entries.push({
    category,
    model: normalizeModelName(resolved),
    inputTokens,
    outputTokens,
    costUsd,
    timestamp: Date.now(),
  });
}

/**
 * Record a fixed per-unit cost (image generation, BGM).
 */
export function recordUnitCost(
  category: CostCategory,
  model: string,
  units: number,
  pricePerUnit: number,
  countTowardApiCall = true,
): void {
  entries.push({
    category,
    model: normalizeModelName(model),
    inputTokens: 0,
    outputTokens: 0,
    costUsd: units * pricePerUnit,
    timestamp: Date.now(),
    countTowardApiCall,
  });
}

/** Convenience: record BGM cost */
export function recordBgmCost(): void {
  recordUnitCost("bgm", "lyria-3-clip-preview", 1, FIXED_PRICING.bgmPerUnit);
}

/** Convenience: record image generation per-image output surcharge (not a separate API call) */
export function recordImageCost(imageCount: number = 1): void {
  recordUnitCost("imageGen", "gemini-2.5-flash-image", imageCount, FIXED_PRICING.imagePerUnit, false);
}

/**
 * Record grounding surcharge based on response metadata.
 *
 * @param model - The model that produced the grounded response
 * @param webSearchQueries - Array of web search queries from groundingMetadata (may be empty)
 * @param hadGroundingEvidence - Whether the response had grounding chunks/support
 */
export function recordGroundingCost(
  model: string,
  webSearchQueries: string[],
  hadGroundingEvidence: boolean,
): void {
  if (!hadGroundingEvidence && webSearchQueries.length === 0) return;

  const resolved = resolveModel(model);
  const isGemini3x = resolved.startsWith("gemini-3");

  if (isGemini3x) {
    // Gemini 3.x: per-query billing
    const uniqueQueries = [...new Set(webSearchQueries.filter(q => q.trim()))];
    if (uniqueQueries.length === 0) {
      // Grounded but no query metadata — cannot compute surcharge
      warnings.add("Grounding surcharge excluded due to missing query metadata");
      return;
    }
    const cost = uniqueQueries.length * GROUNDING_PRICING.perQueryRate;
    entries.push({
      category: "grounding",
      model: normalizeModelName(resolved),
      inputTokens: 0,
      outputTokens: 0,
      costUsd: cost,
      timestamp: Date.now(),
      countTowardApiCall: false,
    });
  } else {
    // Gemini 2.x: per-grounded-prompt billing
    if (!hadGroundingEvidence) return;
    const cost = GROUNDING_PRICING.perPromptRate;
    entries.push({
      category: "grounding",
      model: normalizeModelName(resolved),
      inputTokens: 0,
      outputTokens: 0,
      costUsd: cost,
      timestamp: Date.now(),
      countTowardApiCall: false,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════

export function getCostSummary(): CostSummary {
  const breakdown: Record<CostCategory, number> = {
    agent: 0, svgGen: 0, tts: 0, bgm: 0, imageGen: 0, grounding: 0, other: 0,
  };

  let totalInput = 0;
  let totalOutput = 0;
  let totalUsd = 0;
  let apiCallCount = 0;

  for (const e of entries) {
    breakdown[e.category] += e.costUsd;
    totalInput += e.inputTokens;
    totalOutput += e.outputTokens;
    totalUsd += e.costUsd;
    // Only count real API calls, not derived surcharges
    if (e.countTowardApiCall !== false) apiCallCount++;
  }

  const hasWarnings = warnings.size > 0;
  const hasUnpricedEntries = entries.some(e => e.costUsd === 0 && e.inputTokens > 0);

  return {
    version: 2,
    totalUsd,
    breakdown,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    callCount: apiCallCount,
    entries: [...entries],
    estimateStatus: (hasWarnings || hasUnpricedEntries) ? "partial" : "complete",
    warnings: [...warnings],
  };
}

/** Format cost for display: "US$0.0234" or "< US$0.001" */
export function formatCost(usd: number): string {
  if (usd < 0.001) return "< US$0.001";
  if (usd < 0.01) return `US$${usd.toFixed(4)}`;
  if (usd < 1) return `US$${usd.toFixed(3)}`;
  return `US$${usd.toFixed(2)}`;
}

/** Format cost summary as a single-line log string */
export function formatCostLog(summary: CostSummary): string {
  const parts = [
    `Total: ${formatCost(summary.totalUsd)}`,
    `(${summary.callCount} calls`,
    `${(summary.totalInputTokens / 1000).toFixed(1)}K in`,
    `${(summary.totalOutputTokens / 1000).toFixed(1)}K out)`,
  ];

  const cats = Object.entries(summary.breakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}:${formatCost(v)}`);

  if (cats.length > 0) parts.push(`| ${cats.join(" ")}`);

  if (summary.estimateStatus === "partial") {
    parts.push("[PARTIAL]");
  }
  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

/** Resolve model aliases and strip date suffixes for lookup */
function resolveModel(model: string): string {
  if (MODEL_ALIASES[model]) return MODEL_ALIASES[model];
  // Try stripping trailing date suffix (e.g. "-0402", "-20260408")
  const stripped = model.replace(/-\d{4,}$/, "");
  if (MODEL_ALIASES[stripped]) return MODEL_ALIASES[stripped];
  return model;
}

/** Find pricing for a resolved model. Returns null if unknown. */
function findPricing(model: string, promptTokenCount: number): ModelPricing | null {
  // 1. Exact flat match
  if (FLAT_PRICING[model]) return FLAT_PRICING[model];

  // 2. Exact tiered match
  if (TIERED_PRICING[model]) {
    return promptTokenCount > LONG_PROMPT_THRESHOLD
      ? TIERED_PRICING[model].long
      : TIERED_PRICING[model].standard;
  }

  // 3. Prefix match — model version may have extra suffix
  for (const [key, pricing] of Object.entries(FLAT_PRICING)) {
    if (model.startsWith(key)) return pricing;
  }
  for (const [key, tiered] of Object.entries(TIERED_PRICING)) {
    if (model.startsWith(key)) {
      return promptTokenCount > LONG_PROMPT_THRESHOLD ? tiered.long : tiered.standard;
    }
  }

  // 4. No match — unknown model
  return null;
}

function normalizeModelName(model: string): string {
  // Strip version suffixes for cleaner display
  return model.replace(/-\d{4,}$/, "").replace(/-preview$/, "");
}

/** Upgrade a v1 CostSummary (from old cache) to v2 shape */
function upgradeLegacySummary(v1: Record<string, unknown>): CostSummary {
  const breakdown = (v1.breakdown ?? {}) as Record<string, number>;
  // Ensure all v2 categories exist
  const fullBreakdown: Record<CostCategory, number> = {
    agent: 0, svgGen: 0, tts: 0, bgm: 0, imageGen: 0, grounding: 0, other: 0,
  };
  for (const [k, v] of Object.entries(breakdown)) {
    if (k in fullBreakdown) {
      fullBreakdown[k as CostCategory] = v;
    }
  }

  return {
    version: 2,
    totalUsd: (v1.totalUsd as number) ?? 0,
    breakdown: fullBreakdown,
    totalInputTokens: (v1.totalInputTokens as number) ?? 0,
    totalOutputTokens: (v1.totalOutputTokens as number) ?? 0,
    callCount: (v1.callCount as number) ?? 0,
    entries: (v1.entries as CostEntry[]) ?? [],
    estimateStatus: "legacy",
    warnings: ["Restored from pre-v2 cache — pricing may differ from current rates"],
  };
}
