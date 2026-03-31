/**
 * SVG element — renders AI-generated inline SVG markup.
 *
 * AI can create flowcharts, org charts, mind maps, custom diagrams, etc.
 * SVG is pure DOM — html-to-image captures it perfectly for MP4 export.
 *
 * Security: DOMParser + whitelist filter removes <script>, event handlers,
 * and other dangerous content before rendering.
 */

import { useMemo } from "react";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";

// SVG elements allowed in output (whitelist)
const ALLOWED_TAGS = new Set([
  "svg", "g", "defs", "use", "symbol", "title", "desc",
  "rect", "circle", "ellipse", "line", "polyline", "polygon", "path",
  "text", "tspan", "textPath",
  "image", "clipPath", "mask", "pattern",
  "linearGradient", "radialGradient", "stop",
  "filter", "feGaussianBlur", "feOffset", "feMerge", "feMergeNode",
  "feFlood", "feComposite", "feBlend", "feColorMatrix",
  "marker", "foreignObject",
]);

// Attributes that could execute code
const DANGEROUS_ATTRS = /^on/i; // onclick, onload, onerror, etc.
const DANGEROUS_ATTR_VALUES = /javascript:/i;

type Props = { el: SceneElement; index: number };

export const SvgElement: React.FC<Props> = ({ el, index }) => {
  const markup = (el.markup as string) ?? "";
  const animation = parseAnimation(el);

  const { progress } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "text", // hero-grade spring
  });

  const entrance = computeEntranceStyle(progress, animation);

  // Parse and sanitize SVG markup — memoized (only recompute when markup changes)
  const sanitizedHtml = useMemo(() => sanitizeSvg(markup), [markup]);

  if (!sanitizedHtml) return null;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        minHeight: 0,
        opacity: entrance.opacity,
        transform: entrance.transform,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

/**
 * Parse SVG string, remove dangerous elements/attributes, return safe HTML.
 * Returns empty string if parsing fails or input is not valid SVG.
 */
function sanitizeSvg(raw: string): string {
  if (!raw.trim()) return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "image/svg+xml");

    // Check for parse errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      console.warn("[SvgElement] SVG parse error:", parseError.textContent);
      return "";
    }

    const svg = doc.documentElement;
    if (svg.tagName !== "svg") {
      console.warn("[SvgElement] Root element is not <svg>");
      return "";
    }

    // Ensure responsive sizing
    if (!svg.getAttribute("viewBox") && svg.getAttribute("width") && svg.getAttribute("height")) {
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.style.maxHeight = "100%";
    svg.style.overflow = "visible";

    // Walk and sanitize
    sanitizeNode(svg);

    return svg.outerHTML;
  } catch (err) {
    console.warn("[SvgElement] SVG sanitization failed:", err);
    return "";
  }
}

function sanitizeNode(node: Element): void {
  // Remove disallowed elements
  const children = Array.from(node.children);
  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || !ALLOWED_TAGS.has(tag)) {
      child.remove();
      continue;
    }
    // Remove dangerous attributes
    const attrs = Array.from(child.attributes);
    for (const attr of attrs) {
      if (DANGEROUS_ATTRS.test(attr.name) || DANGEROUS_ATTR_VALUES.test(attr.value)) {
        child.removeAttribute(attr.name);
      }
    }
    // Recurse
    sanitizeNode(child);
  }
}
