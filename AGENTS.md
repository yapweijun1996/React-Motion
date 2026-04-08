# AGENTS.md

## Project

This repository builds **React-Motion**, an AI-powered story and presentation maker designed to turn user intent, data, and context into polished end-user presentations and videos.

The product goal:

- end users provide data, context, or topic material plus a natural language prompt
- an AI agent uses OODAE loop thinking to analyze the input, decide the narrative, and structure the presentation
- the runtime harness converts that narrative into a deterministic `VideoScript` contract
- a custom video engine renders the script into a polished story, presentation, or explainer video with animated visuals, transitions, and narration
- end users preview in-browser and export the result as a presentation-grade MP4
- the entire tool is packaged as a JS bundle and can run as an embedded runtime inside host applications

This is **not** a general-purpose video editor or NLE.
It is an **AI runtime harness for story and presentation generation** — the agent decides the narrative, the system renders it.

---

## Current phase

**Phase 3 — Custom video engine, zero Remotion dependency.**

Core pipeline is fully implemented: prompt → AI agent (OODAE loop with function calling) → `VideoScript` → custom engine render → TTS audio → FFmpeg.wasm MP4 export. UI includes settings panel, prompt templates, mobile responsive layout, and PWA support. All Remotion packages have been removed and replaced with a self-built video engine (~900 lines, 167 tests).

Active work: FFmpeg.wasm multi-thread encoding for faster exports.

---

## Core product flow

```
Host app or standalone runtime
  ↓ passes data, context, topic material, and user intent
React-Motion widget/runtime harness
  ↓ OODAE Agent Loop (function calling, max 10 iterations)
Gemini API (with Google Search grounding)
  ↓ returns VideoScript JSON (story structure + scenes + atomic elements + narration text)
Custom video engine (SceneRenderer + GenericScene + atomic element renderers)
  ↓ renders presentation visuals, animated charts, text, transitions, and story beats
Gemini TTS API (narration text → PCM audio per scene)
  ↓ syncs audio with scene timing (TTS-first duration)
Browser preview (VideoPlayer with AudioTrack)
  ↓ user approves
Export MP4 (html-to-image frame capture + FFmpeg.wasm encoding + audio mux)
  ↓
End user watches, presents, studies, or shares the generated story/presentation
```

---

## Runtime stack (implemented)

