/**
 * StoragePanel — overlay panel showing IndexedDB storage usage.
 *
 * Visualizes:
 * - Total usage vs browser quota (segmented color bar)
 * - Per-history-entry sizes with delete action
 * - Category breakdown legend (TTS, Images, BGM, JSON, Metrics)
 *
 * Design reference: Google Drive storage UI — stacked bar + item list.
 */

import { useState, useEffect, useCallback } from "react";
import {
  analyzeStorage,
  formatBytes,
  type StorageSummary,
  type HistoryStorageEntry,
} from "../services/storageAnalyzer";
import { deleteHistoryEntry, clearHistory } from "../services/historyStore";
import { clearCache } from "../services/cache";

// --- Category colors (matches DESIGN.md semantic palette) ---

const CATEGORIES: { key: string; color: string; label: string }[] = [
  { key: "tts", color: "#0284C7", label: "TTS Audio" },
  { key: "images", color: "#16A34A", label: "Images" },
  { key: "bgm", color: "#D97706", label: "BGM Music" },
  { key: "json", color: "#78716C", label: "Script Data" },
  { key: "metrics", color: "#A8A29E", label: "Metrics" },
];

function getCatColor(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.color ?? "#A8A29E";
}

function getCatLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

// --- Component ---

type StoragePanelProps = {
  open: boolean;
  onClose: () => void;
};

