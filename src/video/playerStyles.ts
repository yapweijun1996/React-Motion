/**
 * Inline styles for VideoPlayer controls (no CSS file dependency).
 */

import type React from "react";

export const controlsBarStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
  color: "#fff",
  zIndex: 10,
};

export const btnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  fontSize: 18,
  cursor: "pointer",
  padding: "2px 6px",
  lineHeight: 1,
};

export const progressTrackStyle: React.CSSProperties = {
  flex: 1,
  height: 6,
  backgroundColor: "rgba(255,255,255,0.3)",
  borderRadius: 3,
  cursor: "pointer",
  position: "relative",
};

export const progressFillStyle: React.CSSProperties = {
  height: "100%",
  backgroundColor: "#3b82f6",
  borderRadius: 3,
  transition: "width 0.05s linear",
};

export const timeStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "monospace",
  whiteSpace: "nowrap",
  minWidth: 80,
  textAlign: "right",
};
