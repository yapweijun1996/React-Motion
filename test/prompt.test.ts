import { describe, it, expect } from "vitest";
import { buildAgentSystemPrompt, buildSystemPrompt, buildUserMessage } from "../src/services/prompt";

describe("buildAgentSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildAgentSystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("contains OODAE workflow", () => {
    expect(buildAgentSystemPrompt()).toContain("OODAE");
  });

  it("contains scene layout rules", () => {
    expect(buildAgentSystemPrompt()).toContain("Scene Layout Rules");
  });

  it("contains entrance animations section", () => {
    expect(buildAgentSystemPrompt()).toContain("Entrance animations");
  });

  it("contains canvas dimensions", () => {
    expect(buildAgentSystemPrompt()).toContain("1920");
    expect(buildAgentSystemPrompt()).toContain("1080");
  });
});

describe("buildSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("contains available elements", () => {
    expect(buildSystemPrompt()).toContain("Available elements");
  });

  it("lists all element types", () => {
    const prompt = buildSystemPrompt();
    for (const type of ["text", "metric", "bar-chart", "pie-chart", "line-chart", "sankey", "list", "divider", "callout"]) {
      expect(prompt).toContain(`"type": "${type}"`);
    }
  });
});

describe("buildUserMessage", () => {
  it("includes user prompt", () => {
    const msg = buildUserMessage("Show me sales data");
    expect(msg).toContain("Show me sales data");
  });

  it("includes structured data when provided", () => {
    const msg = buildUserMessage("Analyze this", {
      title: "Sales",
      rows: [{ product: "A", revenue: 100 }],
      columns: [{ key: "product", label: "Product", type: "string" }],
    });
    expect(msg).toContain("Structured data context");
    expect(msg).toContain("Sales");
  });

  it("omits data section when data is empty", () => {
    const msg = buildUserMessage("Just a prompt", { rows: [], columns: [] });
    expect(msg).not.toContain("Structured data context");
  });
});
