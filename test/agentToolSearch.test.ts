import { describe, it, expect, beforeAll } from "vitest";
import type { ToolExecutor } from "../src/services/agentToolRegistry";
import { getToolExecutor, getToolDeclarations } from "../src/services/agentTools";

const YEAR = new Date().getFullYear();

let exec: ToolExecutor;
const ctx = { userPrompt: "test" };

beforeAll(() => {
  const e = getToolExecutor("search_reference");
  if (!e) throw new Error("search_reference not registered");
  exec = e;
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("search_reference — registration", () => {
  it("is registered in tool declarations", () => {
    const names = getToolDeclarations().map((d) => d.name);
    expect(names).toContain("search_reference");
  });

  it("has required: [topic]", () => {
    const decl = getToolDeclarations().find((d) => d.name === "search_reference");
    expect(decl?.parameters.required).toEqual(["topic"]);
  });
});

// ---------------------------------------------------------------------------
// Parameter alias tolerance
// ---------------------------------------------------------------------------

describe("search_reference — parameter aliases", () => {
  it("accepts primary param names", async () => {
    const { result } = await exec(
      { topic: "EV market share", industry: "automotive", region: "APAC", focus: "benchmark" },
      ctx,
    );
    expect(result.error).toBeUndefined();
    expect((result.queries as string[]).length).toBeGreaterThan(0);
  });

  it("resolves topic aliases: subject", async () => {
    const { result } = await exec({ subject: "cloud revenue" }, ctx);
    expect(result.error).toBeUndefined();
    expect((result.queries as string[])[0]).toContain("cloud revenue");
  });

  it("resolves topic aliases: theme", async () => {
    const { result } = await exec({ theme: "SaaS churn" }, ctx);
    expect((result.queries as string[])[0]).toContain("SaaS churn");
  });

  it("resolves topic aliases: data_topic", async () => {
    const { result } = await exec({ data_topic: "GDP growth" }, ctx);
    expect((result.queries as string[])[0]).toContain("GDP growth");
  });

  it("resolves industry aliases: vertical, sector, domain", async () => {
    const r1 = await exec({ topic: "revenue", vertical: "fintech" }, ctx);
    expect((r1.result.queries as string[])[0]).toContain("fintech");

    const r2 = await exec({ topic: "revenue", sector: "healthcare" }, ctx);
    expect((r2.result.queries as string[])[0]).toContain("healthcare");

    const r3 = await exec({ topic: "revenue", domain: "e-commerce" }, ctx);
    expect((r3.result.queries as string[])[0]).toContain("e-commerce");
  });

  it("resolves region aliases: geography, market, country", async () => {
    const r1 = await exec({ topic: "sales", geography: "Europe" }, ctx);
    expect((r1.result.queries as string[])[0]).toContain("Europe");

    const r2 = await exec({ topic: "sales", market: "Japan" }, ctx);
    expect((r2.result.queries as string[])[0]).toContain("Japan");

    const r3 = await exec({ topic: "sales", country: "Germany" }, ctx);
    expect((r3.result.queries as string[])[0]).toContain("Germany");
  });

  it("resolves focus aliases: type, search_type, mode", async () => {
    const r1 = await exec({ topic: "churn", type: "case_study" }, ctx);
    expect((r1.result.referenceAngles as string[])).toContain("company-specific outcomes");

    const r2 = await exec({ topic: "churn", search_type: "trend" }, ctx);
    expect((r2.result.referenceAngles as string[])).toContain("year-over-year trajectory");

    const r3 = await exec({ topic: "churn", mode: "comparison" }, ctx);
    expect((r3.result.referenceAngles as string[])).toContain("relative positioning & ranking");
  });

  it("primary param wins over alias", async () => {
    const { result } = await exec({ topic: "primary", subject: "alias" }, ctx);
    expect((result.queries as string[])[0]).toContain("primary");
    expect((result.queries as string[])[0]).not.toContain("alias");
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("search_reference — validation", () => {
  it("returns error when topic is missing", async () => {
    const { result } = await exec({}, ctx);
    expect(result.error).toBeDefined();
  });

  it("returns error when topic is empty string", async () => {
    const { result } = await exec({ topic: "" }, ctx);
    expect(result.error).toBeDefined();
  });

  it("returns error when topic is whitespace only", async () => {
    const { result } = await exec({ topic: "   " }, ctx);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Focus-specific query generation
// ---------------------------------------------------------------------------

describe("search_reference — focus modes", () => {
  it("benchmark: generates benchmark query + angles", async () => {
    const { result } = await exec({ topic: "ARR growth", focus: "benchmark" }, ctx);
    const queries = result.queries as string[];
    expect(queries.some((q) => q.includes("benchmark"))).toBe(true);
    expect((result.referenceAngles as string[])).toContain("industry average & median");
  });

  it("case_study: generates case study query + angles", async () => {
    const { result } = await exec({ topic: "digital transformation", focus: "case_study" }, ctx);
    const queries = result.queries as string[];
    expect(queries.some((q) => q.includes("case study"))).toBe(true);
    expect((result.referenceAngles as string[])).toContain("lessons learned & pitfalls");
  });

  it("trend: generates forecast query + angles", async () => {
    const { result } = await exec({ topic: "AI adoption", focus: "trend" }, ctx);
    const queries = result.queries as string[];
    expect(queries.some((q) => q.includes("trend forecast"))).toBe(true);
    expect((result.referenceAngles as string[])).toContain("forecast confidence range");
  });

  it("comparison: generates competitive query + angles", async () => {
    const { result } = await exec({ topic: "cloud providers", focus: "comparison" }, ctx);
    const queries = result.queries as string[];
    expect(queries.some((q) => q.includes("competitors") || q.includes("comparison"))).toBe(true);
    expect((result.referenceAngles as string[])).toContain("competitive differentiation factors");
  });

  it("unknown focus falls back to default 3 focuses", async () => {
    const { result } = await exec({ topic: "revenue", focus: "unknown_value" }, ctx);
    const angles = result.referenceAngles as string[];
    // Default = benchmark + trend + comparison → 9 angles
    expect(angles.length).toBe(9);
  });

  it("no focus falls back to default 3 focuses", async () => {
    const { result } = await exec({ topic: "revenue" }, ctx);
    const angles = result.referenceAngles as string[];
    expect(angles.length).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// Query structure
// ---------------------------------------------------------------------------

describe("search_reference — query structure", () => {
  it("first query is always the raw topic combo", async () => {
    const { result } = await exec(
      { topic: "EV sales", industry: "auto", region: "EU" },
      ctx,
    );
    const q0 = (result.queries as string[])[0];
    expect(q0).toContain("EV sales");
    expect(q0).toContain("auto");
    expect(q0).toContain("EU");
    expect(q0).toContain(String(YEAR));
  });

  it("queries include current year", async () => {
    const { result } = await exec({ topic: "GDP", focus: "benchmark" }, ctx);
    const queries = result.queries as string[];
    expect(queries.some((q) => q.includes(String(YEAR)))).toBe(true);
  });

  it("queries are deduplicated", async () => {
    const { result } = await exec({ topic: "test" }, ctx);
    const queries = result.queries as string[];
    const unique = new Set(queries);
    expect(queries.length).toBe(unique.size);
  });

  it("queries have no extra whitespace", async () => {
    const { result } = await exec({ topic: "  spaced  topic  ", industry: "  fintech  " }, ctx);
    const queries = result.queries as string[];
    for (const q of queries) {
      expect(q).toBe(q.trim());
      expect(q).not.toMatch(/\s{2,}/);
    }
  });

  it("result includes groundingHint", async () => {
    const { result } = await exec({ topic: "test" }, ctx);
    expect(result.groundingHint).toBeDefined();
    expect(typeof result.groundingHint).toBe("string");
  });
});
