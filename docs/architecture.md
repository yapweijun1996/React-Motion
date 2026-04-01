# Architecture Overview

React-Motion is an AI-powered data-to-video report generator. Users paste business data and a natural language prompt; the AI agent analyzes the data, plans a story, and produces a structured video script. A custom video engine renders it as an animated presentation, and FFmpeg.wasm encodes the final MP4.

The current visual direction for high-end diagrammatic scenes is **Apple / premium-web inspired pseudo-3D SVG**, not a true 3D runtime. Spatial feel should come from layered SVG, gradients, shadows, depth grouping, parallax, and restrained camera motion that remain compatible with the existing preview/export pipeline.

## System Layers

```
┌─────────────────────────────────────────────┐
│  UI Shell (App.tsx)                         │
│  Prompt input, settings, player, export     │
├─────────────────────────────────────────────┤
│  OODAE Agent Loop (agentLoop.ts)            │
│  Multi-turn Gemini with function calling    │
│  Tools: analyze_data, draft_storyboard,     │
│         get_element_catalog, produce_script  │
│  + Google Search grounding                  │
│  Creative: Duarte arc, "So What?" rule,     │
│  narration↔visual sync, pacing/variety      │
├─────────────────────────────────────────────┤
│  Evaluate (evaluate.ts)                     │
│  1+1 AI self-check: data accuracy +         │
│  narration↔visual sync                      │
├─────────────────────────────────────────────┤
│  TTS (tts.ts)                               │
│  Gemini 2.5 Flash TTS per scene narration   │
│  Scene timing adjusted to match audio       │
│  Auto-retry on transient errors (429/5xx)   │
├─────────────────────────────────────────────┤
│  Color Palette (palette.ts)                 │
│  chroma-js LCH uniform palette generation   │
│  Mandatory before produce_script            │
├─────────────────────────────────────────────┤
│  Custom Video Engine (video/)               │
│  GenericScene + 15 atomic elements          │
│  SceneRenderer + spring() animations        │
│  Dark/light text auto-contrast detection    │
│  Font sizes scaled for 1080p readability    │
├─────────────────────────────────────────────┤
│  Export — Dual Format                       │
│  MP4: html-to-image + FFmpeg.wasm + audio   │
│  PPTX: pptxgenjs (native charts + notes)   │
└─────────────────────────────────────────────┘
```

## Data Flow

```
User prompt + optional BusinessData
        │
        ▼
  OODAE Agent Loop (max 12 iterations)
    ├─ analyze_data    → data insights
    ├─ Google Search   → industry context
    ├─ draft_storyboard → story arc plan
    ├─ get_element_catalog → available elements
    ├─ generate_palette → cohesive color palette (REQUIRED)
    └─ produce_script  → VideoScript JSON (terminates loop)
        │
        ▼
  Evaluate (1+1 self-check: data accuracy + narration↔visual sync)
    └─ Corrected VideoScript if issues found
        │
        ▼
  Gemini TTS (per scene narration → WAV audio)
    └─ Scene timings adjusted to fit audio
        │
        ▼
  VideoPlayer (browser preview)
        │
        ▼
  Export MP4: html-to-image → FFmpeg.wasm → MP4 + AAC audio
  Export PPT: pptxgenjs → PPTX (native charts, narration as speaker notes)
```

## Key Contracts

### VideoScript (single source of truth)

The `VideoScript` type is the contract between the AI agent and the custom video engine. Both preview and export consume the same object.

```typescript
type VideoScript = {
  id: string;
  title: string;
  fps: number;          // 30
  width: number;        // 1920
  height: number;       // 1080
  durationInFrames: number;
  scenes: VideoScene[];
  narrative: string;
  theme?: ThemeConfig;
};
```

### Scene Elements (15 atomic types)

