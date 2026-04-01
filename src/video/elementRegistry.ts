/**
 * Element Registry — data-driven mapping from element type to component + category.
 *
 * Replaces the 17-case switch(el.type) in GenericScene with a single lookup.
 * Each entry declares: { component, category }.
 *
 * Categories control wrapping behavior in GenericScene:
 *   - "chart"   → wrapped in chart flex container
 *   - "decor"   → negative margin to absorb scene gap
 *   - "default" → rendered directly
 */

import type React from "react";
import type { SceneElement } from "../types";
import type { SceneColors } from "./sceneColors";

import { TextElement } from "./elements/TextElement";
import { MetricElement } from "./elements/MetricElement";
import { BarChartElement } from "./elements/BarChartElement";
import { ListElement } from "./elements/ListElement";
import { DividerElement } from "./elements/DividerElement";
import { CalloutElement } from "./elements/CalloutElement";
import { PieChartElement } from "./elements/PieChartElement";
import { LineChartElement } from "./elements/LineChartElement";
import { SankeyElement } from "./elements/SankeyElement";
import { KawaiiElement } from "./elements/KawaiiElement";
import { LottieElement } from "./elements/LottieElement";
import { IconElement } from "./elements/IconElement";
import { AnnotationElement } from "./elements/AnnotationElement";
import { SvgElement } from "./elements/SvgElement";
import { Svg3dElement } from "./elements/Svg3dElement";
import { MapElement } from "./elements/MapElement";
import { ProgressElement } from "./elements/ProgressElement";
import { TimelineElement } from "./elements/TimelineElement";
import { ComparisonElement } from "./elements/ComparisonElement";

// ---------------------------------------------------------------------------
// Shared element props — union of all possible props passed to any element.
// Each component destructures only what it needs; extras are harmlessly ignored.
// ---------------------------------------------------------------------------

export type ElementProps = {
  el: SceneElement;
  index: number;
  primaryColor?: string;
  dark?: boolean;
  colors?: SceneColors;
  fontScale?: number;
};

// ---------------------------------------------------------------------------
// Category determines wrapping behavior in GenericScene
// ---------------------------------------------------------------------------

export type ElementCategory = "chart" | "decor" | "default";

export type ElementEntry = {
  component: React.FC<ElementProps>;
  category: ElementCategory;
};

// ---------------------------------------------------------------------------
// Registry — single source of truth for element type → component + category
// ---------------------------------------------------------------------------

export const ELEMENT_REGISTRY: Record<string, ElementEntry> = {
  // Content elements
  "text":       { component: TextElement as React.FC<ElementProps>,       category: "default" },
  "metric":     { component: MetricElement as React.FC<ElementProps>,     category: "default" },
  "list":       { component: ListElement as React.FC<ElementProps>,       category: "default" },
  "callout":    { component: CalloutElement as React.FC<ElementProps>,    category: "default" },
  "divider":    { component: DividerElement as React.FC<ElementProps>,    category: "default" },
  "progress":   { component: ProgressElement as React.FC<ElementProps>,   category: "default" },
  "timeline":   { component: TimelineElement as React.FC<ElementProps>,   category: "default" },
  "comparison": { component: ComparisonElement as React.FC<ElementProps>, category: "default" },

  // Chart elements — wrapped in chart flex container
  "bar-chart":  { component: BarChartElement as React.FC<ElementProps>,  category: "chart" },
  "pie-chart":  { component: PieChartElement as React.FC<ElementProps>,  category: "chart" },
  "line-chart": { component: LineChartElement as React.FC<ElementProps>, category: "chart" },
  "sankey":     { component: SankeyElement as React.FC<ElementProps>,    category: "chart" },
  "svg":        { component: SvgElement as React.FC<ElementProps>,       category: "chart" },
  "svg-3d":     { component: Svg3dElement as React.FC<ElementProps>,    category: "chart" },
  "map":        { component: MapElement as React.FC<ElementProps>,       category: "chart" },

  // Decoration elements — negative margin to absorb scene gap
  "annotation": { component: AnnotationElement as React.FC<ElementProps>, category: "decor" },
  "kawaii":     { component: KawaiiElement as React.FC<ElementProps>,     category: "decor" },
  "icon":       { component: IconElement as React.FC<ElementProps>,       category: "decor" },
  "lottie":     { component: LottieElement as React.FC<ElementProps>,     category: "decor" },
};

/** All registered element type names. Useful for validation. */
export const VALID_ELEMENT_TYPES = Object.keys(ELEMENT_REGISTRY);
