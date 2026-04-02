/**
 * ScriptInspector — modal showing all video elements for debugging.
 *
 * Shows each scene with: layout, background, transition, elements (expandable).
 * SVG markup is displayed in a copyable code block.
 * Per-element copy button for easy paste into external tools.
 */

import { useState } from "react";
import type { VideoScript, VideoScene, SceneElement } from "../types/video";

type Props = {
  open: boolean;
  onClose: () => void;
  script: VideoScript | null;
};

export function ScriptInspector({ open, onClose, script }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open || !script) return null;

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const copyAll = () => copyText(JSON.stringify(script, null, 2), "all");

  return (
    <div className="rm-settings-overlay" onClick={onClose}>
      <div className="rm-log-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rm-settings-header">
          <h2 className="rm-settings-title">Script Inspector ({script.scenes.length} scenes)</h2>
          <button className="rm-settings-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="rm-log-toolbar">
          <button className="rm-btn rm-btn-secondary rm-btn-sm" onClick={copyAll}>
            {copiedId === "all" ? "Copied!" : "Copy Full JSON"}
          </button>
        </div>

        <div className="rm-log-body">
          {script.scenes.map((scene, si) => (
            <div key={scene.id} className="rm-log-entry">
              <div className="rm-log-entry-header" onClick={() => toggle(si)}>
                <span className="rm-log-entry-id">S{si + 1}</span>
                <SceneBadges scene={scene} />
                <span className="rm-log-expand">{expanded.has(si) ? "▼" : "▶"}</span>
              </div>
              <div className="rm-log-summary" style={{ fontSize: 12, opacity: 0.7 }}>
                {scene.narration?.slice(0, 80)}{(scene.narration?.length ?? 0) > 80 ? "..." : ""}
              </div>
              {expanded.has(si) && (
                <SceneDetail scene={scene} si={si} copyText={copyText} copiedId={copiedId} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════

function SceneBadges({ scene }: { scene: VideoScene }) {
  return (
    <span style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
      <Badge color="#3b82f6" label={scene.layout ?? "column"} />
      <Badge color="#8b5cf6" label={scene.transition ?? "fade"} />
      <Badge color={scene.bgGradient ? "#f59e0b" : scene.bgEffect ? "#ef4444" : "#64748b"}
        label={scene.bgGradient ? "gradient" : scene.bgEffect ? scene.bgEffect : "solid"} />
      {scene.elements.map((el, i) => (
        <Badge key={i} color={ELEMENT_COLORS[el.type] ?? "#6b7280"} label={el.type} />
      ))}
    </span>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      fontFamily: "monospace", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ═══════════════════════════════════════════════════════════════════

function SceneDetail({ scene, si, copyText, copiedId }: {
  scene: VideoScene; si: number;
  copyText: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Scene meta */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#94a3b8" }}>
        <span>Duration: {scene.durationInFrames}f</span>
        {scene.bgColor && <span>bgColor: {scene.bgColor}</span>}
        {scene.bgGradient && <span>bgGradient: {scene.bgGradient.slice(0, 50)}...</span>}
        {scene.bgEffect && <span>bgEffect: {scene.bgEffect}</span>}
        {scene.imagePrompt && <span>imagePrompt: {scene.imagePrompt.slice(0, 40)}...</span>}
      </div>

      {/* Narration */}
      {scene.narration && (
        <div style={{ background: "#1c1917", borderRadius: 6, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#78716c", fontWeight: 600 }}>NARRATION</span>
            <CopyBtn id={`nar-${si}`} text={scene.narration} copyText={copyText} copiedId={copiedId} />
          </div>
          <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{scene.narration}</div>
        </div>
      )}

      {/* Elements */}
      {scene.elements.map((el, ei) => (
        <ElementCard key={ei} el={el} si={si} ei={ei} copyText={copyText} copiedId={copiedId} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════

function ElementCard({ el, si, ei, copyText, copiedId }: {
  el: SceneElement; si: number; ei: number;
  copyText: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const elJson = JSON.stringify(el, null, 2);
  const id = `el-${si}-${ei}`;
  const hasSvg = (el.type === "svg" || el.type === "svg-3d") && typeof el.markup === "string";

  return (
    <div style={{ background: "#292524", borderRadius: 8, padding: 10, border: "1px solid #44403c" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Badge color={ELEMENT_COLORS[el.type] ?? "#6b7280"} label={el.type} />
        <div style={{ display: "flex", gap: 4 }}>
          {hasSvg && (
            <CopyBtn id={`svg-${si}-${ei}`} text={el.markup as string} copyText={copyText} copiedId={copiedId} label="SVG" />
          )}
          <CopyBtn id={id} text={elJson} copyText={copyText} copiedId={copiedId} label="JSON" />
        </div>
      </div>

      {/* SVG preview */}
      {hasSvg && (
        <div style={{ background: "#1c1917", borderRadius: 6, padding: 8, marginBottom: 6 }}>
          <div style={{ maxHeight: 200, overflow: "auto" }}>
            <pre style={{ fontSize: 11, color: "#a8a29e", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {(el.markup as string).slice(0, 2000)}{(el.markup as string).length > 2000 ? "\n..." : ""}
            </pre>
          </div>
        </div>
      )}

      {/* Key props */}
      <div style={{ fontSize: 12, color: "#a8a29e", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {propSpan(el, "animation")}
        {propSpan(el, "stagger")}
        {propSpan(el, "fontSize")}
        {propSpan(el, "content", 50)}
        {propSpan(el, "value")}
        {propSpan(el, "label")}
        {arraySpan(el, "items")}
        {arraySpan(el, "bars")}
        {arraySpan(el, "slices")}
        {arraySpan(el, "series")}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════

function CopyBtn({ id, text, copyText, copiedId, label = "Copy" }: {
  id: string; text: string;
  copyText: (text: string, id: string) => void;
  copiedId: string | null; label?: string;
}) {
  return (
    <button
      onClick={() => copyText(text, id)}
      style={{
        background: copiedId === id ? "#22c55e22" : "#44403c",
        color: copiedId === id ? "#22c55e" : "#a8a29e",
        border: "none", borderRadius: 4, padding: "2px 8px",
        fontSize: 11, cursor: "pointer", fontFamily: "monospace",
      }}
    >{copiedId === id ? "Copied!" : label}</button>
  );
}

// ═══════════════════════════════════════════════════════════════════

function propSpan(el: SceneElement, key: string, maxLen?: number) {
  const v = el[key];
  if (v == null) return null;
  const s = maxLen ? String(v).slice(0, maxLen) : String(v);
  return <span>{key}: {s}</span>;
}

function arraySpan(el: SceneElement, key: string) {
  const v = el[key];
  if (!Array.isArray(v)) return null;
  return <span>{key}: {v.length}</span>;
}

const ELEMENT_COLORS: Record<string, string> = {
  text: "#6b7280", metric: "#10b981", "bar-chart": "#3b82f6", "pie-chart": "#8b5cf6",
  "line-chart": "#06b6d4", sankey: "#f43f5e", svg: "#ec4899", "svg-3d": "#d946ef",
  map: "#14b8a6", list: "#78716c", callout: "#f59e0b", comparison: "#ef4444",
  timeline: "#0ea5e9", progress: "#22c55e", icon: "#a855f7", annotation: "#e11d48",
  kawaii: "#fb923c", lottie: "#c084fc", divider: "#9ca3af",
};
