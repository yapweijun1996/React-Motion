/**
 * Shared SVG sanitization — used by SvgElement and Svg3dElement.
 *
 * Security: DOMParser + whitelist filter removes <script>, event handlers,
 * and other dangerous content before rendering.
 */

// SVG elements allowed in output (whitelist — security-critical, keep minimal)
// Includes both camelCase (SVG spec) and lowercase (for case-insensitive matching)
const SVG_TAGS = [
  "svg", "g", "defs", "use", "symbol", "title", "desc",
  "rect", "circle", "ellipse", "line", "polyline", "polygon", "path",
  "text", "tspan", "textPath",
  "image", "clipPath", "mask", "pattern",
  "linearGradient", "radialGradient", "stop",
  "filter", "feGaussianBlur", "feOffset", "feMerge", "feMergeNode",
  "feFlood", "feComposite", "feBlend", "feColorMatrix",
  "marker",
];
export const ALLOWED_TAGS = new Set([
  ...SVG_TAGS,
  ...SVG_TAGS.map((t) => t.toLowerCase()),
]);

// High-risk tags explicitly blocked (in case DOMParser preserves them)
const BLOCKED_TAGS = new Set([
  "script", "style", "iframe", "embed", "object",
  "audio", "video", "applet", "form", "input", "textarea", "button",
  "meta", "link", "base",
]);

// Attributes that could execute code
const DANGEROUS_ATTRS = /^on/i;
const DANGEROUS_ATTR_VALUES = /javascript:/i;

// Dangerous patterns inside inline style values
const DANGEROUS_STYLE = /expression\s*\(|behavior\s*:|binding\s*:|javascript\s*:|url\s*\(\s*['"]?\s*javascript/i;

/**
 * Remove dangerous attributes from a single element.
 * Checks: event handlers (on*), javascript: URLs, dangerous inline styles.
 */
function sanitizeAttrs(el: Element): void {
  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    // Remove event handlers
    if (DANGEROUS_ATTRS.test(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    // Remove javascript: in any attribute value (href, xlink:href, etc.)
    if (DANGEROUS_ATTR_VALUES.test(value)) {
      el.removeAttribute(attr.name);
      continue;
    }
    // Sanitize inline style — remove dangerous functions
    if (name === "style" && DANGEROUS_STYLE.test(value)) {
      el.removeAttribute(attr.name);
      continue;
    }
  }
}

/**
 * Recursively sanitize a node and all its children.
 * Removes disallowed tags and dangerous attributes.
 * Also sanitizes the node itself (not just children).
 */
export function sanitizeNode(node: Element, includeRoot = false): void {
  if (includeRoot) {
    sanitizeAttrs(node);
  }
  const children = Array.from(node.children);
  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    // Remove explicitly blocked tags and anything not in whitelist
    // Note: tagName.toLowerCase() may differ from original case (e.g. foreignobject vs foreignObject)
    // so we check both lowercase and original tagName against the whitelist
    if (BLOCKED_TAGS.has(tag) || (!ALLOWED_TAGS.has(tag) && !ALLOWED_TAGS.has(child.tagName))) {
      child.remove();
      continue;
    }
    sanitizeAttrs(child);
    sanitizeNode(child);
  }
}

/**
 * Parse SVG string, remove dangerous elements/attributes, return safe HTML.
 * When isDraw=true, ensures all drawable elements have explicit stroke for animation.
 */
export function sanitizeSvg(raw: string, isDraw = false): string {
  if (!raw.trim()) return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "image/svg+xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      console.warn("[svgSanitize] SVG parse error:", parseError.textContent);
      return "";
    }

    const svg = doc.documentElement;
    if (svg.tagName !== "svg") {
      console.warn("[svgSanitize] Root element is not <svg>");
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
    // svg.style may be undefined in some DOM implementations (e.g. jsdom SVG)
    if (svg.style) {
      svg.style.maxHeight = "100%";
      svg.style.overflow = "visible";
    } else {
      svg.setAttribute("style", "max-height:100%;overflow:visible");
    }

    // Sanitize root <svg> attrs too (fix: previously only children were sanitized)
    sanitizeNode(svg, true);

    // For draw mode: ensure stroke-width is set on drawable elements
    if (isDraw) {
      const drawables = svg.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect");
      drawables.forEach((el) => {
        if (!el.getAttribute("stroke-width")) {
          el.setAttribute("stroke-width", "2");
        }
      });
    }

    return svg.outerHTML;
  } catch (err) {
    console.warn("[svgSanitize] SVG sanitization failed:", err);
    return "";
  }
}
