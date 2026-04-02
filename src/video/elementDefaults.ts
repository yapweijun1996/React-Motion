/**
 * Element Defaults — centralized default values for all scene elements.
 *
 * Pure constants, no React dependency. Parallels sceneColors.ts / sceneLayout.ts.
 *
 * STRUCTURE:
 *   0. resolveColors  — safe SceneColors fallback (replaces all dark ? ... ternaries)
 *   1. ELEMENT_COLORS  — fallback colors per element type + theme-aware tracks
 *   2. ELEMENT_SIZES   — dimensions, font sizes, spacing per element type
 *   3. SPRING_CONFIGS  — spring physics presets (damping / mass)
 *   4. ADAPTIVE        — count-based scaling thresholds & breakpoints
 *   5. ANIMATION       — timing constants (typewriter speed, stagger offsets)
 */

import { getSceneColors, type SceneColors } from "./sceneColors";

// ═══════════════════════════════════════════════════════════════════
// 0. resolveColors — eliminates dark ? "..." : "..." fallback chains
// ═══════════════════════════════════════════════════════════════════

/**
 * Resolve scene colors for an element.
 *
 * GenericScene always passes `colors`, but elements can also be used standalone
 * (e.g. in tests or storybook). This guarantees a valid SceneColors object.
 *
 * Usage: `const c = resolveColors(colors, dark);`
 * Then:  `c.text`, `c.muted`, `c.label`, `c.gridLine`, `c.track`, `c.cardBg`
 */
export function resolveColors(colors: SceneColors | undefined, dark?: boolean): SceneColors {
  return colors ?? getSceneColors(!!dark);
}

// ═══════════════════════════════════════════════════════════════════
// 1. ELEMENT COLORS — fallback colors when AI / data don't provide one
// ═══════════════════════════════════════════════════════════════════

/** Default primary accent — used by metric, list, callout, divider, icon. */
export const COLOR_PRIMARY = "#0F766E";

/** Default progress bar color. */
export const COLOR_PROGRESS = "#14B8A6";

/** Default annotation / error accent. */
export const COLOR_ANNOTATION = "#DC2626";

/** Default comparison left card accent. */
export const COLOR_COMPARE_LEFT = "#14B8A6";

/** Default comparison right card accent. */
export const COLOR_COMPARE_RIGHT = "#DC2626";

/** Default kawaii character color. */
export const COLOR_KAWAII = "#FFD882";


// ═══════════════════════════════════════════════════════════════════
// 2. ELEMENT SIZES — default dimensions, font sizes, spacing
// ═══════════════════════════════════════════════════════════════════

// --- Text ---
/** Default text element font size (px). */
export const TEXT_FONT_SIZE = 80;
/** Default text font weight. */
export const TEXT_FONT_WEIGHT = 400;
/** Default text line height. */
export const TEXT_LINE_HEIGHT = 1.3;

// --- List ---
/** Default list item font size (px). */
export const LIST_FONT_SIZE = 56;
/** Icon-to-text gap (px). */
export const LIST_ICON_GAP = 20;
/** List item line height. */
export const LIST_LINE_HEIGHT = 1.4;
/** Icon font scale relative to item fontSize. */
export const LIST_ICON_SCALE = 0.9;
/** Icon vertical offset (px). */
export const LIST_ICON_MARGIN_TOP = 4;
/** Base gap between list items (px). */
export const LIST_BASE_GAP = 28;

// --- Callout ---
/** Default callout body font size (px). */
export const CALLOUT_FONT_SIZE = 60;
/** Callout title font size (px, before fontScale). */
export const CALLOUT_TITLE_SIZE = 44;
/** Callout padding CSS. */
export const CALLOUT_PADDING = "36px 40px";
/** Callout border left width (px). */
export const CALLOUT_BORDER_WIDTH = 5;
/** Callout border radius (px). */
export const CALLOUT_BORDER_RADIUS = 8;
/** Callout title margin bottom (px). */
export const CALLOUT_TITLE_MB = 12;
/** Callout title letter spacing (px). */
export const CALLOUT_TITLE_SPACING = 2;

// --- Metric ---
/** Metric size tier shape. */
export type MetricSizeTier = { value: number; label: number; subtext: number; suffix: number };

