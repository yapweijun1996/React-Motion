# Project Structure

## Root

```
React-Motion/
├── src/                    # Application source code
├── public/                 # Static assets (favicon, PWA manifest, service worker)
├── docs/                   # Documentation
├── dist/                   # Build output (IIFE bundle)
├── index.html              # Dev entry point + PWA meta tags
├── package.json            # Dependencies
├── vite.config.ts          # Vite build config (IIFE library mode)
├── tsconfig.json           # TypeScript config
├── CLAUDE.md               # Claude Code instructions
├── AGENTS.md               # Architecture rules and ownership model
└── task.md                 # Task board (Epic RM)
```

## Source (`src/`)

### Entry Points

| File | Purpose |
|------|---------|
| `index.tsx` | Widget bootstrap. Exposes `window.ReactMotion.mount(el, config)`. Dev mode auto-mounts to `#root`. |
| `App.tsx` | Main shell: header, settings, prompt input, player, export controls. |
| `styles.css` | Global CSS with custom properties, responsive media queries. No CSS framework. |

### Components (`src/components/`)

| File | Purpose |
|------|---------|
| `SettingsPanel.tsx` | Modal panel for Gemini API key and model selection. Reads/writes localStorage. |
| `PromptTemplates.tsx` | Preset prompt templates (business, science, sports, etc.). |

### Services (`src/services/`)

**AI Pipeline**

| File | Purpose |
|------|---------|
| `generateScript.ts` | Orchestrator: agent loop → evaluate → TTS. Entry point for video generation. |
| `agentLoop.ts` | OODAE agent loop engine. Max 10 iterations with function calling. |
| `agentTools.ts` | Tool registry: analyze_data, draft_storyboard, get_element_catalog, produce_script. |
| `gemini.ts` | Gemini API client. Supports text, function calling, Google Search grounding. |
| `prompt.ts` | System prompts: agent prompt (OODAE) + legacy prompt (fallback). |
| `evaluate.ts` | 1+1 AI self-check: verifies data accuracy, completeness, visual variety. |
| `parseScript.ts` | VideoScript JSON validator. Ensures AI output conforms to TypeScript types. |

**TTS**

| File | Purpose |
|------|---------|
| `tts.ts` | Gemini 2.5 Flash TTS: narration text → PCM → WAV blob URL. |
| `adjustTiming.ts` | Adjusts scene durations to match TTS audio length. |

**Export**

| File | Purpose |
|------|---------|
| `exportVideo.ts` | Frame capture (html-to-image) + FFmpeg.wasm encoding → MP4. |
| `exportAudio.ts` | Audio muxing: per-scene WAV → adelay → amix → AAC in MP4. |

**Other**

| File | Purpose |
|------|---------|
| `settingsStore.ts` | localStorage read/write for API key + model. Falls back to env vars. |
| `cache.ts` | IndexedDB cache for last generated script + prompt. |

### Types (`src/types/`)

| File | Purpose |
|------|---------|
| `data.ts` | Input types: `MountConfig`, `BusinessData`, `ColumnDef`, `Aggregation`, `ChartConfig`. |
| `video.ts` | Output types: `VideoScript`, `VideoScene`, `SceneElement`, `ThemeConfig`. |
| `index.ts` | Re-exports all types. |

### Video (`src/video/`)

**Compositions**

| File | Purpose |
|------|---------|
| `ReportComposition.tsx` | Root Remotion composition. Renders scenes with transitions + progress bar. |
| `GenericScene.tsx` | Scene dispatcher: renders elements based on `el.type`. |

**Atomic Elements (`src/video/elements/`)**

| File | Element Type | Animation |
|------|-------------|-----------|
| `TextElement.tsx` | `text` | spring fade, slide-up, zoom |
| `MetricElement.tsx` | `metric` | spring count-up + slide-in |
| `BarChartElement.tsx` | `bar-chart` | spring bar fill |
| `PieChartElement.tsx` | `pie-chart` | D3 arc + spring rotation |
| `LineChartElement.tsx` | `line-chart` | D3 line + spring draw |
| `SankeyElement.tsx` | `sankey` | D3 sankey + spring flow |
| `ListElement.tsx` | `list` | spring stagger entrance |
| `DividerElement.tsx` | `divider` | spring width expansion |
| `CalloutElement.tsx` | `callout` | spring fade + slide |

## Public (`public/`)

| File | Purpose |
|------|---------|
| `favicon.svg` | App icon (blue M on dark background) |
| `manifest.json` | PWA manifest: standalone display, theme color, icons |
| `sw.js` | Service worker: cache-first for static assets, network-only for API + wasm |

## Build Output (`dist/`)

| File | Purpose |
|------|---------|
| `react-motion.iife.js` | Single IIFE bundle — drop into any HTML page |
| `react-motion.css` | Bundled CSS |

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI framework |
| `remotion` / `@remotion/player` | Video composition + browser preview |
| `@remotion/transitions` | Scene transition effects (slide, wipe, clock-wipe) |
| `@ffmpeg/ffmpeg` + `@ffmpeg/core` | Browser-side MP4 encoding |
| `html-to-image` | DOM → PNG frame capture for export |
| `d3-shape` / `d3-scale` / `d3-sankey` | Chart path calculations (math only) |
| `vite` | Build tool (IIFE library mode) |

## Configuration

### Environment Variables (`.env.local`)

```
DEVELOPMENT_GEMINI_API_KEY=AIza...
DEVELOPMENT_GEMINI_MODEL=gemini-3-flash-preview
```

### Runtime Settings (localStorage)

Settings panel allows changing API key and model at runtime without restarting. Stored in localStorage under `react-motion-settings`. Priority: UI settings > env vars > defaults.

### Vite Headers

COOP/COEP headers are configured in `vite.config.ts` for SharedArrayBuffer support (required by FFmpeg.wasm multi-thread):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```
