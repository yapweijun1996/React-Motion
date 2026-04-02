/**
 * CostModal — breakdown of generation cost per category.
 *
 * Shows: total cost, per-category bars, token counts, call count.
 * Also shows cumulative cost from history entries.
 */

import { useState, useEffect } from "react";
import type { CostSummary } from "../services/costTracker";
import { formatCost } from "../services/costTracker";
import { loadHistory } from "../services/historyStore";

type Props = {
  open: boolean;
  onClose: () => void;
  currentCost: CostSummary | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: "AI Agent",
  svgGen: "SVG Generation",
  tts: "Narration (TTS)",
  bgm: "Background Music",
  imageGen: "Image Generation",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  agent: "#0F766E",
  svgGen: "#8b5cf6",
  tts: "#3b82f6",
  bgm: "#f59e0b",
  imageGen: "#ec4899",
  other: "#6b7280",
};

export function CostModal({ open, onClose, currentCost }: Props) {
  const [totalHistoryCost, setTotalHistoryCost] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    loadHistory().then((entries) => {
      let total = 0;
      let count = 0;
      for (const e of entries) {
        if (e.costUsd) {
          total += e.costUsd;
          count++;
        }
      }
      setTotalHistoryCost(total);
      setHistoryCount(count);
    });
  }, [open]);

  if (!open) return null;

  const breakdown = currentCost?.breakdown ?? {};
  const maxCat = Math.max(...Object.values(breakdown), 0.001);

  return (
    <div className="rm-panel-overlay" onClick={onClose}>
      <div className="rm-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="rm-panel-header">
          <h2 className="rm-panel-title">Generation Cost</h2>
          <button className="rm-btn-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="rm-panel-body" style={{ padding: "16px 20px" }}>
          {currentCost ? (
            <>
              {/* Total */}
              <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: "var(--rm-text)", fontFamily: "var(--rm-font-mono)" }}>
                  {formatCost(currentCost.totalUsd)}
                </div>
                <div style={{ fontSize: 13, color: "var(--rm-muted)", marginTop: 4 }}>
                  {currentCost.callCount} API calls &middot; {(currentCost.totalInputTokens / 1000).toFixed(1)}K input &middot; {(currentCost.totalOutputTokens / 1000).toFixed(1)}K output
                </div>
              </div>

              {/* Category breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(breakdown)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, cost]) => (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 120, fontSize: 13, color: "var(--rm-muted)", textAlign: "right", flexShrink: 0 }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <div style={{ flex: 1, height: 22, background: "var(--rm-border)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.max((cost / maxCat) * 100, 2)}%`,
                          background: CATEGORY_COLORS[cat] ?? "#6b7280",
                          borderRadius: 4,
                        }} />
                      </div>
                      <span style={{ width: 70, fontSize: 13, fontFamily: "var(--rm-font-mono)", color: "var(--rm-text)", textAlign: "right", flexShrink: 0 }}>
                        {formatCost(cost)}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 32, color: "var(--rm-muted)" }}>
              No generation cost data yet. Generate a video to see costs.
            </div>
          )}

          {/* Cumulative from history */}
          <div style={{
            marginTop: 16, padding: "12px 16px",
            background: "var(--rm-bg-elevated)", borderRadius: 8, border: "1px solid var(--rm-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, color: "var(--rm-muted)" }}>
              Cumulative ({historyCount} generations)
            </span>
            <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--rm-font-mono)", color: "var(--rm-text)" }}>
              {formatCost(totalHistoryCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
