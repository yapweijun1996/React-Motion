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

## Element Contracts (15 types)

All elements share the flat structure:

```typescript
type SceneElement = {
  type: "text" | "metric" | "bar-chart" | "pie-chart" | "line-chart"
       | "sankey" | "list" | "divider" | "callout" | "kawaii" | "lottie"
       | "icon" | "annotation" | "svg" | "map";
  delay?: number;     // Animation delay override
  stagger?: "tight" | "normal" | "relaxed" | "dramatic";
  [key: string]: unknown;  // Type-specific props
};
```

All elements receive a `dark` prop from `GenericScene` for text contrast auto-adaptation (dark bg → light text, light bg → dark text).

### text

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| content | string | required | Text to display |
| fontSize | number | 80 | Pixels (96-128 for titles, 56-72 for body, min 48) |
| color | string | auto | Auto-adapts: dark bg → `#f1f5f9`, light bg → `#1e293b` |
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

Rendered with D3.js `arc()` + custom spring() animation.

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
| textColor | string | auto | Auto-adapts to background |

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
| fontSize | number | 60 | Body font size |

### kawaii

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| character | string | "ghost" | 16 types: astronaut, cat, planet, browser, mug, etc. |
| mood | string | "blissful" | happy, excited, shocked, sad, blissful, lovestruck, ko |
| size | number | 180 | SVG size in pixels |
| color | string | theme primary | Character color |
| caption | string | — | Optional caption below character |

### lottie

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| preset | string | "checkmark" | checkmark, arrow-up, arrow-down, pulse, star, thumbs-up |
| size | number | 120 | Animation size in pixels |
| loop | boolean | true | Loop animation |

### icon

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| name | string | "star" | 45 icons: trending-up, dollar-sign, graduation-cap, atom, etc. |
| size | number | 64 | Icon size in pixels |
| color | string | theme primary | Icon stroke color |
| label | string | — | Optional label below icon |
| strokeWidth | number | 2 | Icon stroke width |

### annotation

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| shape | string | "circle" | circle, underline, arrow, box, cross, highlight, bracket |
| color | string | "#ef4444" | Stroke color |
| roughness | number | 1.5 | Hand-drawn roughness (0.5-3) |
| size | number | 120 | Shape size in pixels |
| label | string | — | Optional label |

### svg

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| markup | string | required | Full SVG string with viewBox. AI-generated. |

#### SVG Direction for Premium-Web Pseudo-3D

Current `svg` scenes should be authored with an export-safe pseudo-3D mindset:

- Prefer isometric or layered diagrams over flat icon dumps
- Separate background, body, shadow, and highlight into distinct `<g>` groups when possible
- Use gradients and overlapping planes to imply depth
- Keep text embedded as SVG text only when it remains readable at export size
- Prefer wrapper-level motion and scene-level camera/parallax over deeply nested CSS 3D tricks

Not recommended for the current render path:

- True 3D scene descriptions
- `foreignObject` (removed from sanitizer whitelist — embedded XHTML is a security risk)
- Effects that rely on browser-only 3D composition semantics

### map

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| countries | Array | required | `[{ name, value?, color? }]` — 50+ countries supported |
| showLabels | boolean | false | Show name+value labels on highlighted countries |
| baseColor | string | "#e5e7eb" | Default country fill |

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

28 preset templates defined in `src/components/templateData.ts` (data) and rendered by `src/components/PromptTemplates.tsx` (UI).

| Category | Count | Templates |
|----------|-------|-----------|
| Business | 3 | Quarterly Report, Sales Ranking, Supplier Analysis |
| Professional | 6 | Board Update, Budget vs Actual, Product Launch, Support KPI, Supply Chain, Hiring Funnel |
| Technology | 1 | AI Industry Growth |
| Science | 4 | Clean Energy, Solar System, World Population, Galaxy Explorer |
| Study | 7 | Fibonacci, Exam Scores, Study Progress, Lab Results, Language Progress, Research Summary |
| Sports | 1 | Olympics Medals |
| History | 7 | Singapore Story, Malaysia Story, USA Story, China Story, Japan Story, India Story, UK Story |

Each template includes realistic sample data (milestones, GDP, population, key events) so users can generate a video immediately. The Featured view shows one template per category; users can filter by category chip or expand to see all.
