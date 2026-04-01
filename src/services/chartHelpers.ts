/**
 * Shared chart helpers — formatting + color palettes.
 *
 * Replaces duplicated DEFAULT_COLORS (4 files) and formatVal (2 files)
 * with d3-format (SI prefixes) and d3-scale-chromatic (professional palettes).
 */

import { format } from "d3-format";

// ============================================================
// Chart color palette — single source of truth
// ============================================================

/**
 * Curated fallback palette: Tableau10 minus problematic yellow (#edc949)
 * and gray (#bab0ab) that have poor contrast on both light/dark backgrounds.
 * Used when no AI-generated palette is available.
 */
export const CHART_COLORS: readonly string[] = [
  "#4e79a7", // blue
  "#f28e2b", // orange
  "#e15759", // red
  "#76b7b2", // teal
  "#59a14f", // green
  "#af7aa1", // purple
  "#ff9da7", // pink
  "#9c755f", // brown
];

/**
 * Get chart color by index. Uses AI-generated palette when available,
 * falls back to curated CHART_COLORS.
 */
export function chartColor(index: number, palette?: readonly string[] | null): string {
  const colors = palette?.length ? palette : CHART_COLORS;
  return colors[index % colors.length];
}

// ============================================================
// Number formatting — d3-format SI prefixes
// ============================================================

// Pre-compiled formatters (d3-format caches internally, but explicit is clearer)
const fmtSI2 = format(".2~s");  // SI prefix, 2 significant digits, trim trailing zeros
const fmtSI3 = format(".3~s");  // SI prefix, 3 significant digits
const fmtPct1 = format(".1f");  // 1 decimal place (for percentages)
const fmtInt = format(",");      // Integer with thousand separators

/**
 * Format a number for chart labels.
 * - ≥1000: SI prefix (1.2M, 3.4K, 500)
 * - <1000 integer: as-is
 * - <1000 decimal: 1 decimal place
 *
 * Replaces manual M/K formatting in BarChartElement and LineChartElement.
 */
export function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return fmtSI2(v);
  if (Number.isInteger(v)) return String(v);
  return fmtPct1(v);
}

/**
 * Format a number with more precision (for tooltips, detailed labels).
 */
export function formatValuePrecise(v: number): string {
  if (Math.abs(v) >= 1000) return fmtSI3(v);
  if (Number.isInteger(v)) return fmtInt(v);
  return fmtPct1(v);
}

/**
 * Format a percentage value (e.g. 45.3%).
 */
export function formatPercent(v: number): string {
  return `${fmtPct1(v)}%`;
}

// ============================================================
// AI data coercion — resilient extraction from AI-generated data
// ============================================================

/**
 * Extract a numeric value from an AI-generated data point.
 * Handles: { value: 53 }, { value: "53 qubits" }, { y: 53 }, { count: 53 }, etc.
 */
export function extractValue(d: Record<string, unknown>): number {
  const v = d.value ?? d.y ?? d.count ?? d.amount;
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/,/g, ""));
    if (isFinite(n)) return n;
  }
  // Fallback: grab the first numeric value from any key (skip label/name/color)
  for (const [k, val] of Object.entries(d)) {
    if (k === "label" || k === "name" || k === "color" || k === "x") continue;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "string") {
      const n = parseFloat(val.replace(/,/g, ""));
      if (isFinite(n)) return n;
    }
  }
  return 0;
}

/**
 * Extract a label string from an AI-generated data point.
 * Handles: { label: "X" }, { name: "X" }, { x: "X" }.
 */
export function extractLabel(d: Record<string, unknown>): string {
  return String(d.label ?? d.name ?? d.x ?? "");
}