/** Metric sizes per item count: [value, label, subtext, suffix] (px). */
export const METRIC_SIZES: Record<string, MetricSizeTier> = {
  few:     { value: 160, label: 56, subtext: 42, suffix: 72 },  // count <= 2
  medium:  { value: 120, label: 48, subtext: 36, suffix: 54 },  // count <= 3
  many:    { value: 96,  label: 40, subtext: 32, suffix: 44 },  // count > 3
};
/** Metric item gaps per count (px). */
export const METRIC_GAPS = { few: 120, medium: 80, many: 56 } as const;
/** Suffix margin-left (px). */
export const METRIC_SUFFIX_ML = 8;
/** Label margin-top (px). */
export const METRIC_LABEL_MT = 16;
/** Subtext margin-top (px). */
export const METRIC_SUBTEXT_MT = 8;
/** Metric value line height. */
export const METRIC_LINE_HEIGHT = 1.1;
/** Count-up animation frame offset (frames before delay). */
export const METRIC_COUNT_OFFSET = 5;

// --- Progress ---
/** SVG viewport dimension for circular / semicircle gauges (px). */
export const PROGRESS_SIZE = 320;
/** Default stroke width (px). Range: 4–32. */
export const PROGRESS_STROKE = 14;
/** Default max value. */
export const PROGRESS_MAX = 100;
/** Default suffix text. */
export const PROGRESS_SUFFIX = "%";
/** Default variant. */
export const PROGRESS_VARIANT = "circular" as const;
/** Circular gauge center number font size (px). */
export const PROGRESS_CIRC_NUM = 96;
/** Circular gauge suffix font size (px). */
export const PROGRESS_CIRC_SUFFIX = 48;
/** Semicircle gauge number font size (px). */
export const PROGRESS_SEMI_NUM = 80;
/** Semicircle gauge suffix font size (px). */
export const PROGRESS_SEMI_SUFFIX = 42;
/** Semicircle extra bottom space (px). */
export const PROGRESS_SEMI_PAD = 32;
/** Linear gauge number font size (px). */
export const PROGRESS_LINEAR_NUM = 80;
/** Linear gauge suffix font size (px). */
export const PROGRESS_LINEAR_SUFFIX = 42;
/** Linear min bar height (px). */
export const PROGRESS_LINEAR_MIN_H = 20;
/** Linear max track width (px). */
export const PROGRESS_LINEAR_MAX_W = 800;
/** Label font size below gauge (px). */
export const PROGRESS_LABEL_SIZE = 56;
/** Spacing below gauge label (px). */
export const PROGRESS_LABEL_MB = 12;

// --- Bar Chart ---
/** Max chart height within 1080 canvas (px). */
export const BAR_MAX_H = 880;
/** Gap between bars (px). */
export const BAR_GAP = 10;
/** Min bar height (px). */
export const BAR_MIN_H = 28;
/** Max bar height (px). */
export const BAR_MAX_BAR_H = 80;
/** Bar border radius (px). */
export const BAR_RADIUS = 4;
/** Char-width multiplier for label width calculation. */
export const BAR_CHAR_WIDTH = 0.65;
/** Min label column width (px). */
export const BAR_LABEL_MIN_W = 160;
/** Max label column width (px). */
export const BAR_LABEL_MAX_W = 400;
/** Label right padding (px). */
export const BAR_LABEL_PR = 12;
/** Value area min width without / with percentage (px). */
export const BAR_VALUE_MIN_W = 140;
export const BAR_VALUE_PCT_MIN_W = 220;

// --- Pie Chart ---
/** Pie SVG viewport size (px). */
export const PIE_SIZE = 480;
/** Max legend items shown. */
export const PIE_MAX_LEGEND = 8;
/** Donut inner-to-outer radius ratio. */
export const PIE_DONUT_RATIO = 0.55;
/** ViewBox padding (px). */
export const PIE_PADDING = 10;
/** Highlight radius bonus (px). */
export const PIE_HL_BONUS = 10;
/** Pie stroke color. */
export const PIE_STROKE_COLOR = "#fff";
/** Pie stroke width (px). */
export const PIE_STROKE_W = 2;
/** Corner radius on highlighted slice (px). */
export const PIE_CORNER_R = 2;
/** Non-highlighted slice opacity. */
export const PIE_BASE_OPACITY = 0.9;
/** Legend swatch size (px). */
export const PIE_SWATCH = 32;
/** Legend swatch border-radius (px). */
export const PIE_SWATCH_R = 6;
/** Gap between pie and legend (px). */
export const PIE_LEGEND_GAP = 48;
/** Legend percentage margin-left (px). */
export const PIE_PCT_ML = 12;