- `src/index.tsx` — widget bootstrap, exposes `window.ReactMotion.mount(el, config)`.
- `src/App.tsx` — main shell: prompt input, settings, preview surface, export controls.
- `src/services/gemini.ts` — Gemini API client with function calling and Google Search grounding.
- `src/services/generateScript.ts` — 6-stage pipeline: Agent Loop → Evaluate → SVG Gen → TTS → BGM → Image Gen.
- `src/services/svgGen.ts` — SVG post-generation: focused Gemini calls for high-quality SVG diagrams (RM-197).
- `src/services/costTracker.ts` — real-time cost tracking from Gemini API usageMetadata (RM-198).
- `src/services/prompt.ts` — system prompt and user message builder.
- `src/services/parseScript.ts` — VideoScript JSON parser with type validation.
- `src/services/evaluate.ts` — AI quality reviewer (narration↔visual sync, "So What?" test).
- `src/services/tts.ts` — Gemini TTS integration (narration → PCM → WAV per scene).
- `src/services/bgMusic.ts` — Background music generation (Lyria 3 Clip API).
- `src/services/imageGen.ts` — AI image generation (Gemini 2.5 Flash Image).
- `src/services/exportVideo.ts` — frame-by-frame capture + FFmpeg.wasm / WebCodecs encoding.
- `src/services/exportAudio.ts` — FFmpeg.wasm audio muxing (adelay + amix + AAC).
- `src/services/exportPptx.ts` — PPT export via pptxgenjs (VideoScript → PPTX with native charts, narration as speaker notes).
- `src/services/cache.ts` — IndexedDB caching for generated scripts.
- `src/services/palette.ts` — chroma-js smart color palette generator (LCH uniform, mood keywords, chart colors).
- `src/services/historyStore.ts` — IndexedDB history (50-entry FIFO) with TTS metadata for restore + regenerate.
- `src/video/animation.ts` — custom `spring()`, `interpolate()`, `noise2D/3D()` (drop-in replacements).
- `src/video/VideoContext.tsx` — `useCurrentFrame()`, `useVideoConfig()`, `usePlaying()` via React Context. VideoProvider (top-level) + FrameProvider (scene-local frame remap).
- `src/video/SceneRenderer.tsx` — scene sequencer with CSS transitions (fade/slide/wipe/clock-wipe). Overlap compression. Pure functions for testability.
- `src/video/VideoPlayer.tsx` — rAF-driven player with play/pause/seek/progress bar/keyboard/responsive scaling.
- `src/video/VideoSurface.tsx` — headless player for export frame capture (seekTo only, no UI).
- `src/video/PlayerHandle.ts` — imperative ref type (pause/play/seekTo/getCurrentFrame/isPlaying).
- `src/video/AudioTrack.tsx` — HTML5 `<audio>` synced to frame engine via `usePlaying()` + drift correction.
- `src/video/AbsoluteFill.tsx` — `position:absolute; inset:0` flex container.
- `src/video/ReportComposition.tsx` — top-level composition: SceneRenderer + GenericScene + AudioTrack + progress bar.
- `src/video/GenericScene.tsx` — elements-based scene renderer with dark/light background auto-detection for text contrast.
- `src/video/elements/*` — 15 atomic element renderers (text, metric, bar-chart, pie-chart, line-chart, sankey, list, divider, callout, kawaii, lottie, icon, annotation, svg, map). All use custom `spring()` physics-based animation. D3 charts use d3-shape/d3-scale/d3-sankey for SVG path calculation. Font sizes scaled for 1080p readability (titles 96-128px, body 56-72px).
- `src/types/*` — TypeScript type definitions (MountConfig, BusinessData, VideoScript, VideoScene, SceneElement).
- `public/ffmpeg-mt/` — FFmpeg.wasm multi-thread UMD core files (served as-is, bypasses Vite ESM transformation).

---

## Canonical paths to treat as source of truth

- `src/` — all source code lives here
- `src/services/` — AI pipeline, export, TTS, caching
- `src/video/` — custom video engine, compositions, and element renderers
- `src/types/` — TypeScript type definitions
- `public/` — static assets served as-is (FFmpeg.wasm multi-thread core files)
- Root-level files (`package.json`, `vite.config.ts`, `index.html`, `task.md`, `AGENTS.md`)
- `sample-project/` is reference-only and must never become a live implementation dependency

---

## Product boundary model

### Widget shell (implemented)
- `src/index.tsx`: exposes `window.ReactMotion.mount(el, config)`
- `src/App.tsx`: prompt input, settings panel, prompt templates, preview, export controls
- IIFE bundle for CFML/Lucee embed; mobile responsive with PWA support

### State (implemented — React hooks, no external store)
- co-located in `App.tsx` via `useState`/`useCallback`/`useRef`
- IndexedDB caching via `services/cache.ts` for persistence

### AI pipeline (implemented — OODAE Agent Loop, 6-stage)
- `generateScript.ts` → agent loop → evaluate → svgGen → tts → bgm → imageGen
- Multi-agent mode: Storyboard Agent (Flash Lite) → Visual Director (Pro) → Quality Reviewer (Flash Lite)
- SVG post-generation: `svgGen.ts` generates high-quality SVG in focused calls (50+ visual elements)
- Cost tracking: `costTracker.ts` records real API token usage → UI badge + modal + history
- agent tools: analyze_data, draft_storyboard, plan_visual_rhythm, direct_visuals, get_element_catalog, generate_palette, produce_script, refine_scene

### Preview pipeline (implemented)
- `VideoPlayer` consumes `VideoScript` directly via `VideoProvider` context
- preview = export (same composition, same elements)

### Export pipeline (implemented — browser-only, dual-format)
- **MP4**: `src/services/exportVideo.ts` (html-to-image frame capture + FFmpeg.wasm encoding) + `src/services/exportAudio.ts` (TTS audio muxing)
- **PPTX**: `src/services/exportPptx.ts` (pptxgenjs — native bar/pie/line charts, narration as speaker notes, one slide per scene)
- multi-thread: `@ffmpeg/core-mt` UMD from `public/ffmpeg-mt/` with runtime detection + auto-fallback
- `-threads N` (up to 4) when multi-thread, `-threads 1` for single-thread

