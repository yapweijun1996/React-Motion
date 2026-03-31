/**
 * Shared chart helpers — formatting + color palettes.
 *
 * Replaces duplicated DEFAULT_COLORS (4 files) and formatVal (2 files)
 * with d3-format (SI prefixes) and d3-scale-chromatic (professional palettes).
 */

import { format } from "d3-format";
import { schemeTableau10 } from "d3-scale-chromatic";

// ============================================================
// Chart color palette — single source of truth
// ============================================================

/**
 * Tableau10: 10 perceptually distinct, colorblind-friendly colors.
 * Used by all chart elements as default palette.
 * Previously: same 8-color array hardcoded in bar/pie/line/sankey.
 */
export const CHART_COLORS: readonly string[] = schemeTableau10;

/**
 * Get chart color by index (cycles through palette).
 */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
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
