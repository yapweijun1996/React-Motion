/**
 * React Error Boundary — 3-tier fallback for video rendering.
 *
 * Levels:
 *  - "element"  → inline placeholder (single element crash)
 *  - "scene"    → error card (entire scene crash)
 *  - "player"   → retry button (player-level crash)
 */

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { logError } from "../services/errors";
import type { ErrorCode } from "../services/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FallbackLevel = "element" | "scene" | "player";

type Props = {
  level: FallbackLevel;
  /** Optional label shown in fallback UI (e.g. element type) */
  label?: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

// ---------------------------------------------------------------------------
// Error-code mapping
// ---------------------------------------------------------------------------

const LEVEL_CODE: Record<FallbackLevel, ErrorCode> = {
  element: "RENDER_ELEMENT_CRASH",
  scene: "RENDER_SCENE_CRASH",
  player: "RENDER_PLAYER_CRASH",
};

// ---------------------------------------------------------------------------
// Fallback styles (inline to avoid external CSS dependency)
// ---------------------------------------------------------------------------

const elementFallbackStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  fontSize: 12,
  color: "#b91c1c",
  background: "#fef2f2",
  borderRadius: 6,
  border: "1px dashed #fca5a5",
  minHeight: 40,
  opacity: 0.85,
};

const sceneFallbackStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.75)",
  color: "#fca5a5",
  fontSize: 14,
  gap: 8,
};

const playerFallbackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 32,
  color: "#b91c1c",
  fontSize: 14,
};

const retryBtnStyle: React.CSSProperties = {
  padding: "6px 16px",
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid #fca5a5",
  background: "#fff",
  color: "#b91c1c",
  cursor: "pointer",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { level, label } = this.props;
    logError("ErrorBoundary", LEVEL_CODE[level], error, {
      level,
      label,
      componentStack: info.componentStack ?? "",
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { level, label } = this.props;

    if (level === "element") {
      return (
        <div style={elementFallbackStyle} title={this.state.errorMessage}>
          {label ? `[${label}] ` : ""}render error
        </div>
      );
    }

    if (level === "scene") {
      return (
        <div style={sceneFallbackStyle}>
          <span>Scene render failed</span>
          {label && <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>}
        </div>
      );
    }

    // player level
    return (
      <div style={playerFallbackStyle}>
        <span>Video player encountered an error</span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{this.state.errorMessage}</span>
        <button style={retryBtnStyle} onClick={this.handleRetry}>
          Retry
        </button>
      </div>
    );
  }
}