// --- Line Chart ---
/** Line chart SVG width (px). */
export const LINE_W = 1100;
/** Line chart SVG height (px). */
export const LINE_H = 500;
/** Line chart margins (px). */
export const LINE_MARGIN = { top: 24, right: 36, bottom: 50, left: 70 } as const;
/** Y-axis tick count. */
export const LINE_Y_TICKS = 5;
/** X-axis scale padding factor. */
export const LINE_X_PAD = 0.1;
/** Y-axis range padding factor (proportion of range). */
export const LINE_Y_PAD = 0.1;
/** Axis label font size (px). */
export const LINE_AXIS_FONT = 36;
/** Grid line width (px). */
export const LINE_GRID_W = 1;
/** Data line stroke width (px). */
export const LINE_STROKE_W = 3;
/** Dot radius (px). */
export const LINE_DOT_R = 5;
/** Dot stroke color. */
export const LINE_DOT_STROKE = "#fff";
/** Dot stroke width (px). */
export const LINE_DOT_STROKE_W = 2.5;

// --- Sankey ---
/** Sankey chart width (px). */
export const SANKEY_W = 1100;
/** Sankey chart height (px). */
export const SANKEY_H = 500;
/** Sankey node width (px). */
export const SANKEY_NODE_W = 22;
/** Sankey node vertical padding (px). */
export const SANKEY_NODE_PAD = 20;
/** Sankey node corner radius (px). */
export const SANKEY_NODE_R = 3;
/** Sankey node label font size (px). */
export const SANKEY_LABEL_FONT = 38;
/** Sankey label x-offset from node edge (px). */
export const SANKEY_LABEL_OFFSET = 8;
/** Sankey link max opacity. */
export const SANKEY_LINK_OPACITY = 0.4;

// --- Timeline ---
/** Normal node radius (px). */
export const TIMELINE_NODE_R = 16;
/** Active node radius (px). */
export const TIMELINE_ACTIVE_R = 20;
/** Node stroke color. */
export const TIMELINE_NODE_STROKE = "#fff";
/** Node stroke width (px). */
export const TIMELINE_NODE_STROKE_W = 3;
/** Active node glow radius bonus (px). */
export const TIMELINE_GLOW_R = 8;
/** Active node glow opacity. */
export const TIMELINE_GLOW_OPACITY = 0.2;
/** Horizontal: SVG viewBox height (px). */
export const TIMELINE_SVG_H = 60;
/** Horizontal: label margin-top (px). */
export const TIMELINE_LABEL_MT = 16;
/** Horizontal: label padding CSS. */
export const TIMELINE_LABEL_PX = "0 20px";
/** Horizontal: edge padding in 1000-wide SVG (px). */
export const TIMELINE_EDGE_PAD = 60;
/** Horizontal: track stroke width (px). */
export const TIMELINE_TRACK_W = 3;
/** Vertical: container padding CSS. */
export const TIMELINE_VERT_PX = "0 48px";
/** Vertical: item min-height (px). */
export const TIMELINE_VERT_MIN_H = 80;
/** Vertical: item gap (px). */
export const TIMELINE_VERT_GAP = 24;
/** Vertical: node column width (px). */
export const TIMELINE_VERT_COL_W = 48;
/** Vertical: connecting line width (px). */
export const TIMELINE_VERT_LINE_W = 3;
/** Vertical: connecting line min-height (px). */
export const TIMELINE_VERT_LINE_MIN_H = 32;
/** Label base font size (px, before fontScale). */
export const TIMELINE_LABEL_FONT = 48;
/** Description base font size (px, before fontScale). */
export const TIMELINE_DESC_FONT = 36;
/** Description margin-top (px). */
export const TIMELINE_DESC_MT = 4;

