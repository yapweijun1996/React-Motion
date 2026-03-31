# Architecture Overview

React-Motion is an AI-powered data-to-video report generator. Users paste business data and a natural language prompt; the AI agent analyzes the data, plans a story, and produces a structured video script. Remotion renders it as an animated presentation, and FFmpeg.wasm encodes the final MP4.

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
├─────────────────────────────────────────────┤
│  Evaluate (evaluate.ts)                     │
│  1+1 AI self-check for data accuracy        │
├─────────────────────────────────────────────┤
│  TTS (tts.ts)                               │
│  Gemini 2.5 Flash TTS per scene narration   │
│  Scene timing adjusted to match audio       │
├─────────────────────────────────────────────┤
│  Remotion Render (video/)                   │
│  GenericScene + 9 atomic elements           │
│  TransitionSeries + spring() animations     │
├─────────────────────────────────────────────┤
│  Export (exportVideo.ts)                    │
│  html-to-image frame capture + FFmpeg.wasm  │
│  Audio mux: adelay + amix + AAC             │
└─────────────────────────────────────────────┘
```

## Data Flow

```
User prompt + optional BusinessData
        │
        ▼
  OODAE Agent Loop (max 10 iterations)
    ├─ analyze_data    → data insights
    ├─ Google Search   → industry context
    ├─ draft_storyboard → story arc plan
    ├─ get_element_catalog → available elements
    └─ produce_script  → VideoScript JSON (terminates loop)
        │
        ▼
  Evaluate (1+1 self-check)
    └─ Corrected VideoScript if issues found
        │
        ▼
  Gemini TTS (per scene narration → WAV audio)
    └─ Scene timings adjusted to fit audio
        │
        ▼
  Remotion Player (browser preview)
        │
        ▼
  Export: html-to-image → FFmpeg.wasm → MP4 + AAC audio
```

## Key Contracts

### VideoScript (single source of truth)

The `VideoScript` type is the contract between the AI agent and the Remotion render layer. Both preview and export consume the same object.

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

### Scene Elements (9 atomic types)

| Element | Purpose |
|---------|---------|
| `text` | Text block with fade/slide-up/zoom animation |
| `metric` | Big KPI numbers with count-up animation |
| `bar-chart` | Horizontal bar chart with progressive fill |
| `pie-chart` | Pie/donut chart (D3.js) |
| `line-chart` | Line chart for trends (D3.js) |
| `sankey` | Flow/allocation diagram (D3.js) |
| `list` | Bullet/check/arrow/star/warning list |
| `divider` | Visual separator |
| `callout` | Bordered highlight box |

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

`ReportComposition.tsx` uses `@remotion/transitions` with `TransitionSeries` for scene-to-scene effects. AI controls transition type per scene via `scene.transition` field.

| Type | Effect |
|------|--------|
| `fade` | Cross-fade (default) |
| `slide` | Slide in |
| `wipe` | Horizontal wipe |
| `clock-wipe` | Radial sweep |

All transitions use spring timing (damping=200, 20 frames).

## Prompt Templates

10 preset templates in `PromptTemplates.tsx` cover: Business (3), Science, Math, Geography, Space, Technology, Environment, Sports. Each includes realistic sample data for one-click generation.

## PWA Support

- `manifest.json` — installable as standalone app
- `sw.js` — cache-first for static assets, network-only for API/wasm
- iOS meta tags for Add to Home Screen

## Settings

Runtime settings (API key, model selection) are stored in localStorage and override `.env.local` values. Managed by `settingsStore.ts`, exposed via the Settings panel (gear icon).

## Fallback Strategy

If the OODAE agent loop fails (tool errors, unsupported model, API issues), the system automatically falls back to legacy single-shot generation (direct prompt → JSON). This ensures the app always produces output.
