import { describe, it, expect } from "vitest";
import { parseVideoScript } from "../src/services/parseScript";

describe("parseVideoScript", () => {
  const validJson = JSON.stringify({
    title: "Test",
    scenes: [{ elements: [{ type: "text", content: "Hello" }], durationInFrames: 150 }],
  });

  it("parses valid JSON into VideoScript", () => {
    const script = parseVideoScript(validJson);
    expect(script.title).toBe("Test");
    expect(script.scenes).toHaveLength(1);
    expect(script.scenes[0].elements[0].type).toBe("text");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseVideoScript("{broken")).toThrow("not valid JSON");
  });

  it("throws on missing scenes", () => {
    expect(() => parseVideoScript('{"title":"X"}')).toThrow("scenes");
  });

  it("throws on empty scenes", () => {
    expect(() => parseVideoScript('{"title":"X","scenes":[]}')).toThrow("empty");
  });

  it("throws on invalid element type", () => {
    const bad = JSON.stringify({
      title: "X",
      scenes: [{ elements: [{ type: "video" }] }],
    });
    expect(() => parseVideoScript(bad)).toThrow("invalid type");
  });

  it("throws on missing title", () => {
    const bad = JSON.stringify({
      scenes: [{ elements: [{ type: "text" }] }],
    });
    expect(() => parseVideoScript(bad)).toThrow("title");
  });

  it("round-trips all valid element types", () => {
    const types = ["text", "metric", "bar-chart", "pie-chart", "line-chart", "sankey", "list", "divider", "callout", "kawaii", "lottie"];
    for (const type of types) {
      const json = JSON.stringify({
        title: "X",
        scenes: [{ elements: [{ type }] }],
      });
      const script = parseVideoScript(json);
      expect(script.scenes[0].elements[0].type).toBe(type);
    }
  });
});