// --- Comparison ---
/** Card max width (px). */
export const COMPARE_CARD_MAX_W = 700;
/** Card border radius (px). */
export const COMPARE_CARD_RADIUS = 16;
/** Card border-top width (px). */
export const COMPARE_BORDER_TOP = 5;
/** Card padding CSS. */
export const COMPARE_CARD_PADDING = "40px 44px";
/** Card internal gap (px). */
export const COMPARE_CARD_GAP = 16;
/** Gap between cards (px). */
export const COMPARE_GAP = 32;
/** VS divider width (px). */
export const COMPARE_VS_W = 100;
/** VS letter spacing (px). */
export const COMPARE_VS_SPACING = 4;
/** Title font size (px, before fontScale). */
export const COMPARE_TITLE_SIZE = 52;
/** Value font size (px, before fontScale). */
export const COMPARE_VALUE_SIZE = 120;
/** Subtitle font size (px, before fontScale). */
export const COMPARE_SUB_SIZE = 44;
/** VS label font size (px, before fontScale). */
export const COMPARE_VS_SIZE = 56;
/** Bullet items font size (px, before fontScale). */
export const COMPARE_ITEM_SIZE = 40;
/** Bullet items gap (px). */
export const COMPARE_ITEM_GAP = 12;
/** Bullet dot font size (px, before fontScale). */
export const COMPARE_DOT_SIZE = 28;
/** Left card slide-in distance (px). */
export const COMPARE_SLIDE_LEFT = -60;
/** Right card slide-in distance (px). */
export const COMPARE_SLIDE_RIGHT = 60;
/** VS scale-in starting scale. */
export const COMPARE_VS_SCALE_FROM = 0.5;

// --- Icon ---
/** Default icon name. */
export const ICON_DEFAULT_NAME = "star";
/** Default icon size (px). */
export const ICON_DEFAULT_SIZE = 64;
/** Default icon stroke width (px). */
export const ICON_STROKE_W = 2;
/** Default label font size (px). */
export const ICON_LABEL_SIZE = 20;
/** Gap between icon and label (px). */
export const ICON_LABEL_GAP = 12;

// --- Annotation ---
/** Default annotation shape. */
export const ANNO_DEFAULT_SHAPE = "circle" as const;
/** Default annotation stroke width (px). */
export const ANNO_STROKE_W = 2.5;
/** Default annotation roughness. Range: 0.5–3. */
export const ANNO_ROUGHNESS = 1.5;
/** Default annotation size (px, before fontScale). */
export const ANNO_SIZE = 120;
/** Default annotation label font size (px, before fontScale). */
export const ANNO_LABEL_SIZE = 18;
/** Annotation gap between shape and label (px). */
export const ANNO_GAP = 10;

// --- Kawaii ---
/** Default kawaii character. */
export const KAWAII_DEFAULT_CHAR = "ghost";
/** Default kawaii mood. */
export const KAWAII_DEFAULT_MOOD = "blissful" as const;
/** Default kawaii character size (px). */
export const KAWAII_SIZE = 180;
/** Default caption font size (px). */
export const KAWAII_CAPTION_SIZE = 42;
/** Caption max-width (px). */
export const KAWAII_CAPTION_MAX_W = 600;
/** Gap between character and caption (px). */
export const KAWAII_GAP = 12;

// --- Divider ---
/** Default divider width (px). */
export const DIVIDER_WIDTH = 400;
/** Default divider height / thickness (px). */
export const DIVIDER_HEIGHT = 4;
/** Default divider border-radius (px). */
export const DIVIDER_RADIUS = 2;
/** Default divider opacity. */
export const DIVIDER_OPACITY = 0.7;

// ═══════════════════════════════════════════════════════════════════
// 3. SPRING CONFIGS — reusable spring physics presets
// ═══════════════════════════════════════════════════════════════════

export type SpringConfig = { damping: number; mass?: number };

/** Metric count-up number animation. */
export const SPRING_COUNT_UP: SpringConfig = { damping: 20, mass: 0.8 };

/** Progress arc fill animation. */
export const SPRING_FILL_ARC: SpringConfig = { damping: 18, mass: 0.8 };

/** Timeline line-draw animation. */
export const SPRING_LINE_DRAW: SpringConfig = { damping: 16, mass: 0.7 };

/** Timeline node pop-in. */
export const SPRING_NODE_POP: SpringConfig = { damping: 14, mass: 0.5 };

/** Timeline / chart label fade-in. */
export const SPRING_LABEL_FADE: SpringConfig = { damping: 16, mass: 0.6 };

