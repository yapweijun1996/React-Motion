import type { GenerationProgress } from "../services/generateScript";

const TOOL_LABELS: Record<string, string> = {
  analyze_data: "Data",
  draft_storyboard: "Storyboard",
  get_element_catalog: "Elements",
  generate_palette: "Palette",
  produce_script: "Script",
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

type Props = { progress: GenerationProgress };

export const GenerationProgressBar: React.FC<Props> = ({ progress }) => {
  const { stageIndex, stageCount, stageLabel, message, percent, elapsedMs, eta, completedTools } = progress;

  return (
    <div className="rm-alert rm-alert-info">
      {/* Header: stage + elapsed */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong>
          Step {stageIndex + 1}/{stageCount} &middot; {stageLabel}
        </strong>
        <span className="rm-eta">{formatElapsed(elapsedMs)} elapsed</span>
      </div>

      {/* Detail message + ETA */}
      <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>{message}</span>
        {eta != null && eta > 0 && (
          <span className="rm-eta">{formatEta(eta)}</span>
        )}
      </div>

      {/* Tool breadcrumbs (agent stage only) */}
      {completedTools && completedTools.length > 0 && (
        <div className="rm-gen-breadcrumbs">
          {completedTools.map((t) => (
            <span key={t} className="rm-gen-check">
              {TOOL_LABELS[t] ?? t}
            </span>
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
