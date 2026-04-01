import { useState, useEffect, useRef } from "react";
import type { GenerationProgress } from "../services/generateScript";

const TOOL_LABELS: Record<string, string> = {
  analyze_data: "Data",
  draft_storyboard: "Storyboard",
  get_element_catalog: "Elements",
  generate_palette: "Palette",
  direct_visuals: "Visual Direction",
  produce_script: "Script",
  refine_scene: "Refine",
  search_reference: "Research",
};

const ACTION_ICONS: Record<string, string> = {
  thinking: "\u{1F9E0}",
  quality_gate: "\u{1F50D}",
  evaluate: "\u{1F50D}",
  evaluate_retry: "\u{1F527}",
  advisory: "\u{1F4AC}",
  phase1_start: "\u{1F4DD}",
  phase2_start: "\u{1F3AC}",
  phase3_start: "\u{2705}",
};

function formatElapsed(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${seconds}s remaining`;
  return `~${Math.floor(seconds / 60)}m ${seconds % 60}s remaining`;
}

function getActionIcon(action: string): string {
  if (action.startsWith("tool:")) return "\u{1F6E0}";
  if (action.startsWith("tool_error:")) return "\u{26A0}";
  if (action.includes(":tool:")) return "\u{1F6E0}";
  if (action.includes(":thinking")) return "\u{1F9E0}";
  return ACTION_ICONS[action] ?? "\u{25B6}";
}

function formatAction(action: string): string {
  // Multi-agent prefixed actions: "Storyboard:tool:analyze_data"
  if (action.includes(":tool:")) {
    const toolName = action.split(":tool:")[1];
    return TOOL_LABELS[toolName] ?? toolName;
  }
  if (action.startsWith("tool:")) return TOOL_LABELS[action.slice(5)] ?? action.slice(5);
  const LABELS: Record<string, string> = {
    thinking: "Thinking",
    quality_gate: "Quality Check",
    evaluate: "AI Evaluation",
    evaluate_retry: "Fixing Issues",
    advisory: "Narrative Review",
    phase1_start: "Storyboard Agent",
    phase1_done: "Storyboard Done",
    phase2_start: "Visual Director",
    phase2_done: "Visual Done",
    phase3_start: "Quality Reviewer",
    phase3_pass: "Quality Passed",
    phase3_issues: "Issues Found",
    complete: "Complete",
  };
  return LABELS[action] ?? action;
}

type LogEntry = { action: string; detail?: string; time: number };

type Props = { progress: GenerationProgress };

export const GenerationProgressBar: React.FC<Props> = ({ progress }) => {
  const { stageIndex, stageCount, stageLabel, message, percent, startTime, eta, completedTools, agentDetail } = progress;
  const [now, setNow] = useState(() => performance.now());
  const logRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Track action log (keep last 6)
  useEffect(() => {
    if (!agentDetail) return;
    const { action, detail } = agentDetail;
    const last = logRef.current[logRef.current.length - 1];
    if (last?.action === action && last?.detail === detail) return;
    logRef.current = [...logRef.current.slice(-5), { action, detail, time: Date.now() }];
  }, [agentDetail?.action, agentDetail?.detail]);

  const liveElapsed = startTime ? Math.round(now - startTime) : progress.elapsedMs;
  const iterText = agentDetail ? `Turn ${agentDetail.iteration}/${agentDetail.maxIterations}` : null;

  return (
    <div className="rm-alert rm-alert-info">
      {/* Header: stage + elapsed */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong>Step {stageIndex + 1}/{stageCount} &middot; {stageLabel}</strong>
        <span className="rm-eta">{formatElapsed(liveElapsed)} elapsed</span>
      </div>

      {/* Detail message + ETA */}
      <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>{message}</span>
        {eta != null && eta > 0 && <span className="rm-eta">{formatEta(eta)}</span>}
      </div>

      {/* Agent detail section — iteration + action */}
      {agentDetail && (
        <div className="rm-gen-detail">
          <div className="rm-gen-detail-row">
            <span className="rm-gen-iter">{iterText}</span>
            <span className="rm-gen-action">
              {getActionIcon(agentDetail.action)} {formatAction(agentDetail.action)}
            </span>
          </div>
          {agentDetail.detail && (
            <div className="rm-gen-action-detail">{truncate(agentDetail.detail, 120)}</div>
          )}
        </div>
      )}

      {/* Tool breadcrumbs */}
      {completedTools && completedTools.length > 0 && (
        <div className="rm-gen-breadcrumbs">
          {completedTools.map((t) => (
            <span key={t} className="rm-gen-check">{TOOL_LABELS[t] ?? t}</span>
          ))}
        </div>
      )}

      {/* Recent action log */}
      {logRef.current.length > 1 && (
        <div className="rm-gen-log">
          {logRef.current.slice(0, -1).map((entry, i) => (
            <div key={i} className="rm-gen-log-entry">
              <span className="rm-gen-log-icon">{getActionIcon(entry.action)}</span>
              <span>{formatAction(entry.action)}</span>
              {entry.detail && <span className="rm-gen-log-detail">{truncate(entry.detail, 60)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="rm-progress-track" style={{ marginTop: 8 }}>
        <div className="rm-progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
};

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}