/** Chart element reveal (line-chart dots, sankey links, pie labels). */
export const SPRING_CHART_REVEAL: SpringConfig = { damping: 16 };

/** Bar chart bar width animation. */
export const SPRING_BAR_REVEAL: SpringConfig = { damping: 20 };

/** Pie chart label opacity. */
export const SPRING_PIE_REVEAL: SpringConfig = { damping: 18 };

/** Comparison card slide-in animation. */
export const SPRING_CARD_SLIDE: SpringConfig = { damping: 15, mass: 0.6 };

/** Comparison VS pop-in animation. */
export const SPRING_VS_POP: SpringConfig = { damping: 12, mass: 0.5 };

/** Annotation hand-drawn stroke reveal. */
export const SPRING_ANNOTATION_DRAW: SpringConfig = { damping: 18, mass: 0.8 };

/** Sankey link draw animation. */
export const SPRING_SANKEY_LINK: SpringConfig = { damping: 16, mass: 0.6 };

// ═══════════════════════════════════════════════════════════════════
// 4. ADAPTIVE — count-based scaling thresholds
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute item scale factor based on count.
 * Used by list, timeline, and similar stacked elements.
 *
 * @param count - number of items
 * @param hi - threshold above which scale is smallest (default 8)
 * @param mid - threshold above which scale is medium (default 6)
 * @returns scale factor: 0.75 | 0.85 | 1
 */
export function itemScale(count: number, hi = 8, mid = 6): number {
  if (count > hi) return 0.75;
  if (count > mid) return 0.85;
  return 1;
}

/**
 * Pick metric size tier based on item count.
 */
export function metricSizeTier(count: number): MetricSizeTier {
  if (count <= 2) return METRIC_SIZES.few;
  if (count <= 3) return METRIC_SIZES.medium;
  return METRIC_SIZES.many;
}

/**
 * Pick metric gap based on item count.
 */
export function metricGap(count: number): number {
  if (count <= 2) return METRIC_GAPS.few;
  if (count <= 3) return METRIC_GAPS.medium;
  return METRIC_GAPS.many;
}

/**
 * Compute bar chart font size from bar height.
 */
export function barFontSize(barHeight: number): number {
  if (barHeight >= 64) return 42;
  if (barHeight >= 48) return 36;
  if (barHeight >= 36) return 30;
  return 24;
}

/**
 * Pie chart legend font size based on slice count.
 */
export function pieLegendFont(sliceCount: number): number {
  return sliceCount > 6 ? 36 : 42;
}

// ═══════════════════════════════════════════════════════════════════
// 5. ANIMATION TIMING — frame offsets and timing constants
// ═══════════════════════════════════════════════════════════════════

/** Typewriter: characters revealed per frame at 30fps. */
export const TYPEWRITER_CHARS_PER_FRAME = 2;

/** Typewriter: cursor blink cycle length (frames). */
export const TYPEWRITER_CURSOR_BLINK = 15;

/** Typewriter: token-mode switch threshold (characters). Per-char below, per-word above. */
export const TYPEWRITER_CHAR_THRESHOLD = 40;

/** Comparison: right card stagger offset (frames). */
export const COMPARE_RIGHT_OFFSET = 6;

/** Comparison: VS label stagger offset (frames). */
export const COMPARE_VS_OFFSET = 14;

/** Timeline: node stagger multiplier (frames between nodes). */
export const TIMELINE_NODE_STAGGER = 8;

/** Timeline: vertical node stagger multiplier. */
export const TIMELINE_VERT_NODE_STAGGER = 10;

/** Timeline: label delay after node (frames). */
export const TIMELINE_LABEL_DELAY = 4;

/** Bar chart: label opacity frame advance. */
export const BAR_LABEL_ADVANCE = 4;

/** Bar chart: value opacity frame delay. */
export const BAR_VALUE_DELAY = 15;

/** Text glow blur radii (px). */
export const TEXT_GLOW_BLUR = [24, 48] as const;
/** Text glow alpha hex suffixes. */
export const TEXT_GLOW_ALPHA = ["88", "44"] as const;
/** Text drop shadow value. */
export const TEXT_DROP_SHADOW = "2px 4px 8px rgba(0,0,0,0.3)";