### TTS pipeline (implemented)
- `src/services/tts.ts`: Gemini TTS → PCM → WAV per scene
- TTS-first timing: audio duration drives scene durationInFrames

### Composition layer (implemented — custom video engine + atomic elements)
- `src/video/ReportComposition.tsx`: SceneRenderer (CSS transitions) + AudioTrack + progress bar
- `src/video/GenericScene.tsx`: elements-based scene renderer + dark/light background auto-detection
- 15 atomic elements: text, metric, bar-chart, pie-chart, line-chart, sankey, list, divider, callout, kawaii, lottie, icon, annotation, svg, map
- D3.js modular (d3-shape/d3-scale/d3-sankey/d3-geo) for SVG math; custom `spring()` for animation
- Font sizes scaled for 1080p readability (titles 96-128px, body 56-72px, minimum 48px)
- Text color auto-adapts to scene background (dark bg → light text, light bg → dark text)

---

## Canonical data contract rules

The video script is the source of truth between AI and the render engine.

The implemented data contracts (see `src/types/` for authoritative definitions):

```ts
// Input from CFML host app
type MountConfig = {
  el: HTMLElement;
  data: BusinessData;
  options?: WidgetOptions;
};

type BusinessData = {
  title?: string;
  rows: Record<string, unknown>[];
  columns: ColumnDef[];
  aggregations?: Aggregation[];
  chartConfig?: ChartConfig;
};

type ColumnDef = {
  key: string;
  label: string;
  type: "string" | "number" | "date";
};

type Aggregation = {
  column: string;
  operation: "count" | "sum" | "avg" | "min" | "max";
  groupBy?: string;
  result: Record<string, number>;
};

type ChartConfig = {
  type: "bar" | "line" | "pie" | "table";
  xAxis?: string;
  yAxis?: string;
  data: Record<string, unknown>[];
};

// AI-generated video script
type VideoScript = {
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

type VideoScene = {
  id: string;
  startFrame: number;
  durationInFrames: number;
  bgColor?: string;
  layout?: "column" | "center" | "row";
  padding?: string;
  elements: SceneElement[];
  transition?: "fade" | "slide" | "wipe" | "clock-wipe";
  narration?: string;
  ttsAudioUrl?: string;
  ttsAudioDurationMs?: number;
};

// Flat element — type + props at same level for easy AI generation
type SceneElement = {
  type: "text" | "metric" | "bar-chart" | "pie-chart" | "line-chart" | "sankey" | "list" | "divider" | "callout";
  [key: string]: unknown;
};

type ThemeConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: "corporate" | "modern" | "minimal";
};
```

Rules:

1. The `VideoScript` generated by AI is the canonical source of truth for rendering.
2. Preview and export must consume the same `VideoScript`.
3. `SceneElement` uses flat structure (type + props at same level) for easy AI generation.
4. Do not create separate incompatible data models for preview and export.
5. `BusinessData` from the host app is read-only — never mutated by the widget.
6. TTS audio URLs and durations are attached to scenes after TTS generation.

---

## AI integration rules

Gemini API for data analysis, script generation, and TTS narration.

### What AI does
- OODAE Agent Loop: analyzes data → drafts storyboard → queries element catalog → produces script
- function calling tools: `analyze_data`, `draft_storyboard`, `get_element_catalog`, `produce_script`
- Google Search grounding for real-time data context
- generates narration text per scene (consumed by Gemini TTS)
- 1+1 Evaluate: synchronous self-check after generation (data accuracy, scene integrity, visual variety)

### What AI does NOT do
- AI does not render video — the custom video engine does
- AI does not directly access the database — it receives pre-aggregated data
- AI does not control the UI — it outputs a data contract that the UI consumes

### AI output validation
- AI output must parse into a valid `VideoScript` via `parseScript.ts`
- malformed output → error sent back to AI → retry (max 3 attempts with conversation history)
- silent fallback to hardcoded content is never allowed (anti-hardcode rule)

