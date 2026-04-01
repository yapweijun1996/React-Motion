// --- AI-generated video script ---

export type VideoScript = {
  id: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  scenes: VideoScene[];
  narrative: string;
  theme?: ThemeConfig;
};

// AI designs each scene from scratch using atomic elements
export type VideoScene = {
  id: string;
  startFrame: number;
  durationInFrames: number;
  bgColor?: string;
  layout?: "column" | "center" | "row";
  padding?: string;
  elements: SceneElement[];
  transition?: "fade" | "slide" | "wipe" | "clock-wipe" | "radial-wipe" | "diamond-wipe" | "iris" | "zoom-out" | "zoom-blur" | "slide-up" | "split" | "rotate";
  narration?: string;
  ttsAudioUrl?: string;        // blob: URL to WAV (runtime only, not persisted)
  ttsAudioDurationMs?: number; // audio duration in ms (used for timing adjustment)
};

// Flat element — type + props at the same level for easy AI generation
export type SceneElement = {
  type: "text" | "metric" | "bar-chart" | "pie-chart" | "line-chart" | "sankey" | "list" | "divider" | "callout" | "kawaii" | "lottie" | "icon" | "annotation" | "svg" | "map";
  delay?: number;
  stagger?: "tight" | "normal" | "relaxed" | "dramatic";
  [key: string]: unknown;
};

export type ThemeConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: "corporate" | "modern" | "minimal";
};