| Element | Purpose |
|---------|---------|
| `text` | Text block with fade/slide-up/zoom animation |
| `metric` | Big KPI numbers (160px) with count-up animation |
| `bar-chart` | Horizontal bar chart with progressive fill |
| `pie-chart` | Pie/donut chart (D3.js) |
| `line-chart` | Line chart for trends (D3.js) |
| `sankey` | Flow/allocation diagram (D3.js) |
| `list` | Bullet/check/arrow/star/warning list |
| `divider` | Visual separator |
| `callout` | Bordered highlight box |
| `kawaii` | Cute SVG mascot characters (react-kawaii) |
| `lottie` | Animated icons (lottie-web) |
| `icon` | 45 curated SVG icons (lucide-react) |
| `annotation` | Hand-drawn sketch marks (roughjs) |
| `svg` | AI-generated inline SVG diagrams; primary path for pseudo-3D/isometric diagram scenes |
| `map` | World map with country highlighting (d3-geo) |

### Pseudo-3D SVG Boundary (RM-190)

**Implemented** via the `svg-3d` element type (19th atomic element). Renderer: `Svg3dElement.tsx`.

Supported effects (v1):

- Inline SVG with layered `<g id="...">` groups — targeted by `layers` array
- Deterministic per-layer depth separation via `depthPreset` (subtle / card-stack / exploded)
- Wrapper perspective tilt via `cameraTilt` (left / right / top)
- Per-layer sinusoidal parallax drift via `parallax` (none / subtle / medium)
- Gentle floating motion via `float: true`
- Shadow depth via CSS filter drop-shadow (`shadow`: soft / medium / strong)
- Three reveal modes: `fade`, `rise`, `draw` (reuses DrawingSvg)
- Shared SVG sanitization module (`svgSanitize.ts`) — root `<svg>` attrs also cleaned
- SVG quality rules in element catalog (10 rules: gradients, badges, min 15 elements, etc.)
- Settings: `svgModel` selector — Pro model for richer SVG generation (default: gemini-3.1-pro-preview)
- Multi-Agent auto-switches Visual Director to svgModel when storyboard mentions svg-3d

Not the current direction:

- True 3D mesh rendering
- Three.js scene graph as a default render path
- Camera/light/material systems in the core composition layer

This boundary preserves the core invariant: preview and export stay on the same DOM/SVG render path.

### Text Contrast

`GenericScene.tsx` auto-detects dark/light backgrounds and passes `dark` prop to all elements. Text colors adapt automatically for readability.

## Deployment Model

React-Motion is packaged as a single IIFE bundle (`dist/react-motion.js` + `dist/react-motion.css`) for embedding in CFML/Lucee applications.

```html
<div id="react-motion-root"></div>
<script src="/assets/react-motion.js"></script>
<script>
  ReactMotion.mount(document.getElementById('react-motion-root'), {
    data: { rows: [...], columns: [...] },
    options: { lang: 'zh', theme: 'corporate' }
  });
</script>
```

## Scene Transitions

`ReportComposition.tsx` uses `SceneRenderer` with CSS transitions for scene-to-scene effects. AI controls transition type per scene via `scene.transition` field.

| Type | Effect |
|------|--------|
| `fade` | Cross-fade (default) |
| `slide` | Slide in |
| `wipe` | Horizontal wipe |
| `clock-wipe` | Radial sweep |

All transitions use easeOutCubic timing (20-frame overlap).

## Prompt Templates

28 preset templates in `templateData.ts` cover: Business (3), Professional (6), Technology (1), Science (4), Study (7), Sports (1), History (7). Each includes realistic sample data for one-click generation.

## PWA Support

- `manifest.json` — installable as standalone app
- `sw.js` — cache-first for static assets, network-only for API/wasm
- iOS meta tags for Add to Home Screen

## Settings

Runtime settings (API key, model selection) are stored in localStorage and override `.env.local` values. Managed by `settingsStore.ts`, exposed via the Settings panel (gear icon).

## Fallback Strategy

If the OODAE agent loop fails (tool errors, unsupported model, API issues), the system automatically falls back to legacy single-shot generation (direct prompt → JSON). This ensures the app always produces output.
