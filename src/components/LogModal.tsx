import { useState, useEffect, useCallback } from "react";
import {
  getLogEntries,
  clearLogEntries,
  subscribeLog,
  formatLogForCopy,
  type GeminiLogEntry,
} from "../services/geminiLog";

type Props = { open: boolean; onClose: () => void };

export const LogModal: React.FC<Props> = ({ open, onClose }) => {
  const [entries, setEntries] = useState<GeminiLogEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => setEntries([...getLogEntries()]), []);

  useEffect(() => {
    if (open) refresh();
    const unsub = subscribeLog(refresh);
    return unsub;
  }, [open, refresh]);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(formatLogForCopy());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="rm-settings-overlay" onClick={onClose}>
      <div className="rm-log-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rm-settings-header">
          <h2 className="rm-settings-title">Gemini API Log ({entries.length})</h2>
          <button className="rm-settings-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {/* Toolbar */}
        <div className="rm-log-toolbar">
          <button className="rm-btn rm-btn-secondary rm-btn-sm" onClick={handleCopyAll}>
            {copied ? "Copied!" : "Copy All"}
          </button>
          <button className="rm-btn rm-btn-secondary rm-btn-sm"
            onClick={() => { clearLogEntries(); refresh(); }}
            style={{ color: "#dc2626" }}>Clear</button>
        </div>

        {/* Entries */}
        <div className="rm-log-body">
          {entries.length === 0 && (
            <div className="rm-log-empty">No API calls recorded yet. Generate a video to see logs.</div>
          )}
          {[...entries].reverse().map((e) => (
            <div key={e.id} className={`rm-log-entry ${e.status === "error" ? "rm-log-error" : ""}`}>
              <div className="rm-log-entry-header" onClick={() => toggleExpand(e.id)}>
                <span className="rm-log-entry-id">#{e.id}</span>
                <span className={`rm-log-status rm-log-status-${e.status}`}>
                  {e.status === "ok" ? "OK" : `ERR ${e.httpStatus}`}
                </span>
                <span className="rm-log-model">{e.model}</span>
                <span className="rm-log-dur">{e.durationMs}ms</span>
                <span className="rm-log-tools">{e.tools.length > 0 ? e.tools.join(", ") : "-"}</span>
                <span className="rm-log-time">{new Date(e.timestamp).toLocaleTimeString()}</span>
                <span className="rm-log-expand">{expanded.has(e.id) ? "▼" : "▶"}</span>
              </div>
              <div className="rm-log-summary">{e.responseSummary}</div>
              {expanded.has(e.id) && (
                <div className="rm-log-detail-box">
                  <div className="rm-log-section">
                    <strong>Request</strong> ({e.messageCount} messages, temp {e.temperature})
                    <pre className="rm-log-pre">{JSON.stringify(e.requestBody, null, 2)}</pre>
                  </div>
                  <div className="rm-log-section">
                    <strong>Response</strong>
                    {e.error && <div className="rm-log-error-msg">{e.error}</div>}
                    <pre className="rm-log-pre">{JSON.stringify(e.responseData, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
