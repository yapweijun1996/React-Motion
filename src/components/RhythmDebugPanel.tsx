/**
 * RhythmDebugPanel — visual rhythm strip for founder/dev debugging.
 *
 * Shows per-scene: layout | hero element | transition | background mode | energy
 * Color-coded strips make monotonous patterns immediately visible.
 *
 * Only rendered when dev mode is active (import.meta.env.DEV).
 */

import type { VideoScript, VideoScene } from "../types/video";

type Props = {
  script: VideoScript;
};

export function RhythmDebugPanel({ script }: Props) {
  if (!import.meta.env.DEV) return null;

  const scenes = script.scenes;
  if (!scenes || scenes.length === 0) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>Rhythm Debug</div>
      <div style={gridStyle}>
        <RhythmRow label="Layout" scenes={scenes} extract={extractLayout} palette={LAYOUT_COLORS} />
        <RhythmRow label="Hero" scenes={scenes} extract={extractHero} palette={HERO_COLORS} />
        <RhythmRow label="BG" scenes={scenes} extract={extractBg} palette={BG_COLORS} />
        <RhythmRow label="Trans" scenes={scenes} extract={extractTransition} palette={TRANS_COLORS} />
        <RhythmRow label="Energy" scenes={scenes} extract={extractEnergy} palette={ENERGY_COLORS} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Row component
// ═══════════════════════════════════════════════════════════════════

type RowProps = {
  label: string;
  scenes: VideoScene[];
  extract: (s: VideoScene) => string;
  palette: Record<string, string>;
};

function RhythmRow({ label, scenes, extract, palette }: RowProps) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={stripStyle}>
        {scenes.map((s, i) => {
          const val = extract(s);
          const color = palette[val] ?? palette._default ?? "#6b7280";
          return (
            <div
              key={i}
              style={{ ...cellStyle, backgroundColor: color }}
              title={`S${i + 1}: ${val}`}
            >
              <span style={cellTextStyle}>{abbrev(val)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Extractors — pull rhythm dimension from scene data
// ═══════════════════════════════════════════════════════════════════

function extractLayout(s: VideoScene): string {
  return s.layout ?? "column";
}

function extractHero(s: VideoScene): string {
  const elements = s.elements ?? [];
  // Skip text/divider to find the real "hero" content element
  const hero = elements.find((e) => e.type !== "text" && e.type !== "divider");
  return hero?.type ?? (elements.length > 0 ? elements[0].type : "empty");
}

function extractBg(s: VideoScene): string {
  if (s.bgEffect) return "effect";
  if (s.imagePrompt) return "image";
  if (s.bgGradient) return "gradient";
  return "solid";
}

function extractTransition(s: VideoScene): string {
  return s.transition ?? "none";
}

function extractEnergy(s: VideoScene): string {
  const elements = s.elements ?? [];
  // Weight by element complexity, not just count
  const HEAVY = new Set(["svg", "svg-3d", "bar-chart", "pie-chart", "line-chart", "sankey", "comparison", "timeline", "map"]);
  const heavyCount = elements.filter((e) => HEAVY.has(e.type)).length;
  const total = elements.length;
  if (heavyCount >= 2 || total >= 4) return "high";
  if (heavyCount >= 1 || total >= 3) return "medium";
  return "low";
}

function abbrev(val: string): string {
  if (val.length <= 4) return val;
  return val.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════
// Color palettes per dimension
// ═══════════════════════════════════════════════════════════════════

const LAYOUT_COLORS: Record<string, string> = {
  column: "#3b82f6", center: "#8b5cf6", row: "#f59e0b", _default: "#6b7280",
};

const HERO_COLORS: Record<string, string> = {
  text: "#6b7280", metric: "#10b981", "bar-chart": "#3b82f6", "pie-chart": "#8b5cf6",
  "line-chart": "#06b6d4", sankey: "#f43f5e", svg: "#ec4899", "svg-3d": "#d946ef",
  map: "#14b8a6", list: "#78716c", callout: "#f59e0b", comparison: "#ef4444",
  timeline: "#0ea5e9", progress: "#22c55e", icon: "#a855f7", annotation: "#e11d48",
  kawaii: "#fb923c", lottie: "#c084fc", divider: "#9ca3af", _default: "#6b7280",
};

const BG_COLORS: Record<string, string> = {
  solid: "#475569", gradient: "#7c3aed", image: "#0891b2", effect: "#e11d48",
  _default: "#475569",
};

const TRANS_COLORS: Record<string, string> = {
  fade: "#6b7280", slide: "#3b82f6", wipe: "#10b981", "clock-wipe": "#f59e0b",
  "radial-wipe": "#ef4444", "diamond-wipe": "#ec4899", iris: "#8b5cf6",
  "zoom-out": "#06b6d4", "zoom-blur": "#0ea5e9", "slide-up": "#14b8a6",
  split: "#f43f5e", rotate: "#d946ef", dissolve: "#a855f7", pixelate: "#22c55e",
  none: "#374151", _default: "#6b7280",
};

const ENERGY_COLORS: Record<string, string> = {
  low: "#22c55e", medium: "#f59e0b", high: "#ef4444", _default: "#6b7280",
};

// ═══════════════════════════════════════════════════════════════════
// Inline styles (no external CSS dependency)
// ═══════════════════════════════════════════════════════════════════

const panelStyle: React.CSSProperties = {
  background: "#1c1917", border: "1px solid #292524", borderRadius: 8,
  padding: "8px 12px", marginTop: 8, fontFamily: "monospace", fontSize: 11,
};

const headerStyle: React.CSSProperties = {
  color: "#a8a29e", fontSize: 10, textTransform: "uppercase",
  letterSpacing: 1.5, marginBottom: 6,
};

const gridStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 3,
};

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: "#78716c", width: 40, textAlign: "right", flexShrink: 0,
};

const stripStyle: React.CSSProperties = {
  display: "flex", gap: 2, flex: 1,
};

const cellStyle: React.CSSProperties = {
  flex: 1, height: 20, borderRadius: 3,
  display: "flex", alignItems: "center", justifyContent: "center",
  minWidth: 0,
};

const cellTextStyle: React.CSSProperties = {
  color: "#fff", fontSize: 9, fontWeight: 600, opacity: 0.9,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};
