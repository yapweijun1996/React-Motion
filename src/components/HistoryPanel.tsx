/**
 * HistoryPanel — slide-out panel showing generation history + export records.
 *
 * Features:
 * - Browse past generated scripts (newest first)
 * - Restore a script (loads into player, prompt into textarea)
 * - Regenerate TTS for restored scripts
 * - View export history (filename, size, date)
 * - Delete individual entries or clear all
 */

import { useState, useEffect, useCallback } from "react";
import { loadHistory, deleteHistoryEntry, clearHistory, type HistoryEntry } from "../services/historyStore";
import { loadExportRecords, deleteExportRecord, type ExportRecord } from "../services/exportStore";
import type { VideoScript } from "../types";
import type { TTSMetadata } from "../services/historyStore";

type HistoryPanelProps = {
  open: boolean;
  onClose: () => void;
  onRestore: (script: VideoScript, prompt: string, ttsMetadata: TTSMetadata[], costUsd?: number, costBreakdown?: Record<string, number>, costSummary?: import("../services/costTracker").CostSummary, historyId?: number) => void;
  disabled?: boolean;
};

export function HistoryPanel({ open, onClose, onRestore, disabled }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [tab, setTab] = useState<"history" | "exports">("history");

  const refresh = useCallback(async () => {
    const [h, e] = await Promise.all([loadHistory(), loadExportRecords()]);
    setHistory(h);
    setExports(e);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const handleRestore = (entry: HistoryEntry) => {
    onRestore(entry.script, entry.prompt, entry.ttsMetadata, entry.costUsd, entry.costBreakdown, entry.costSummary, entry.id);
    onClose();
  };

  const handleDeleteHistory = async (id: number) => {
    await deleteHistoryEntry(id);
    await refresh();
  };

  const handleClearHistory = async () => {
    await clearHistory();
    await refresh();
  };

  const handleDeleteExport = async (id: number) => {
    await deleteExportRecord(id);
    await refresh();
  };

  return (
    <div className="rm-panel-overlay" onClick={onClose}>
      <div className="rm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rm-panel-header">
          <h3 className="rm-panel-title">History</h3>
          <button className="rm-btn-close" onClick={onClose} aria-label="Close">x</button>
        </div>

        {/* Tabs */}
        <div className="rm-tabs">
          <button
            className={`rm-tab ${tab === "history" ? "rm-tab-active" : ""}`}
            onClick={() => setTab("history")}
          >
            Scripts ({history.length})
          </button>
          <button
            className={`rm-tab ${tab === "exports" ? "rm-tab-active" : ""}`}
            onClick={() => setTab("exports")}
          >
            Exports ({exports.length})
          </button>
        </div>

        <div className="rm-panel-body">
          {tab === "history" && (
            <HistoryTab
              entries={history}
              onRestore={handleRestore}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
              disabled={disabled}
            />
          )}
          {tab === "exports" && (
            <ExportsTab
              records={exports}
              onDelete={handleDeleteExport}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- History tab ---

type HistoryTabProps = {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  disabled?: boolean;
};

function HistoryTab({ entries, onRestore, onDelete, onClear, disabled }: HistoryTabProps) {
  if (entries.length === 0) {
    return <div className="rm-panel-empty">No history yet. Generate a video to get started.</div>;
  }

  return (
    <>
      {entries.length > 1 && (
        <div className="rm-panel-actions">
          <button className="rm-btn rm-btn-sm rm-btn-danger" onClick={onClear}>Clear All</button>
        </div>
      )}
      <ul className="rm-history-list">
        {entries.map((entry) => (
          <li key={entry.id} className="rm-history-item">
            <div className="rm-history-meta">
              <strong className="rm-history-title">{entry.script.title}</strong>
              <span className="rm-history-date">{formatDate(entry.createdAt)}</span>
            </div>
            <div className="rm-history-prompt">{truncate(entry.prompt, 80)}</div>
            <div className="rm-history-stats">
              {entry.script.scenes.length} scenes
              {entry.ttsMetadata.length > 0 && ` · ${entry.ttsMetadata.length} TTS`}
              {` · ${(entry.script.durationInFrames / entry.script.fps).toFixed(1)}s`}
              {entry.costUsd != null && ` · US$${entry.costUsd < 0.01 ? entry.costUsd.toFixed(4) : entry.costUsd.toFixed(2)}`}
            </div>
            <div className="rm-history-actions">
              <button
                className="rm-btn rm-btn-sm rm-btn-primary"
                onClick={() => onRestore(entry)}
                disabled={disabled}
              >
                Restore
              </button>
              <button
                className="rm-btn rm-btn-sm rm-btn-danger"
                onClick={() => entry.id && onDelete(entry.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// --- Exports tab ---

type ExportsTabProps = {
  records: ExportRecord[];
  onDelete: (id: number) => void;
};

function ExportsTab({ records, onDelete }: ExportsTabProps) {
  if (records.length === 0) {
    return <div className="rm-panel-empty">No exports yet. Export a video to see it here.</div>;
  }

  return (
    <ul className="rm-history-list">
      {records.map((rec) => (
        <li key={rec.id} className="rm-history-item">
          <div className="rm-history-meta">
            <strong className="rm-history-title">{rec.title}</strong>
            <span className="rm-history-date">{formatDate(rec.exportedAt)}</span>
          </div>
          <div className="rm-history-stats">
            {rec.filename} · {rec.sizeMB.toFixed(1)}MB · {rec.durationSec.toFixed(1)}s
          </div>
          <div className="rm-history-actions">
            <button
              className="rm-btn rm-btn-sm rm-btn-danger"
              onClick={() => rec.id && onDelete(rec.id)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// --- Helpers ---

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diffMin = Math.floor((now - ts) / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}
