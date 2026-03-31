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
  narration?: string;
};

// Flat element — type + props at the same level for easy AI generation
export type SceneElement = {
  type: "text" | "metric" | "bar-chart" | "list" | "divider" | "callout";
  [key: string]: unknown;
};

export type ThemeConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: "corporate" | "modern" | "minimal";
};
