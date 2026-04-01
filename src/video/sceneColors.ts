/**
 * Scene color tokens — unified dark/light palette.
 * Pure function, no React dependency. Parallels sceneLayout.ts.
 */

export type SceneColors = {
  /** Primary body text */
  text: string;
  /** Secondary / subdued text */
  muted: string;
  /** Chart axis labels, captions, small labels */
  label: string;
  /** Chart grid lines, dividers */
  gridLine: string;
};

const DARK: SceneColors = {
  text: "#e2e8f0",
  muted: "#94a3b8",
  label: "#cbd5e1",
  gridLine: "#374151",
};

const LIGHT: SceneColors = {
  text: "#1e293b",
  muted: "#6b7280",
  label: "#6b7280",
  gridLine: "#e5e7eb",
};

export function getSceneColors(dark: boolean): SceneColors {
  return dark ? DARK : LIGHT;
}
