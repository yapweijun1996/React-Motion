/**
 * Canonical source for all Agent behavior parameters.
 * This file must remain a leaf module — no imports from other src/services files.
 *
 * Centralizes iteration limits, budget thresholds, temperature controls,
 * retry configurations, and behavioral thresholds that were previously
 * scattered across 8+ files. Single place to tune agent behavior.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. ITERATION LIMITS — controls how many turns each agent phase gets
// ═══════════════════════════════════════════════════════════════════

/**
 * Single-agent OODAE loop max turns.
 * Too low → agent can't complete OODAE steps. Too high → token waste on looping.
 * Range: 8–16. Current 12 lets OODAE 8-step + 4 retries.
 */
export const SINGLE_AGENT_MAX_ITERATIONS = 12;

/**
 * Multi-agent Phase 1: Storyboard Agent (编剧) max turns.
 * Only needs analyze_data + draft_storyboard, so 4 is generous.
 * Range: 2–6.
 */
export const MULTI_STORYBOARD_MAX_ITERATIONS = 4;

/**
 * Multi-agent Phase 2: Visual Director Agent (导演) max turns.
 * Needs generate_palette + direct_visuals + produce_script — more complex.
 * Range: 4–8.
 */
export const MULTI_DIRECTOR_MAX_ITERATIONS = 6;

/**
 * Multi-agent retry phase max turns (quality gate / reviewer feedback).
 * Just enough to fix issues and re-call terminal tool.
 * Range: 1–3.
 */
export const MULTI_RETRY_MAX_ITERATIONS = 2;

/**
 * Multi-agent progress report display cap (UI only, not a real limit).
 * Shown as "Turn X / Y" in GenerationProgressBar.
 */
export const MULTI_REPORT_MAX_ITERATIONS = 12;

// ═══════════════════════════════════════════════════════════════════
// 2. BUDGET THRESHOLDS — token budget tracking & pressure system
// ═══════════════════════════════════════════════════════════════════

/**
 * Total token budget for an entire agent loop run.
 * ~600K chars at 1 token ≈ 4 chars. Shared across all phases in multi-agent.
 * Too low → premature force_finish. Too high → runaway cost.
 * Range: 80_000–300_000.
 */
export const DEFAULT_BUDGET_TOKENS = 150_000;

/**
 * Budget percentage that triggers "warn" — lower temperature, restrict tools.
 * Range: 0.5–0.8.
 */
export const BUDGET_WARN_THRESHOLD = 0.70;

/**
 * Budget percentage that triggers "force_finish" — must call produce_script NOW.
 * Range: 0.8–0.95.
 */
export const BUDGET_FORCE_THRESHOLD = 0.90;

/**
 * Number of consecutive low-output turns before detecting diminishing returns.
 * Range: 2–4.
 */
export const DIMINISHING_TURNS = 2;

/**
 * Minimum tokens per turn to NOT be considered "diminishing".
 * If model produces less than this for DIMINISHING_TURNS consecutive turns → force finish.
 * Range: 50–200.
 */
export const DIMINISHING_MIN_TOKENS = 100;

// ═══════════════════════════════════════════════════════════════════
// 3. TEMPERATURE CONTROL — creativity vs determinism per context
// ═══════════════════════════════════════════════════════════════════

/**
 * Default temperature for Gemini API calls (legacy single-shot, fallback).
 * Range: 0.3–1.0.
 */
export const TEMP_DEFAULT = 0.7;

/**
 * Normal agent loop temperature — balanced creativity for storyboarding & scripting.
 * Range: 0.6–1.0.
 */
export const TEMP_NORMAL = 0.8;

/**
 * Budget-pressure temperature — lower creativity to focus on output completion.
 * Also used for forced JSON output at max iterations.
 * Range: 0.3–0.6.
 */
export const TEMP_PRESSURE = 0.5;

/**
 * Quality Reviewer temperature — lowest, for consistent independent evaluation.
 * Range: 0.1–0.4.
 */
export const TEMP_REVIEWER = 0.3;

// ═══════════════════════════════════════════════════════════════════
// 4. RETRY CONFIGURATION — exponential backoff for transient errors
// ═══════════════════════════════════════════════════════════════════

/**
 * HTTP status codes considered transient (worth retrying).
 * 429 = rate limit, 500/502/503 = server errors.
 */
export const RETRYABLE_HTTP_CODES = ["429", "500", "502", "503"] as const;

/** TTS max retry attempts (exponential backoff: 2s, 4s, 8s). Range: 1–5. */
export const TTS_MAX_RETRIES = 3;

/** TTS base delay before first retry (ms). Doubles each attempt. */
export const TTS_RETRY_BASE_MS = 2000;

/** Background music max retry attempts. Range: 1–3. */
export const BGM_MAX_RETRIES = 2;

/** Background music base delay before first retry (ms). */
export const BGM_RETRY_BASE_MS = 2000;

/** JSON parse retry attempts in legacy generateScript fallback. Range: 1–3. */
export const JSON_PARSE_MAX_RETRIES = 2;

// ═══════════════════════════════════════════════════════════════════
// 5. BEHAVIOR THRESHOLDS — agent loop behavioral triggers
// ═══════════════════════════════════════════════════════════════════

/**
 * Number of consecutive text-only (no tool call) responses before
 * injecting a nudge message to guide AI back to tool usage.
 * Range: 1–3.
 */
export const TEXT_ONLY_NUDGE_THRESHOLD = 2;
