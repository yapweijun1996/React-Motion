/**
 * Cost Tracker — estimates generation cost from actual Gemini API usage metadata.
 *
 * Pricing: Google Gemini API (as of 2026-04 paid tier).
 * All prices in USD per 1M tokens (except image/music which are per-unit).
 *
 * Tracks 6 cost categories: agent, svgGen, tts, bgm, imageGen, other.
 * Each API call reports { model, inputTokens, outputTokens } or per-unit costs.
 */

// ═══════════════════════════════════════════════════════════════════
// Pricing table — update when Google changes rates
// ═══════════════════════════════════════════════════════════════════

type ModelPricing = {
  inputPerM: number;   // USD per 1M input tokens
  outputPerM: number;  // USD per 1M output tokens
};

/** Token-based model pricing (USD per 1M tokens) */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // Flash Lite 3.1
  "gemini-3.1-flash-lite-preview": { inputPerM: 0.25, outputPerM: 1.50 },
  // Flash 3.1
  "gemini-3.1-flash-preview": { inputPerM: 0.15, outputPerM: 0.60 },
  // Pro 3.1
  "gemini-3.1-pro-preview": { inputPerM: 2.00, outputPerM: 12.00 },
  // Flash 2.5 (stable)
  "gemini-2.5-flash-preview-05-20": { inputPerM: 0.15, outputPerM: 3.50 },
  "gemini-2.5-flash-preview": { inputPerM: 0.15, outputPerM: 3.50 },
  // Flash Lite 2.5
  "gemini-2.5-flash-lite-preview": { inputPerM: 0.10, outputPerM: 0.40 },
  // TTS
  "gemini-2.5-flash-preview-tts": { inputPerM: 0.50, outputPerM: 10.00 },
  // Image generation — handled separately (per-image pricing)
  "gemini-2.5-flash-image": { inputPerM: 0.30, outputPerM: 30.00 },
};

/** Fixed per-unit pricing */
const FIXED_PRICING = {
  imagePerUnit: 0.039,     // USD per generated image (1024x1024)
  bgmPerUnit: 0.04,        // USD per Lyria clip (30s)
};

// Fallback for unknown models
const DEFAULT_PRICING: ModelPricing = { inputPerM: 0.50, outputPerM: 5.00 };

// ═══════════════════════════════════════════════════════════════════
// Cost category types
// ═══════════════════════════════════════════════════════════════════

export type CostCategory = "agent" | "svgGen" | "tts" | "bgm" | "imageGen" | "other";

export type CostEntry = {
  category: CostCategory;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
};

export type CostSummary = {
  totalUsd: number;
  breakdown: Record<CostCategory, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
  callCount: number;
  entries: CostEntry[];
};

// ═══════════════════════════════════════════════════════════════════
// Tracker instance
// ═══════════════════════════════════════════════════════════════════

let entries: CostEntry[] = [];

const COST_CACHE_KEY = "rm_last_cost";

/** Reset tracker for a new generation run */
export function resetCostTracker(): void {
  entries = [];
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
    return raw ? JSON.parse(raw) : null;
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
  const pricing = findPricing(model);
  const costUsd =
    (inputTokens * pricing.inputPerM + outputTokens * pricing.outputPerM) / 1_000_000;

  entries.push({
    category,
    model: normalizeModelName(model),
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
): void {
  entries.push({
    category,
    model: normalizeModelName(model),
    inputTokens: 0,
    outputTokens: 0,
    costUsd: units * pricePerUnit,
    timestamp: Date.now(),
  });
}

/** Convenience: record BGM cost */
export function recordBgmCost(): void {
  recordUnitCost("bgm", "lyria-3-clip-preview", 1, FIXED_PRICING.bgmPerUnit);
}

/** Convenience: record image generation cost */
export function recordImageCost(imageCount: number = 1): void {
  recordUnitCost("imageGen", "gemini-2.5-flash-image", imageCount, FIXED_PRICING.imagePerUnit);
}

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════

export function getCostSummary(): CostSummary {
  const breakdown: Record<CostCategory, number> = {
    agent: 0, svgGen: 0, tts: 0, bgm: 0, imageGen: 0, other: 0,
  };

  let totalInput = 0;
  let totalOutput = 0;
  let totalUsd = 0;

  for (const e of entries) {
    breakdown[e.category] += e.costUsd;
    totalInput += e.inputTokens;
    totalOutput += e.outputTokens;
    totalUsd += e.costUsd;
  }

  return {
    totalUsd,
    breakdown,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    callCount: entries.length,
    entries: [...entries],
  };
}

/** Format cost for display: "$0.0234" or "< $0.001" */
export function formatCost(usd: number): string {
  if (usd < 0.001) return "< $0.001";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
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
  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function findPricing(model: string): ModelPricing {
  // Try exact match first
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  // Try prefix match (e.g. "gemini-3.1-pro-preview-0402" → "gemini-3.1-pro-preview")
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key) || key.startsWith(model)) return pricing;
  }
  // Fallback by keyword
  if (model.includes("flash-lite")) return MODEL_PRICING["gemini-3.1-flash-lite-preview"] ?? DEFAULT_PRICING;
  if (model.includes("pro")) return MODEL_PRICING["gemini-3.1-pro-preview"] ?? DEFAULT_PRICING;
  if (model.includes("flash")) return MODEL_PRICING["gemini-3.1-flash-preview"] ?? DEFAULT_PRICING;
  return DEFAULT_PRICING;
}

function normalizeModelName(model: string): string {
  // Strip version suffixes for cleaner display
  return model.replace(/-\d{4,}$/, "").replace(/-preview$/, "");
}
