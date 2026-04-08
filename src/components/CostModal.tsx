/**
 * CostModal — breakdown of generation cost per category.
 *
 * Shows: total cost, per-category bars (fixed order), token counts, call count.
 * Supports v2 estimate status: complete, partial, legacy.
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

/** Fixed display order — always shown even when cost is 0 */
const CATEGORY_ORDER = ["agent", "svgGen", "tts", "bgm", "imageGen", "grounding", "other"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  agent: "AI Agent",
  svgGen: "SVG Generation",
  tts: "Narration (TTS)",
  bgm: "Background Music",
  imageGen: "Image Generation",
  grounding: "Grounding",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  agent: "#0F766E",
  svgGen: "#8b5cf6",
  tts: "#3b82f6",
  bgm: "#f59e0b",
  imageGen: "#ec4899",
  grounding: "#06b6d4",
  other: "#6b7280",
};

export function CostModal({ open, onClose, currentCost }: Props) {
  const [totalHistoryCost, setTotalHistoryCost] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [hasPartialHistory, setHasPartialHistory] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadHistory().then((entries) => {
      let total = 0;
      let count = 0;
      let hasPartial = false;
      for (const e of entries) {
        // Prefer v2 costSummary total, fallback to legacy costUsd
        const usd = e.costSummary?.totalUsd ?? e.costUsd;
        if (usd) {
          total += usd;
          count++;
        }
        // Detect partial/legacy: no cost data at all, or v2 summary not "complete"
        if (usd == null && e.prompt) {
          hasPartial = true;
        } else if (e.costSummary && e.costSummary.estimateStatus !== "complete") {
          hasPartial = true;
        } else if (e.costUsd != null && !e.costSummary) {
          hasPartial = true; // legacy entry without v2 summary
        }
      }
      setTotalHistoryCost(total);
      setHistoryCount(count);
      setHasPartialHistory(hasPartial);
    });
  }, [open]);

  if (!open) return null;

  const breakdown: Partial<Record<string, number>> = currentCost?.breakdown ?? {};
  const maxCat = Math.max(...CATEGORY_ORDER.map(c => breakdown[c] ?? 0), 0.001);
  const status = currentCost?.estimateStatus ?? "complete";

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
              {/* Partial / Legacy banner */}
              {status === "partial" && (
                <div style={{
                  padding: "8px 12px", marginBottom: 12, borderRadius: 6,
                  background: "#fef3c7", border: "1px solid #f59e0b", fontSize: 12, color: "#92400e",
                }}>
                  <strong>Partial estimate</strong> — total may be lower than actual cost.
                  {currentCost.warnings.length > 0 && (
                    <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                      {currentCost.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  )}
                </div>
              )}
              {status === "legacy" && (
                <div style={{
                  padding: "8px 12px", marginBottom: 12, borderRadius: 6,
                  background: "#e0e7ff", border: "1px solid #818cf8", fontSize: 12, color: "#3730a3",
                }}>
                  <strong>Legacy estimate</strong> — restored from an older version. Pricing may differ from current rates.
                </div>
              )}

              {/* Total */}
              <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: "var(--rm-text)", fontFamily: "var(--rm-font-mono)" }}>
                  {formatCost(currentCost.totalUsd)}
                </div>
                <div style={{ fontSize: 13, color: "var(--rm-muted)", marginTop: 4 }}>
                  {currentCost.callCount} API calls &middot; {(currentCost.totalInputTokens / 1000).toFixed(1)}K input &middot; {(currentCost.totalOutputTokens / 1000).toFixed(1)}K output
                </div>
              </div>

              {/* Category breakdown — fixed order, always show all */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {CATEGORY_ORDER.map((cat) => {
                  const cost = breakdown[cat] ?? 0;
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 120, fontSize: 13, color: cost > 0 ? "var(--rm-muted)" : "var(--rm-border)", textAlign: "right", flexShrink: 0 }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <div style={{ flex: 1, height: 22, background: "var(--rm-border)", borderRadius: 4, overflow: "hidden" }}>
                        {cost > 0 && (
                          <div style={{
                            height: "100%",
                            width: `${Math.max((cost / maxCat) * 100, 2)}%`,
                            background: CATEGORY_COLORS[cat] ?? "#6b7280",
                            borderRadius: 4,
                          }} />
                        )}
                      </div>
                      <span style={{ width: 70, fontSize: 13, fontFamily: "var(--rm-font-mono)", color: cost > 0 ? "var(--rm-text)" : "var(--rm-border)", textAlign: "right", flexShrink: 0 }}>
                        {cost > 0 ? formatCost(cost) : "US$0"}
                      </span>
                    </div>
                  );
                })}
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
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--rm-muted)" }}>
                Cumulative ({historyCount} generations)
              </span>
              <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--rm-font-mono)", color: "var(--rm-text)" }}>
                {formatCost(totalHistoryCost)}
              </span>
            </div>
            {hasPartialHistory && (
              <div style={{ fontSize: 11, color: "var(--rm-muted)", marginTop: 4 }}>
                Includes partial/legacy estimates
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