export function StoragePanel({ open, onClose }: StoragePanelProps) {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await analyzeStorage());
    } catch (err) {
      console.error("[StoragePanel] Analysis failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const handleDeleteEntry = async (id: number) => {
    setDeleting(id);
    await deleteHistoryEntry(id);
    await refresh();
    setDeleting(null);
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all history, cache, and stored media? This cannot be undone.")) return;
    await clearHistory();
    await clearCache();
    await refresh();
  };

  return (
    <div className="rm-panel-overlay" onClick={onClose}>
      <div className="rm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rm-panel-header">
          <h3 className="rm-panel-title">Storage</h3>
          <button className="rm-btn-close" onClick={onClose} aria-label="Close">x</button>
        </div>

        <div className="rm-panel-body">
          {loading && !summary ? (
            <div className="rm-panel-empty">Analyzing storage...</div>
          ) : summary ? (
            <>
              <StorageHeader summary={summary} />
              <StorageBar summary={summary} />
              <CategoryLegend summary={summary} />
              <EntryList
                entries={summary.entries}
                cacheBytes={summary.cacheBytes}
                metricsBytes={summary.metricsBytes}
                deleting={deleting}
                onDelete={handleDeleteEntry}
              />
              {(summary.entries.length > 0 || summary.cacheBytes > 0) && (
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 16, borderTop: "1px solid var(--rm-border, #E7E5E4)", marginTop: 16 }}>
                  <button className="rm-btn rm-btn-sm rm-btn-danger" onClick={handleClearAll}>
                    Clear All Data
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rm-panel-empty">Unable to analyze storage.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Storage header (big number + quota) ---

function StorageHeader({ summary }: { summary: StorageSummary }) {
  const { totalBytes, quotaBytes } = summary;
  const usedPercent = quotaBytes && quotaBytes > 0
    ? Math.min((totalBytes / quotaBytes) * 100, 100)
    : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "var(--rm-text, #1C1917)", letterSpacing: "-0.5px" }}>
          {formatBytes(totalBytes)}
        </span>
        {quotaBytes != null && (
          <span style={{ fontSize: 14, color: "var(--rm-gray-400, #A8A29E)" }}>
            of {formatBytes(quotaBytes)}
          </span>
        )}
      </div>
      {usedPercent != null && (
        <span style={{ fontSize: 12, color: "var(--rm-gray-400, #A8A29E)" }}>
          {usedPercent.toFixed(1)}% used
        </span>
      )}
    </div>
  );
}

// --- Segmented color bar (proportional within used space) ---

function StorageBar({ summary }: { summary: StorageSummary }) {
  const { totalBytes } = summary;
  if (totalBytes === 0) return null;

  // Segments are proportional to totalBytes (not quota)
  // This makes the bar always fill meaningfully like Google Drive
  const cats = Object.entries(summary.byCategory)
    .filter(([, bytes]) => bytes > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div style={{
      display: "flex",
      height: 12,
      borderRadius: 6,
      background: "var(--rm-gray-100, #F5F5F4)",
      overflow: "hidden",
      marginBottom: 16,
    }}>
      {cats.map(([cat, bytes]) => {
        const pct = (bytes / totalBytes) * 100;
        return (
          <div
            key={cat}
            title={`${getCatLabel(cat)}: ${formatBytes(bytes)}`}
            style={{
              width: `${pct}%`,
              height: "100%",
              backgroundColor: getCatColor(cat),
              minWidth: pct > 0 ? 3 : 0,
              transition: "width 0.25s ease-out",
            }}
          />
        );
      })}
    </div>
  );
}

// --- Category legend ---

function CategoryLegend({ summary }: { summary: StorageSummary }) {
  const cats = Object.entries(summary.byCategory)
    .filter(([, bytes]) => bytes > 0)
    .sort(([, a], [, b]) => b - a);

  if (cats.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 16px",
      marginBottom: 20,
      paddingBottom: 16,
      borderBottom: "1px solid var(--rm-border, #E7E5E4)",
    }}>
      {cats.map(([cat, bytes]) => (
        <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <span style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: getCatColor(cat),
            flexShrink: 0,
          }} />
          <span style={{ color: "var(--rm-gray-600, #57534E)" }}>{getCatLabel(cat)}</span>
          <span style={{ color: "var(--rm-gray-400, #A8A29E)", fontFamily: "var(--rm-font-mono, monospace)", fontSize: 12 }}>
            {formatBytes(bytes)}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Entry list ---

type EntryListProps = {
  entries: HistoryStorageEntry[];
  cacheBytes: number;
  metricsBytes: number;
  deleting: number | null;
  onDelete: (id: number) => void;
};

const entryCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  border: "1px solid var(--rm-border, #E7E5E4)",
  borderRadius: 8,
  background: "var(--rm-bg-surface, #FFFFFF)",
  marginBottom: 6,
};

const systemCardStyle: React.CSSProperties = {
  ...entryCardStyle,
  opacity: 0.65,
  borderStyle: "dashed",
};

function EntryList({ entries, cacheBytes, metricsBytes, deleting, onDelete }: EntryListProps) {
  return (
    <div>
      {/* Section header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--rm-gray-600, #57534E)",
        marginBottom: 10,
        paddingBottom: 6,
        borderBottom: "1px solid var(--rm-border, #E7E5E4)",
      }}>
        <span>History ({entries.length} entries)</span>
        <span>{formatBytes(entries.reduce((s, e) => s + e.totalBytes, 0))}</span>
      </div>

      {entries.length === 0 && cacheBytes === 0 && metricsBytes === 0 && (
        <div className="rm-panel-empty">No stored data. Generate a video to get started.</div>
      )}

      {/* Cached script */}
      {cacheBytes > 0 && (
        <div style={systemCardStyle}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--rm-text, #1C1917)" }}>Current cached script</span>
            <span style={{ fontSize: 12, fontFamily: "var(--rm-font-mono, monospace)", color: "var(--rm-gray-400, #A8A29E)" }}>
              {formatBytes(cacheBytes)}
            </span>
          </div>
        </div>
      )}

      {/* History entries */}
      {entries.map((entry) => (
        <div key={entry.id} style={entryCardStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Row 1: name + size */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--rm-text, #1C1917)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }} title={entry.prompt}>
                {truncate(entry.prompt, 40)}
              </span>
              <span style={{
                fontSize: 12,
                fontFamily: "var(--rm-font-mono, monospace)",
                color: "var(--rm-gray-400, #A8A29E)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
                {formatBytes(entry.totalBytes)}
              </span>
            </div>
            {/* Row 2: date + breakdown */}
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--rm-gray-400, #A8A29E)" }}>
              <span>{formatDate(entry.createdAt)}</span>
              {entry.ttsBytes > 0 && <span>TTS {formatBytes(entry.ttsBytes)}</span>}
              {entry.bgmBytes > 0 && <span>BGM {formatBytes(entry.bgmBytes)}</span>}
              {entry.imageBytes > 0 && <span>IMG {formatBytes(entry.imageBytes)}</span>}
            </div>
          </div>
          {/* Delete button */}
          <button
            className="rm-btn rm-btn-sm rm-btn-danger"
            style={{ flexShrink: 0 }}
            onClick={() => onDelete(entry.id)}
            disabled={deleting === entry.id}
          >
            {deleting === entry.id ? "..." : "Delete"}
          </button>
        </div>
      ))}

      {/* Metrics row */}
      {metricsBytes > 0 && (
        <div style={systemCardStyle}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--rm-text, #1C1917)" }}>Metrics & export records</span>
            <span style={{ fontSize: 12, fontFamily: "var(--rm-font-mono, monospace)", color: "var(--rm-gray-400, #A8A29E)" }}>
              {formatBytes(metricsBytes)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function formatDate(ts: number): string {
  const now = Date.now();
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}
