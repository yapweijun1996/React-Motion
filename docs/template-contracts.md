# Template & Element Contracts

## VideoScript Contract

`VideoScript` is the single source of truth between AI and renderer. Both preview and export consume the same object.

```typescript
type VideoScript = {
  id: string;
  title: string;
  fps: number;                // Always 30
  width: number;              // Default 1920
  height: number;             // Default 1080
  durationInFrames: number;   // Sum of all scene durations
  scenes: VideoScene[];
  narrative: string;          // Overall narrative summary
  theme?: ThemeConfig;
};
```

## Scene Contract

```typescript
type VideoScene = {
  id: string;
  startFrame: number;           // Must equal previous startFrame + previous durationInFrames
  durationInFrames: number;     // Minimum 90 (3 seconds), may be extended by TTS
  bgColor?: string;             // Hex color, default "#ffffff"
  layout?: "column" | "center" | "row";  // Flex layout direction
  padding?: string;             // CSS padding, default "48px 64px"
  transition?: "fade" | "slide" | "wipe" | "clock-wipe";
  narration?: string;           // Spoken text for TTS (1-3 sentences)
  ttsAudioUrl?: string;         // Runtime only — blob URL to WAV
  ttsAudioDurationMs?: number;  // Runtime only — audio duration in ms
  elements: SceneElement[];     // Visual content
};
```

### Scene Rules

1. **No overlap**: `startFrame[n] = startFrame[n-1] + durationInFrames[n-1]`
2. **Minimum duration**: 90 frames (3 seconds) enforced by `adjustTiming.ts`
3. **TTS extension**: If narration audio is longer than scene duration, scene is extended automatically
4. **Runtime fields**: `ttsAudioUrl` and `ttsAudioDurationMs` are populated at runtime by `tts.ts`, never persisted to IndexedDB

## Element Contracts (9 types)

All elements share the flat structure:

```typescript
type SceneElement = {
  type: "text" | "metric" | "bar-chart" | "pie-chart" | "line-chart"
       | "sankey" | "list" | "divider" | "callout";
  [key: string]: unknown;  // Type-specific props
};
```

### text

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| content | string | required | Text to display |
| fontSize | number | 24 | Pixels |
| color | string | "#ffffff" | Hex |
| fontWeight | number | 400 | |
| align | "left" \| "center" \| "right" | "left" | |
| animation | "fade" \| "slide-up" \| "zoom" | "fade" | Entry animation |
| letterSpacing | number | 0 | Pixels |
| textTransform | "uppercase" \| "none" | none | |
| delay | number | index * 8 | Animation delay in frames |

### metric

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| items | MetricItem[] | required | Array of KPI cards |

MetricItem: `{ value: string, label: string, color?: string, subtext?: string }`

Values with numbers get count-up animation (e.g., "11.7M" animates from 0 to 11.7).

### bar-chart

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| bars | BarItem[] | required | `{ label, value, color? }` |
| highlightIndex | number | 0 | Emphasized bar (bold + glow) |
| showPercentage | boolean | false | Show % of total |
| delay | number | auto | Base animation delay |

### pie-chart

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| slices | SliceItem[] | required | `{ label, value, color? }` |
| donut | boolean | false | Donut vs filled pie |
| highlightIndex | number | 0 | Pulled-out slice |
| showPercentage | boolean | false | |

Rendered with D3.js `arc()` + Remotion spring animation.

### line-chart

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| series | Series[] | — | `{ name, data: [{label, value}], color }` |
| data | DataPoint[] | — | Flat format: `[{label, value}]` (single series) |
| color | string | — | For flat format |
| showDots | boolean | false | Data point markers |

Supports two formats: multi-series (array of series) or flat (single data array).

### sankey

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| nodes | Node[] | required | `{ name, color? }` |
| links | Link[] | required | `{ source, target, value }` |

`source` and `target` are zero-based indices into the nodes array.

### list

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| items | string[] | required | List items |
| icon | string | "bullet" | "bullet" \| "check" \| "arrow" \| "star" \| "warning" |
| color | string | theme primary | Icon color |
| textColor | string | "#374151" | Text color |

### divider

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| color | string | theme primary | Line color |
| width | number | 60 | Width percentage |

### callout

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| title | string | required | Bold heading |
| content | string | required | Body text |
| borderColor | string | theme primary | Left border accent |
| fontSize | number | 16 | Body font size |

## Theme Contract

```typescript
type ThemeConfig = {
  primaryColor?: string;     // Main accent color (hex)
  secondaryColor?: string;   // Secondary color (hex)
  fontFamily?: string;       // CSS font-family
  style?: "corporate" | "modern" | "minimal";
};
```

Theme colors cascade to elements that don't specify their own color.

## Prompt Templates

10 preset templates defined in `src/components/PromptTemplates.tsx`:

| Category | Templates |
|----------|-----------|
| Business | Quarterly Report, Sales Ranking, Supplier Analysis |
| Science | Solar System |
| Math | Fibonacci Sequence |
| Geography | World Population |
| Space | Galaxy Explorer |
| Technology | AI Industry Growth |
| Environment | Clean Energy |
| Sports | Olympics Medals |

Each template includes realistic sample data so users can generate a video immediately.
