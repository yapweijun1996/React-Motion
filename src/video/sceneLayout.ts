/**
 * Scene Layout System — responsive sizing for 1920x1080 video canvas.
 *
 * Inspired by CSS container queries: the scene container calculates a
 * density level from its elements, then each element reads responsive
 * tokens to adapt its sizing. This prevents overflow when AI generates
 * content-heavy scenes (10+ list items, 4+ metrics, etc.).
 *
 * Pure functions only — no React dependency.
 */

import type { SceneElement } from "../types";

// ---------------------------------------------------------------------------
// Density levels (like CSS breakpoints, but content-driven)
// ---------------------------------------------------------------------------

export type SceneDensity = "spacious" | "normal" | "dense" | "compact";

/** Canvas constants */
const USABLE_H = 960; // 1080 minus typical padding top+bottom

/**
 * Estimate the vertical "weight" of a single element.
 * This is a rough pixel-height estimate used only to compute density.
 */
function estimateElementHeight(el: SceneElement): number {
  switch (el.type) {
    case "text":
      return 100; // single title/paragraph
    case "metric": {
      const count = Array.isArray(el.items) ? el.items.length : 1;
      // Metrics flex-wrap, so rows = ceil(count/3)
      return Math.ceil(count / 3) * 220;
    }
    case "bar-chart": {
      const count = Array.isArray(el.bars) ? el.bars.length : 4;
      return count * 60 + 20; // barHeight + gap per bar
    }
    case "list": {
      const count = Array.isArray(el.items) ? el.items.length : 3;
      return count * 80 + 20; // line + gap per item
    }
    case "pie-chart":
      return 500;
    case "line-chart":
    case "sankey":
      return 520;
    case "timeline": {
      const count = Array.isArray(el.items) ? el.items.length : 3;
      const orient = el.orientation === "vertical" ? "vertical" : "horizontal";
      return orient === "vertical" ? count * 100 : 180;
    }
    case "comparison":
      return 400;
    case "progress":
      return 380;
    case "callout":
      return 150;
    case "divider":
      return 20;
    default:
      return 120;
  }
}

/**
 * Compute scene density from its elements.
 *
 * Uses estimated total content height vs available canvas height.
 * Returns a density level that responsive tokens are keyed on.
 */
export function computeSceneDensity(elements: SceneElement[]): SceneDensity {
  if (elements.length === 0) return "spacious";

  const totalHeight = elements.reduce(
    (sum, el) => sum + estimateElementHeight(el),
    0,
  );

  // ratio = estimated content height / usable canvas height
  const ratio = totalHeight / USABLE_H;

  if (ratio <= 0.5) return "spacious";
  if (ratio <= 0.85) return "normal";
  if (ratio <= 1.15) return "dense";
  return "compact";
}

// ---------------------------------------------------------------------------
// Responsive tokens — consumed by GenericScene and child elements
// ---------------------------------------------------------------------------

export type LayoutTokens = {
  /** Scene-level padding CSS string */
  padding: string;
  /** Gap between elements (px) */
  gap: number;
  /** Font scale multiplier (1.0 = normal) — elements multiply their base size by this */
  fontScale: number;
  /** Density level (for elements that need discrete breakpoints) */
  density: SceneDensity;
};

const TOKEN_TABLE: Record<SceneDensity, LayoutTokens> = {
  spacious: { padding: "48px 64px", gap: 32, fontScale: 1.0,  density: "spacious" },
  normal:   { padding: "36px 48px", gap: 24, fontScale: 1.0,  density: "normal" },
  dense:    { padding: "28px 40px", gap: 16, fontScale: 0.85, density: "dense" },
  compact:  { padding: "20px 32px", gap: 12, fontScale: 0.72, density: "compact" },
};

/**
 * Get responsive layout tokens for a set of scene elements.
 * This is the main API — call once per scene, pass tokens to children.
 */
export function getLayoutTokens(elements: SceneElement[]): LayoutTokens {
  const density = computeSceneDensity(elements);
  return TOKEN_TABLE[density];
}
