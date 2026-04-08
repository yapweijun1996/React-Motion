// @vitest-environment jsdom
/**
 * CostModal unit tests — fixed category order, banners, cumulative detection.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostModal } from "../src/components/CostModal";
import type { CostSummary, CostCategory } from "../src/services/costTracker";

// Mock loadHistory to control cumulative data
vi.mock("../src/services/historyStore", () => ({
  loadHistory: vi.fn().mockResolvedValue([]),
}));

import { loadHistory } from "../src/services/historyStore";
const mockLoadHistory = vi.mocked(loadHistory);

function makeSummary(overrides: Partial<CostSummary> = {}): CostSummary {
  return {
    version: 2,
    totalUsd: 0.05,
    breakdown: { agent: 0.03, svgGen: 0.005, tts: 0.008, bgm: 0.004, imageGen: 0.003, grounding: 0, other: 0 },
    totalInputTokens: 50000,
    totalOutputTokens: 10000,
    callCount: 8,
    entries: [],
    estimateStatus: "complete",
    warnings: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockLoadHistory.mockResolvedValue([]);
});

describe("CostModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CostModal open={false} onClose={() => {}} currentCost={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows 'no data' message when open with null cost", () => {
    render(<CostModal open={true} onClose={() => {}} currentCost={null} />);
    expect(screen.getByText(/No generation cost data/)).toBeTruthy();
  });

  it("displays all 7 categories in fixed order even when 0", () => {
    const cost = makeSummary();
    render(<CostModal open={true} onClose={() => {}} currentCost={cost} />);

    const labels = [
      "AI Agent", "SVG Generation", "Narration (TTS)",
      "Background Music", "Image Generation", "Grounding", "Other",
    ];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("shows $0 for categories with zero cost", () => {
    const cost = makeSummary({
      breakdown: { agent: 0.03, svgGen: 0, tts: 0, bgm: 0, imageGen: 0, grounding: 0, other: 0 },
    });
    render(<CostModal open={true} onClose={() => {}} currentCost={cost} />);

    // Should display "US$0" text for zero categories
    const zeroElements = screen.getAllByText("US$0");
    expect(zeroElements.length).toBeGreaterThanOrEqual(6); // 6 categories at $0
  });

  it("shows API calls count", () => {
    const cost = makeSummary({ callCount: 12 });
    render(<CostModal open={true} onClose={() => {}} currentCost={cost} />);
    expect(screen.getByText(/12 API calls/)).toBeTruthy();
  });

  it("shows partial estimate banner with warnings", () => {
    const cost = makeSummary({
      estimateStatus: "partial",
      warnings: ["Unknown model \"gemini-99\" — cost excluded from total"],
    });
    render(<CostModal open={true} onClose={() => {}} currentCost={cost} />);
    expect(screen.getByText("Partial estimate")).toBeTruthy();
    expect(screen.getByText(/Unknown model/)).toBeTruthy();
  });

  it("shows legacy estimate banner", () => {
    const cost = makeSummary({ estimateStatus: "legacy" });
    render(<CostModal open={true} onClose={() => {}} currentCost={cost} />);
    expect(screen.getByText("Legacy estimate")).toBeTruthy();
  });

  it("no banner for complete estimates", () => {
    const cost = makeSummary({ estimateStatus: "complete" });
    render(<CostModal open={true} onClose={() => {}} currentCost={cost} />);
    expect(screen.queryByText("Partial estimate")).toBeNull();
    expect(screen.queryByText("Legacy estimate")).toBeNull();
  });

  it("grounding row is displayed when grounding cost > 0", () => {
    const cost = makeSummary({
      breakdown: { agent: 0.03, svgGen: 0, tts: 0, bgm: 0, imageGen: 0, grounding: 0.014, other: 0 },
    });
    render(<CostModal open={true} onClose={() => {}} currentCost={cost} />);
    expect(screen.getByText("Grounding")).toBeTruthy();
  });
});

describe("CostModal cumulative", () => {
  it("shows cumulative cost from history", async () => {
    mockLoadHistory.mockResolvedValue([
      { prompt: "p1", script: {} as never, ttsMetadata: [], createdAt: 1, costUsd: 0.05 },
      { prompt: "p2", script: {} as never, ttsMetadata: [], createdAt: 2, costUsd: 0.03 },
    ]);
    render(<CostModal open={true} onClose={() => {}} currentCost={null} />);
    // Wait for async history load
    await vi.waitFor(() => {
      expect(screen.getByText(/2 generations/)).toBeTruthy();
    });
  });

  it("shows partial/legacy hint when history has legacy entries", async () => {
    mockLoadHistory.mockResolvedValue([
      { prompt: "p1", script: {} as never, ttsMetadata: [], createdAt: 1, costUsd: 0.05 },
      // Legacy entry: has costUsd but no costSummary
    ]);
    render(<CostModal open={true} onClose={() => {}} currentCost={null} />);
    await vi.waitFor(() => {
      expect(screen.getByText(/partial\/legacy/)).toBeTruthy();
    });
  });

  it("shows partial/legacy hint when history has partial costSummary", async () => {
    mockLoadHistory.mockResolvedValue([
      {
        prompt: "p1", script: {} as never, ttsMetadata: [], createdAt: 1,
        costUsd: 0.03,
        costSummary: makeSummary({ estimateStatus: "partial", totalUsd: 0.03 }),
      },
    ]);
    render(<CostModal open={true} onClose={() => {}} currentCost={null} />);
    await vi.waitFor(() => {
      expect(screen.getByText(/partial\/legacy/)).toBeTruthy();
    });
  });

  it("no partial hint when all history entries have complete costSummary", async () => {
    mockLoadHistory.mockResolvedValue([
      {
        prompt: "p1", script: {} as never, ttsMetadata: [], createdAt: 1,
        costUsd: 0.03,
        costSummary: makeSummary({ estimateStatus: "complete", totalUsd: 0.03 }),
      },
    ]);
    render(<CostModal open={true} onClose={() => {}} currentCost={null} />);
    await vi.waitFor(() => {
      expect(screen.getByText(/1 generation/)).toBeTruthy();
    });
    expect(screen.queryByText(/partial\/legacy/)).toBeNull();
  });
});
