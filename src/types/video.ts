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

export type VideoSceneType =
  | "title"
  | "chart"
  | "highlight"
  | "comparison"
  | "summary"
  | "transition";

export type VideoScene = {
  id: string;
  type: VideoSceneType;
  startFrame: number;
  durationInFrames: number;
  props: Record<string, unknown>;
  narration?: string;
};

export type ThemeConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: "corporate" | "modern" | "minimal";
};