---

## Custom video engine

All Remotion dependencies have been removed (RM-EPIC-04). The project uses a self-built video engine:

| Module | File | Purpose |
|--------|------|---------|
| `animation.ts` | `src/video/animation.ts` | `spring()`, `interpolate()`, `noise2D/3D()` — physics-based animation primitives |
| `VideoContext` | `src/video/VideoContext.tsx` | React Context for `useCurrentFrame()`, `useVideoConfig()`, `usePlaying()` |
| `SceneRenderer` | `src/video/SceneRenderer.tsx` | Scene sequencer with CSS transitions (fade/slide/wipe/clock-wipe) |
| `VideoPlayer` | `src/video/VideoPlayer.tsx` | rAF-driven preview player with controls |
| `VideoSurface` | `src/video/VideoSurface.tsx` | Headless export player (seekTo-only, no UI) |
| `AudioTrack` | `src/video/AudioTrack.tsx` | HTML5 `<audio>` synced to frame engine |
| `AbsoluteFill` | `src/video/AbsoluteFill.tsx` | `position:absolute; inset:0` flex container |

Use the video engine modules for:

- scene composition (chart animations, text overlays, transitions)
- frame-based timing (`useCurrentFrame()` + `spring()`)
- browser video preview (`VideoPlayer`)
- export frame capture (`VideoSurface` + html-to-image)

Do not use the video engine for:

