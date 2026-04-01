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
  bgMusicUrl?: string;         // blob: URL to generated BGM (runtime only)
  bgMusicDurationMs?: number;  // BGM audio duration in ms
};

// AI designs each scene from scratch using atomic elements
export type VideoScene = {
  id: string;
  startFrame: number;
  durationInFrames: number;
  bgColor?: string;
  bgGradient?: string;  // CSS gradient string, e.g. "linear-gradient(135deg, #0f172a, #1e3a5f)"
  bgEffect?: "bokeh" | "flow" | "rising"; // Canvas background effect mode
  layout?: "column" | "center" | "row";
  padding?: string;
  elements: SceneElement[];
  transition?: "fade" | "slide" | "wipe" | "clock-wipe" | "radial-wipe" | "diamond-wipe" | "iris" | "zoom-out" | "zoom-blur" | "slide-up" | "split" | "rotate" | "dissolve" | "pixelate";
  narration?: string;
  ttsAudioUrl?: string;        // blob: URL to WAV (runtime only, not persisted)
  ttsAudioDurationMs?: number; // audio duration in ms (used for timing adjustment)
  imagePrompt?: string;        // AI-generated prompt for scene background image
  imageOpacity?: number;       // background image opacity 0.0-1.0 (default 0.35)
  imageUrl?: string;           // blob: URL to generated image (runtime only)
};

// Flat element — type + props at the same level for easy AI generation
export type SceneElement = {
  type: "text" | "metric" | "bar-chart" | "pie-chart" | "line-chart" | "sankey" | "list" | "divider" | "callout" | "kawaii" | "lottie" | "icon" | "annotation" | "svg" | "svg-3d" | "map" | "progress" | "timeline" | "comparison";
  delay?: number;
  stagger?: "tight" | "normal" | "relaxed" | "dramatic";
  [key: string]: unknown;
};

export type ThemeConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: "corporate" | "modern" | "minimal";
  chartColors?: string[];
};

// --- Multi-Agent intermediate types ---

/** Storyboard Agent → Visual Director Agent 通信合约 */
export type StoryboardPlan = {
  storyboard: string;
  sceneCount: number;
  colorMood: string;
  pacing: string;
  climaxScene?: number;
  scenePlan: StoryboardScenePlan[];
  userPrompt: string;
  dataContext: string;
  /** Apple-style planning fields (v2) */
  audienceMode?: "business" | "product" | "education" | "mixed";
  storyMode?: "adapted-apple";
  coreTakeaway?: string;
  hookStatement?: string;
};

/** Apple 6-beat narrative system + legacy role compat */
export type AppleBeat = "hook" | "why-it-matters" | "how-it-works" | "proof" | "climax" | "resolution";

/** Legacy scene roles kept for backward compatibility */
export type LegacySceneRole = "context" | "tension" | "evidence" | "breathing" | "close";

export type StoryboardScenePlan = {
  sceneNumber: number;
  role: AppleBeat | LegacySceneRole;
  /** Explicit Apple 6-beat assignment (source of truth when present) */
  beat?: AppleBeat;
  insight: string;
  soWhat: string;
  elementHints: string[];
  duration: "short" | "medium" | "long";
};

/** Quality Reviewer Agent 输出 */
export type ReviewResult = {
  pass: boolean;
  issues: ReviewIssue[];
};

export type ReviewIssue = {
  target: "storyboard" | "visual";
  category: string;
  description: string;
  sceneIds?: string[];
};
