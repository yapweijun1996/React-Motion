/**
 * Centralized SVG icon library.
 * All icons are inline SVG — no external dependencies.
 * Default size = 16px, inherits currentColor.
 */

import type { CSSProperties } from "react";

type IconProps = {
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
};

const defaults = (p: IconProps) => ({
  width: p.size ?? 16,
  height: p.size ?? 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: p.color ?? "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: { display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...p.style },
  className: p.className,
});

// --- Agent / Generation progress icons ---

/** Brain — thinking / Storyboard agent */
export const IconBrain = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
    <path d="M9 21h6" />
    <path d="M10 17v4" />
    <path d="M14 17v4" />
  </svg>
);

/** Search — quality gate / evaluate */
export const IconSearch = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/** Wrench — evaluate retry / fix */
export const IconWrench = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

/** MessageCircle — advisory / narrative review */
export const IconMessage = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/** FileText — Storyboard phase start */
export const IconFileText = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

/** Clapperboard — Visual Director phase */
export const IconClapperboard = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4z" />
    <path d="M4 11V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
    <path d="M8 4l3 7" />
    <path d="M14 4l3 7" />
  </svg>
);

/** CheckCircle — Quality Reviewer pass */
export const IconCheckCircle = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/** Tool/Hammer — tool call */
export const IconTool = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

/** AlertTriangle — tool error / warning */
export const IconAlertTriangle = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/** Play triangle */
export const IconPlay = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <polygon points="5 3 19 12 5 21 5 3" fill={p.color ?? "currentColor"} stroke="none" />
  </svg>
);

/** Pause */
export const IconPause = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <rect x="6" y="4" width="4" height="16" fill={p.color ?? "currentColor"} stroke="none" />
    <rect x="14" y="4" width="4" height="16" fill={p.color ?? "currentColor"} stroke="none" />
  </svg>
);

/** Stop (square) */
export const IconStop = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <rect x="4" y="4" width="16" height="16" rx="2" fill={p.color ?? "currentColor"} stroke="none" />
  </svg>
);

// --- UI action icons ---

/** Eye — show password */
export const IconEye = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** EyeOff — hide password */
export const IconEyeOff = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/** Settings gear */
export const IconSettings = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
  </svg>
);

/** ClipboardList — API log */
export const IconClipboard = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="12" y2="16" />
  </svg>
);

/** RotateCcw — history */
export const IconHistory = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

/** X — close / dismiss */
export const IconX = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** Maximize — enter fullscreen */
export const IconMaximize = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/** Minimize — exit fullscreen */
export const IconMinimize = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/** Check — simple checkmark */
export const IconCheck = (p: IconProps = {}) => (
  <svg {...defaults(p)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