- UI interactions or editor chrome (use standard React for that)
- data analysis (that is AI's job)
- prompt handling or business logic

---

## CFML/Lucee integration rules

React-Motion is embedded as a widget in a CFML/Lucee host application.

### Build output
- Vite builds a single JS bundle + CSS file
- output goes to `dist/` — these are the files the CFML app loads
- `npm run build` must produce deployable assets

### Mount API
- the bundle exposes `window.ReactMotion.mount(el, config)`
- `el` is a DOM element provided by the CFML page
- `config` contains `BusinessData` and optional settings
- the widget is self-contained — no additional React setup needed on the host page

### Host communication
- CFML passes data in at mount time via `config`
- if the widget needs to notify the host (e.g., export complete), use callback functions in config or CustomEvents
- the widget must not assume any React context exists outside its own tree

### Example CFML integration
```html
<div id="react-motion-root"></div>
<link rel="stylesheet" href="/assets/react-motion/style.css">
<script src="/assets/react-motion/react-motion.js"></script>
<script>
  ReactMotion.mount(document.getElementById('react-motion-root'), {
    data: #serializeJSON(queryData)#,
    options: { lang: 'zh', theme: 'corporate' }
  });
</script>
```

---

## MVP scope rules

Current MVP includes:

* prompt input → OODAE AI agent generates video script from business data
* 15 atomic elements (text, metric, bar-chart, pie-chart, line-chart, sankey, list, divider, callout, kawaii, lottie, icon, annotation, svg, map)
* D3.js SVG chart rendering (d3-shape, d3-scale, d3-sankey, d3-geo)
* custom spring() physics-based animation on all elements (animation.ts)
* CSS scene transitions via SceneRenderer (fade/slide/wipe/clock-wipe)
* browser preview via VideoPlayer (rAF-driven, responsive scaling)
* TTS narration via Gemini TTS API
* export MP4 (html-to-image + FFmpeg.wasm in-browser)
* embed as IIFE JS bundle in CFML page
* settings panel, mobile responsive, PWA support

Current MVP does **not** require:

* multiplayer collaboration
* template editor for end users
* advanced timeline authoring
* freeform canvas engine
* complex asset management backend
* user accounts or auth (handled by CFML host)
* multiple AI providers (Gemini only for MVP)

Do not introduce architecture meant for post-MVP scale unless it directly supports the current flow.

---

## Atomic element system

The template-based scene system has been replaced by an atomic element system. AI composes scenes freely using 15 atomic elements — no fixed templates.

### Element renderers (`src/video/elements/`)

| Element | D3/Lib | Description |
|---------|--------|------------|
| `text` | — | Rich text with fade/slide-up/zoom spring animation |
| `metric` | — | Big KPI numbers (160px) with count-up spring animation |
| `bar-chart` | — | Horizontal bar chart with spring-driven bar growth |
| `pie-chart` | d3-shape | SVG pie/donut chart with spring arc expansion |
| `line-chart` | d3-shape, d3-scale | SVG line chart with stroke-dashoffset draw animation |
| `sankey` | d3-sankey | SVG sankey flow diagram with staggered link animation |
| `list` | — | Bullet/icon list with spring slide-in |
| `divider` | — | Animated line with spring width growth |
| `callout` | — | Highlighted box with spring slide-up |
| `kawaii` | react-kawaii | Cute SVG mascot characters (16 types, 7 moods) |
| `lottie` | lottie-web | Animated icons (6 presets: checkmark, arrows, pulse, star, thumbs-up) |
| `icon` | lucide-react | 45 curated SVG icons across 6 categories with bounce animation |
| `annotation` | roughjs | Hand-drawn sketch annotations (7 shapes) with stroke-draw animation |
| `svg` | — | AI-generated inline SVG diagrams (flowcharts, org charts, mind maps) |
| `map` | d3-geo | World map with country highlighting (50+ countries supported) |

### Text contrast auto-detection

`GenericScene.tsx` computes background luminance and passes a `dark` boolean plus a unified `colors: SceneColors` token object to all elements. Color tokens are defined in `src/video/sceneColors.ts`:

| Token | Dark mode | Light mode | Usage |
|-------|-----------|------------|-------|
| `text` | `#e2e8f0` | `#1e293b` | Primary body text |
| `muted` | `#94a3b8` | `#6b7280` | Secondary / subdued text |
| `label` | `#cbd5e1` | `#6b7280` | Chart axis labels, captions |
| `gridLine` | `#374151` | `#e5e7eb` | Chart grid lines, dividers |

Elements receive `colors` via props and use `colors.text`, `colors.muted`, etc. instead of hardcoded hex values. To change the global palette, edit `sceneColors.ts` only — all 13 element files inherit automatically.

### Mandatory color palette

AI must call `generate_palette` tool before producing the script. The palette provides: 8 chart colors (LCH uniform), background light/dark pair, text colors with guaranteed contrast, accent color. Do NOT allow AI to pick random hex colors.

### Adding a new element

1. Create `src/video/elements/NewElement.tsx` — props: `{ el: SceneElement; index: number }`
2. Add type string to `VALID_ELEMENT_TYPES` in `src/services/parseScript.ts`
3. Add case in `ElementRenderer` switch in `src/video/GenericScene.tsx`
4. Add JSON schema to system prompt in `src/services/prompt.ts`
5. Add type to `SceneElement.type` union in `src/types/video.ts`

### Animation system

All elements use the custom `spring()` from `animation.ts` for physics-based animation (not `interpolate()` linear). Spring config varies per element type for natural feel:
- Light elements (list items): `{ damping: 13, mass: 0.5 }` — snappy
- Medium elements (text, callout): `{ damping: 14, mass: 0.6 }` — balanced
- Heavy elements (charts): `{ damping: 15-18, mass: 0.8 }` — weighty

### Scene transitions (SceneRenderer CSS)

Scenes transition using `SceneRenderer` with easeOutCubic timing (20-frame overlap):
- `fade` — opacity crossfade (default)
- `slide` — translateX push in/out
- `wipe` — clip-path inset reveal
- `clock-wipe` — clip-path polygon circular sweep
AI selects transition type per scene via `scene.transition` field. All transitions are inline CSS — compatible with html-to-image export.

---

## Render reliability rules

Render/export is a critical path.
Do not trade reliability for cleverness.

1. Every export action must have visible user feedback.
2. Every failure path must clear loading/progress indicators.
3. Export inputs must be serializable and reproducible.
4. Avoid hidden dependencies on local component state during rendering.
5. Prefer deterministic render config over inferred magic.
6. If preview and export diverge, treat that as a correctness bug.

---

## Development defaults

* Use modular ownership. Keep new logic inside existing domain folders unless a new boundary is justified.
* Preserve small responsibilities and explicit interfaces.
* Keep PRs incremental and readable.
* Prefer small modules over multi-responsibility files.
* Prefer strict TypeScript types over loosely shaped objects.
* Prefer explicit contracts over hidden conventions.

If a file grows toward ~300 lines with multiple responsibilities, split it.

---

## Subagent usage

Encourage subagent use when work can be split into parallel, non-overlapping tasks.

Good subagent candidates:

* video engine component development
* AI prompt engineering and script generation tuning
* chart animation component development
* export pipeline testing
* CFML integration testing
* reference-only study of `sample-project/`

Rules:

* keep the main agent on the critical path
* do not delegate the immediate blocking decision if the next local step depends on it
* subagents must not create alternate implementation paths
* integrate all accepted changes back into canonical source paths only

---

## Edit workflow for agents (Cursor / Codex style)

Before coding, follow this order:

1. Identify the product boundary:

   * prompt / AI
   * preview
   * render / export
   * template / composition
   * state
   * CFML integration
2. Verify live ownership with import tracing (`rg` on imports/re-exports)
3. Choose the canonical file(s)
4. Make the smallest safe change
5. Update tests/docs affected by behavior change

Do not design new behavior by copying reference/sample implementations directly.

When implementation uncertainty appears:

* review `sample-project/` for reference patterns (reference-only, Remotion has been removed)
* confirm concrete file-to-file mapping first
* adapt patterns only after confirming the active project boundary

If a sample pattern is proposed, capture all three mapping points before implementation:

* exact sample file
* active project file to map
* excluded logic for this repo MVP

---

## Runtime and environment constraints

* Browser runtime is the primary widget target
* the widget runs inside a CFML/Lucee-served HTML page
* MP4 export runs entirely in-browser via FFmpeg.wasm (no Node.js required)
* FFmpeg.wasm multi-thread requires COOP/COEP headers (Vite dev server has them; CFML host must also set them)
* `public/ffmpeg-mt/` contains UMD builds of `@ffmpeg/core-mt` — served as static files to bypass Vite ESM transformation
* preview must work fully in-browser via VideoPlayer (rAF-driven)
* Gemini API key configured via settings panel (localStorage) or `.env.local`
* IndexedDB used for script caching; PWA service worker for offline asset caching
* workers are allowed where they reduce UI blocking

---

## Testing and verification standards

* Add or adjust tests in `tests/` when behavior changes
* Prioritize tests adjacent to the touched path
* Update docs when ownership, contracts, or render flow changes
* Verify preview behavior and export behavior separately when relevant

Current verification priorities:

* AI output parses into a valid `VideoScript`
* compositions render all scene types correctly
* preview and export produce identical results
* widget mounts and unmounts cleanly in a plain HTML page
* export handles failure cleanly with user-visible feedback
* `npm run build` produces working `dist/` assets

---

## Anti-patterns to avoid

Do not introduce:

* a second hidden data model for preview only
* direct template dependence on global store state
* hardcoded demo content in live export paths
* AI output that bypasses type validation
* a full timeline editor before the prompt-to-video pipeline is stable
* multiple competing render paths without a clear source of truth
* sample-project code copied without boundary mapping
* direct database access from the widget (data comes from CFML host)

---

## Style rules

* Keep code readable and explicit.
* No feature duplication across multiple live implementations.
* Update one source of truth at a time.
* Prefer intention-revealing names.
* Keep end-user-facing replies in Mandarin.
* Keep all code, comments, config, docs, and file edits in English only.

---

## Change acceptance check

A change is aligned when it:

* preserves the shell/state/prompt/AI/preview/render ownership map above
* keeps `VideoScript` as the single contract between AI and the render engine
* keeps preview and export derived from the same `VideoScript`
* ensures every failure path clears UI progress/loading state and surfaces the error
* updates impacted docs/tests
* avoids introducing a second implementation path
* keeps the MVP focused on prompt → AI script → video preview → export

---

## Key documentation

* `task.md` — task board with full history, architecture decisions, and roadmap
* `AGENTS.md` — this file: architecture guide and development rules
* `CLAUDE.md` — project-level instructions for Claude Code
