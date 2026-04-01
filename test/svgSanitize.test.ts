// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { sanitizeSvg, sanitizeNode, ALLOWED_TAGS } from "../src/video/elements/svgSanitize";

describe("sanitizeSvg", () => {
  it("returns empty string for empty/whitespace input", () => {
    expect(sanitizeSvg("")).toBe("");
    expect(sanitizeSvg("   ")).toBe("");
  });

  it("returns empty string for malformed SVG", () => {
    expect(sanitizeSvg("<not-svg>")).toBe("");
  });

  it("sanitizes a valid SVG and preserves structure", () => {
    const svg = `<svg viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" fill="red"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).toContain("<rect");
    expect(result).toContain("fill=\"red\"");
    expect(result).toContain("width=\"100%\"");
  });

  it("removes <script> tags", () => {
    const svg = `<svg viewBox="0 0 100 100"><script>alert('xss')</script><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
  });

  it("removes <style> tags", () => {
    const svg = `<svg viewBox="0 0 100 100"><style>body{}</style><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<style");
  });

  it("removes event handler attributes from children", () => {
    const svg = `<svg viewBox="0 0 100 100"><rect onclick="alert(1)" onmouseover="hack()" fill="red"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("fill=\"red\"");
  });

  it("removes dangerous attributes from root <svg> element", () => {
    const svg = `<svg viewBox="0 0 100 100" onload="alert(1)"><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("onload");
  });

  it("removes javascript: URLs from attributes", () => {
    const svg = `<svg viewBox="0 0 100 100"><a href="javascript:alert(1)"><rect/></a></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("javascript:");
  });

  it("auto-generates viewBox from width/height if missing", () => {
    const svg = `<svg width="200" height="100"><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).toContain('viewBox="0 0 200 100"');
  });

  it("sets responsive sizing (width 100%, height auto)", () => {
    const svg = `<svg viewBox="0 0 100 100"><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).toContain('width="100%"');
    expect(result).toContain('height="auto"');
  });

  it("adds stroke-width in draw mode", () => {
    const svg = `<svg viewBox="0 0 100 100"><path d="M0 0 L100 100"/></svg>`;
    const result = sanitizeSvg(svg, true);
    expect(result).toContain('stroke-width="2"');
  });

  it("preserves existing stroke-width in draw mode", () => {
    const svg = `<svg viewBox="0 0 100 100"><path d="M0 0 L100 100" stroke-width="5"/></svg>`;
    const result = sanitizeSvg(svg, true);
    expect(result).toContain('stroke-width="5"');
    expect(result).not.toContain('stroke-width="2"');
  });

  it("removes disallowed tags", () => {
    const svg = `<svg viewBox="0 0 100 100"><div>nope</div><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<div");
    expect(result).toContain("<rect");
  });

  // --- New security tests ---

  it("removes <foreignObject> (security: blocks embedded XHTML)", () => {
    const svg = `<svg viewBox="0 0 100 100"><foreignObject width="100" height="50"><div xmlns="http://www.w3.org/1999/xhtml">text</div></foreignObject><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("foreignObject");
    expect(result).toContain("<rect");
  });

  it("removes <iframe> tags", () => {
    const svg = `<svg viewBox="0 0 100 100"><iframe src="evil.html"></iframe><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("iframe");
  });

  it("removes <audio> and <video> tags", () => {
    const svg = `<svg viewBox="0 0 100 100"><audio src="a.mp3"/><video src="v.mp4"/><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<audio");
    expect(result).not.toContain("<video");
  });

  it("removes <embed> and <object> tags", () => {
    const svg = `<svg viewBox="0 0 100 100"><embed src="x"/><object data="y"/><rect/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<embed");
    expect(result).not.toContain("<object");
  });

  it("removes dangerous inline style (expression)", () => {
    const svg = `<svg viewBox="0 0 100 100"><rect style="behavior: expression(alert(1))"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("expression");
    expect(result).not.toContain("behavior");
  });

  it("removes dangerous inline style (javascript in url)", () => {
    const svg = `<svg viewBox="0 0 100 100"><rect style="background: url('javascript:alert(1)')"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("javascript");
  });

  it("preserves safe inline style", () => {
    const svg = `<svg viewBox="0 0 100 100"><rect style="fill: red; opacity: 0.5"/></svg>`;
    const result = sanitizeSvg(svg);
    expect(result).toContain("fill: red");
  });

  it("draw mode still works after sanitization", () => {
    const svg = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>`;
    const result = sanitizeSvg(svg, true);
    expect(result).toContain("<circle");
    expect(result).toContain('stroke-width="2"');
  });

  it("returns empty string for SVG that cannot be safely parsed", () => {
    // Completely invalid XML
    expect(sanitizeSvg("<<<>>>")).toBe("");
  });

  it("foreignObject is NOT in ALLOWED_TAGS (security boundary)", () => {
    expect(ALLOWED_TAGS.has("foreignObject")).toBe(false);
    expect(ALLOWED_TAGS.has("foreignobject")).toBe(false);
  });
});
