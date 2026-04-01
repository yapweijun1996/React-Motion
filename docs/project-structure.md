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
| `PromptTemplates.tsx` | Template selector UI: category chips, card grid, featured/expand toggle. |
| `templateData.ts` | 28 preset prompt templates across 7 categories (Business, Professional, Technology, Science, Study, Sports, History). |

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
| `exportPptx.ts` | PPT export via pptxgenjs: VideoScript → PPTX with native charts + speaker notes. |

**Color & Validation**

| File | Purpose |
|------|---------|
| `palette.ts` | chroma-js smart palette: mood keywords, LCH chart colors, contrast-safe text colors. |
| `validate.ts` | Unified runtime schema: element types, ranges, structural checks. |
| `errors.ts` | ClassifiedError system: ErrorCode enum, user-friendly messages, logError/logWarn. |
| `metrics.ts` | IndexedDB event log: generation/export/tts/error tracking with auto-prune. |
| `elementCatalog.ts` | Element catalog: 15 types with props, tips, and usage guidance for AI. |
| `chartHelpers.ts` | Shared chart utilities: color palette, value formatting. |

**Other**

| File | Purpose |
|------|---------|
| `settingsStore.ts` | localStorage read/write for API key + model. Falls back to env vars. |
| `cache.ts` | IndexedDB cache for last generated script + prompt. |
| `historyStore.ts` | IndexedDB history (50-entry FIFO) with TTS metadata for restore. |
| `exportStore.ts` | IndexedDB export records (filename, size, date). |
| `db.ts` | Shared IndexedDB connection manager (v2 schema). |

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
| `ReportComposition.tsx` | Root composition. SceneRenderer + AudioTrack + progress bar. |
| `GenericScene.tsx` | Scene dispatcher: renders elements based on `el.type`. |

**Atomic Elements (`src/video/elements/`)**

| File | Element Type | Animation |
|------|-------------|-----------|
| `TextElement.tsx` | `text` | spring fade, slide-up, zoom (default 80px) |
| `MetricElement.tsx` | `metric` | spring count-up + slide-in (160px values) |
| `BarChartElement.tsx` | `bar-chart` | spring bar fill (42px labels) |
| `PieChartElement.tsx` | `pie-chart` | D3 arc + spring rotation |
| `LineChartElement.tsx` | `line-chart` | D3 line + spring draw |
| `SankeyElement.tsx` | `sankey` | D3 sankey + spring flow |
| `ListElement.tsx` | `list` | spring stagger entrance (56px items) |
| `DividerElement.tsx` | `divider` | spring width expansion |
| `CalloutElement.tsx` | `callout` | spring fade + slide (60px content) |
| `KawaiiElement.tsx` | `kawaii` | react-kawaii SVG mascots + bounce-in |
| `LottieElement.tsx` | `lottie` | lottie-web animated icons (frame-synced) |
| `IconElement.tsx` | `icon` | lucide-react SVG icons + bounce |
| `AnnotationElement.tsx` | `annotation` | roughjs hand-drawn + stroke-draw |
| `SvgElement.tsx` | `svg` | AI-generated inline SVG diagrams |
| `MapElement.tsx` | `map` | d3-geo world map + country highlight |

All elements accept a `dark` prop from `GenericScene` for text contrast auto-adaptation.

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
| `src/video/*` (custom engine) | Video composition, player, scene transitions, animation |
| `@ffmpeg/ffmpeg` + `@ffmpeg/core` | Browser-side MP4 encoding |
| `html-to-image` | DOM → PNG frame capture for export |
| `d3-shape` / `d3-scale` / `d3-sankey` | Chart path calculations (math only) |
| `chroma-js` | LCH uniform color palette generation |
| `pptxgenjs` | Browser-side PowerPoint generation |
| `react-kawaii` | Cute SVG mascot characters |
| `lottie-web` | Lottie animation playback (frame-synced via useCurrentFrame) |
| `lucide-react` | Curated SVG icon library |
| `roughjs` | Hand-drawn sketch annotations |
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
