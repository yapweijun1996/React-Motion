# React-Motion Task Board

## Epic: RM — AI Story and Presentation Maker (Agentic Runtime Harness)

---

### Done

| Key | Type | Summary | Status |
|-----|------|---------|--------|
| RM-1 | Task | Project init: Vite + React + TypeScript + Remotion | Done |
| RM-2 | Task | Configure Vite library mode (IIFE bundle for CFML embed) | Done |
| RM-3 | Task | Define core types: MountConfig, BusinessData, VideoScript | Done |
| RM-4 | Task | Create TitleScene component with fade-in animation | Done |
| RM-5 | Task | Create ChartScene component with animated bar chart | Done |
| RM-6 | Task | Create HighlightScene component with staggered bullet points | Done |
| RM-7 | Task | Create SummaryScene component with recommendation card | Done |
| RM-8 | Task | Build ReportComposition with SceneRenderer routing | Done |
| RM-9 | Task | Integrate Gemini API client (services/gemini.ts) | Done |
| RM-10 | Task | Build OODAE prompt system — AI extracts data from user prompt | Done |
| RM-11 | Task | Build VideoScript parser with type validation | Done |
| RM-12 | Task | Build generateScript pipeline (prompt → Gemini → parse → script) | Done |
| RM-13 | Task | Add prompt textarea UI with generate button | Done |
| RM-14 | Bug | Remove hardcoded demo BusinessData — violates anti-hardcode rule | Done |
| RM-15 | Task | Refactor to prompt-first architecture (no pre-structured data required) | Done |
| RM-16 | Task | Add console.log debug logging across full pipeline | Done |
| RM-17 | Task | Add retry mechanism with error feedback to Gemini (max 3 attempts) | Done |
| RM-18 | Task | Rewrite AGENTS.md — pivot from video editor to AI story/presentation maker | Done |
| RM-19 | Task | Create MetricScene — big KPI number display with count-up animation | Done |
| RM-20 | Task | Add crossfade transitions between scenes | Done |
| RM-21 | Task | Add global progress bar to ReportComposition | Done |
| RM-22 | Task | Enrich scene visual control — AI controls bgColor, animation, highlight | Done |
| RM-23 | Task | Study PPTAgent architecture — multi-agent, schema-driven, eval patterns | Done |
| RM-24 | Task | Study goose agent — ActionRequired, schema validation, streaming loop | Done |
| RM-25 | Arch | Atomic element system — replace 5 fixed scenes with 6 composable elements | Done |
| RM-26 | Task | Create GenericScene renderer — elements-based rendering engine | Done |
| RM-27 | Task | Create 6 atomic element renderers (text, metric, bar-chart, list, divider, callout) | Done |
| RM-28 | Task | Remove old hardcoded scene components (TitleScene, ChartScene, etc.) | Done |
| RM-29 | Task | Rewrite prompt for element-based free composition | Done |
| RM-30 | Bug | Fix crossfade interpolate crash on last scene [1080,1080] | Done |
| RM-31 | Task | Multi-turn Gemini support for retry with conversation history | Done |
| RM-32 | Task | Update parseScript for elements-based VideoScene format | Done |
| RM-33 | Task | Simplify prompt — remove prescriptive design rules, AI-First | Done |
| RM-34 | Task | 1+1 Evaluate — synchronous AI self-check after generation | Done |
| RM-35 | Task | MP4 export — frame-by-frame capture + FFmpeg.wasm encoding | Done |
| RM-36 | Task | SVG favicon | Done |
| RM-42 | Task | TTS integration — Gemini 2.5 Flash TTS for scene narration (services/tts.ts) | Done |
| RM-43 | Task | Remotion `<Audio>` integration — sync TTS audio with scenes, TTS-first timing | Done |
| RM-44 | Task | Export MP4 with audio track — FFmpeg.wasm adelay + amix + AAC mux | Done |
| RM-47 | Task | D3.js chart elements — pie-chart, line-chart, sankey (d3-shape, d3-scale, d3-sankey) | Done |
| RM-59 | Task | Settings panel — runtime API key + model selection via UI (localStorage) | Done |
| RM-60 | Task | UI/UX redesign — CSS class-based layout, header, card-style input, visual hierarchy | Done |
| RM-61 | Task | Mobile responsive — media queries, touch-friendly buttons (44px), stacked layout | Done |
| RM-62 | Task | PWA support — manifest.json, service worker (cache-first static, network-first API), iOS meta tags | Done |
| RM-63 | Task | Prompt templates — 21 presets (business, professional, science, study, sports, etc.) | Done |
| RM-104 | Task | History templates — 7 country story templates (SG, MY, US, CN, JP, IN, UK) + refactor templateData.ts | Done |
| RM-64 | Arch | OODAE Agent Loop — multi-turn agentic pipeline with function calling (max 12 iterations) | Done |
| RM-65 | Task | Agent tools — analyze_data, draft_storyboard, get_element_catalog, produce_script | Done |
| RM-66 | Task | Gemini function calling + Google Search grounding support in gemini.ts | Done |
| RM-67 | Task | Agent system prompt — OODAE-aware, creative direction, Duarte Sparkline arc, "So What?" rule, pacing/variety/emotional engagement | Done |

| RM-37 | Bug | MP4 export speed — `-preset ultrafast`, `-crf 28`, `-tune stillimage`, frameStep=3 | Done |
| RM-39 | Task | FFmpeg `-threads` auto-detect — `Math.min(hardwareConcurrency, 4)` | Done |
| RM-40 | Task | FFmpeg progress → UI — capturing/writing/encoding/muxing percent display | Done |
| RM-41 | Task | Optimize FFmpeg settings — `-preset ultrafast -crf 28 -tune stillimage` | Done |
| RM-49 | Task | Loading animation — spinner + generationStatus display during AI pipeline | Done |
| RM-86 | Task | Deep audit round 1–3: 19 fixes (D3 useMemo, concurrency guards, NaN/Infinity, type safety, memory leaks) | Done |
| RM-87a | Task | ClassifiedError system — ErrorCode enum, user-friendly messages, logError/logWarn, classifyHttpStatus | Done |
| RM-88 | Task | Data lifecycle & privacy — IndexedDB 7-day TTL, API key obfuscation, Clear Data UI, sensitive log cleanup | Done |
| RM-89 | Task | Chart sizing + layout overhaul — responsive SVG (viewBox), element font scaling, GenericScene flex stretch, AI prompt layout rules | Done |
| RM-90 | Arch | Unified runtime schema — validate.ts single source of truth for enums, ranges, structural checks. Replaces scattered hand-rolled validation. | Done |
| RM-80 | Task | Vitest unit test suite — 67 tests across validate, parseScript, adjustTiming, prompt (4 files, 194ms) | Done |
| RM-91 | Task | Export frame capture yield — setTimeout(0) between frames keeps UI responsive during export | Done |
| RM-87 | Task | Observability — metrics.ts IndexedDB event log with 4 埋点 (generation/export/tts/error), getStats() aggregation, exportEventsAsJSON(), auto-prune | Done |
| RM-48 | Task | CJK language-aware scene duration — hasCJK() + ×1.5 multiplier for CJK narration (with and without TTS audio) | Done |
| RM-93 | Task | Chart container-level entrance animation — all 4 chart elements (bar/pie/line/sankey) support animation prop, default zoom. Prompt + elementCatalog updated. | Done |
| RM-92 | Task | TTS parallel generation — concurrency pool + single retry on transient errors (429/500/502/503). Zero new dependencies. | Done |
| RM-54 | Task | Prompt history + export records — IndexedDB v2: historyStore (50-entry FIFO) + exportStore + HistoryPanel UI + TTS metadata | Done |
| RM-94 | Bug | HistoryPanel missing all CSS — 16 classes undefined. Add panel/tabs/history-list/btn-sm/btn-danger styles. Fix History icon (H→↻). Remove backdrop-filter (GPU). | Done |
| RM-95 | Task | CSS architecture split — styles.css (862 lines) → 9 domain files under src/styles/. Import hub entry point. All files under 180 lines. | Done |
| RM-96 | Task | Layout reorder — PromptTemplates moved above Player (closer to input area for easy template access) | Done |
| RM-103 | Task | PPT export — pptxgenjs VideoScript→PPTX conversion. 9/11 element types mapped (sankey→table, kawaii→caption, lottie→skip). Narration→speaker notes. Native bar/pie/line charts. | Done |
| RM-100a | Task | `lucide` icon layer — 45 curated icons (6 categories), IconElement with bounce animation, tree-shaken imports | Done |
| RM-100b | Task | `roughjs` annotation renderer — 7 hand-drawn shapes (circle, underline, arrow, box, cross, highlight, bracket), stroke-draw animation | Done |
| RM-100c | Task | D3 helper layer — `d3-format` SI prefix formatting + `d3-scale-chromatic` Tableau10 palette. Eliminated 4×DEFAULT_COLORS + 2×formatVal duplication. | Done |
| RM-105 | Bug | Narration↔Visual sync — TTS mentions data not shown in visual elements. Added sync rules to agent prompt + legacy prompt, evaluator check #5 (NARRATION-VISUAL SYNC), MAX_ITERATIONS 10→12. | Done |
| RM-106 | Task | Creative direction overhaul — Duarte Sparkline narrative arc (7-beat story structure), "So What?" rule for chart narration, pacing/rhythm guidelines (variable scene duration, breathing scenes), visual variety mandates (element/layout/bg/animation diversity), emotional engagement (kawaii, annotation, icon usage). | Done |
| RM-107 | Bug | TTS retry transient errors — expanded retry from 429-only to 429/500/502/503 (all transient server errors). Single retry + 1.5s delay unchanged. | Done |
| RM-115 | Task | AudioTrack.tsx — HTML5 Audio synced to frame engine. ReportComposition: bare `<audio>` → `<AudioTrack>`. 10 tests. | Done |
| RM-118 | Task | Remove all `remotion` and `@remotion/*` from package.json — 5 packages removed, 8 pruned. | Done |
| RM-120 | Task | Update AGENTS.md + docs — remove Remotion references from 7 doc files. RM-EPIC-04 complete. | Done |
| RM-97a | Task | Export failure-path fix — error alert auto-clear 5s + dismiss button. 3 new tests. | Done |
| RM-97b | Task | FFmpeg MT downgrade validation — 7 tests (SAB/COOP detection, MT→ST fallback, both-fail throw). | Done |
| RM-38 | Task | FFmpeg.wasm multi-thread — `@ffmpeg/core-mt` UMD from `public/ffmpeg-mt/`. Runtime detection + auto-fallback. 7 tests validate MT/ST paths. | Done |

### In Progress / Testing

(None)

### To Do — Remaining

**Visual Enhancement Layer 1 & 2: ✅ ALL DONE** (RM-68~75: spring, transitions, noise, stagger, kawaii, lottie, chroma-js, 9 entrance animations)

**Maintenance**

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-121 | Task | TTS audio IndexedDB persistence — WAV blobs saved/restored via ttsCache.ts | Done | DB v3→v4, new `ttsAudio` store. cache.ts + historyStore.ts integrated. `onblocked`/`onversionchange` handlers for upgrade reliability. |
| RM-83 | Task | Migrate IndexedDB cache layer to `idb` promise wrapper | Low | 当前 db.ts 手写 IDB 正常工作。简化语法但不解决实际问题。 |
| RM-84 | Task | Evaluate `vite-plugin-pwa` to replace hand-managed manifest/service worker wiring | Low | 当前 SW 正常运行，迁移风险 > 收益。 |

### To Do — Priority 2 (Remove Remotion Dependency)

**Epic: RM-EPIC-04 — Remove Remotion, Build Custom Video Engine (Zero License Cost)**

Goal: Replace all Remotion imports with self-built modules. Fully frontend, zero license risk, smaller bundle.

| Key | Type | Summary | Priority | Status | Notes |
|-----|------|---------|----------|--------|-------|
| RM-110 | Task | `animation.ts` — custom `spring()`, `interpolate()`, `noise2D/3D` | High | ✅ Done | Drop-in API replacement. 18 tests pass. ~230 lines. |
| RM-111 | Task | `VideoContext.tsx` — custom `useCurrentFrame`, `useVideoConfig`, `usePlaying` via React Context | High | ✅ Done | Triple-context: FrameContext (nestable for scene-local frames) + VideoConfigContext (global, useMemo cached) + PlayingContext (AudioTrack sync). VideoProvider (top-level) + FrameProvider (per-scene remap). 11 tests pass. ~127 lines. |
| RM-112 | Task | `SceneRenderer.tsx` — custom scene sequencer + CSS transitions | High | ✅ Done | Replaces `TransitionSeries` + `fade/slide/wipe/clockWipe`. Framework-agnostic (accepts `frame` prop + `renderScene` callback). Pure CSS transitions: opacity (fade), translateX (slide), clip-path inset (wipe), clip-path polygon (clock-wipe). Overlap compression via `computeEffectiveStarts`. 37 tests pass. ~210 lines. |
| RM-113 | Task | `VideoPlayer.tsx` + `VideoSurface.tsx` + `PlayerHandle.ts` — custom player | High | ✅ Done | VideoPlayer: rAF playback, play/pause/seek/progress bar/keyboard/responsive scaling/loop. VideoSurface: headless export player (seekTo only). PlayerHandle: imperative ref type replacing Remotion PlayerRef. 11 tests pass. ~355 lines total. |
| RM-114 | Task | `AbsoluteFill.tsx` — trivial div wrapper | Low | ✅ Done | Drop-in replacement. 28 lines. `position:absolute; inset:0; flex column`. Supports `style` merge + `children`. |
| RM-115 | Task | `AudioTrack.tsx` — HTML5 Audio API synced to frame engine | Medium | ✅ Done | 80 lines. usePlaying() → play/pause sync. useCurrentFrame()/fps → drift > 0.3s seek correction. Volume clamp 0-1. Unmount pauses. ReportComposition: bare `<audio>` → `<AudioTrack>` integrated. 10 tests pass. |
| RM-116 | Task | Batch update all element imports — switch from `remotion` to custom modules | Medium | ✅ Done | 12 files, 19 import lines migrated. 8 elements + useStagger + NoiseBackground + GenericScene (import swap) + ReportComposition (rewritten: TransitionSeries → SceneRenderer + FrameProvider). Zero `remotion`/`@remotion/*` imports remain in src/. AudioTrack integrated (RM-115 ✅). 167 tests pass. Build OK. |
| RM-117 | Task | Replace `@remotion/lottie` — use `lottie-web` directly | Low | ✅ Done | Custom `LottieAnimationData` type in lottiePresets.ts. LottieElement rewritten: lottie-web `loadAnimation` + `goToAndStop(frame, true)` frame sync via useCurrentFrame. Removed useDelayRender/continueRender (SSR-only). |
| RM-118 | Task | Remove all `remotion` and `@remotion/*` from package.json | Medium | ✅ Done | Removed 5 packages (remotion + 4 @remotion/* scopes). 8 packages pruned from node_modules. Build OK. 167 tests pass. |
| RM-119 | Task | Update ExportStage.tsx — use VideoSurface for frame capture | Medium | ✅ Done | ExportStage: `Player` → `VideoSurface`, `PlayerRef` → `PlayerHandle`. exportVideo.ts + useVideoActions.ts: pure type swap. App.tsx: `Player` → `VideoPlayer` for preview. `@remotion/player` import count: 0. |
| RM-120 | Task | Update AGENTS.md + docs — reflect custom engine architecture | Low | ✅ Done | 15 sections updated: Project goal, Current phase (→Phase 3), Core flow diagram, Runtime stack (+8 engine modules), Preview/Composition layer, Data contract, AI rules, "Remotion usage rules"→"Custom video engine" (full rewrite with module table), MVP scope (9→15 elements), Element table (lottie), Animation system, Scene transitions (CSS), Subagent list, Edit workflow, Runtime constraints, Verification, Change acceptance. 4 remaining "Remotion" mentions are historical context (already-removed). CLAUDE.md clean. |

**Execution order:** RM-110 ✅ → RM-111 ✅ → RM-114 ✅ → RM-113 ✅ → RM-117 ✅ → RM-119 ✅ → RM-112 ✅ → RM-116 ✅ → RM-115 ✅ → RM-118 ✅ → RM-120 ✅

**Remotion replacement map:**

| Remotion Feature | Replacement | Status |
|-----------------|-------------|--------|
| `spring()` | `animation.ts` spring() | ✅ Done (RM-110) |
| `interpolate()` | `animation.ts` interpolate() | ✅ Done (RM-110) |
| `noise2D/3D` | `animation.ts` noise2D/3D() | ✅ Done (RM-110) |
| `useCurrentFrame` | `VideoContext.tsx` useCurrentFrame() | ✅ Done (RM-111) |
| `useVideoConfig` | `VideoContext.tsx` useVideoConfig() | ✅ Done (RM-111) |
| `AbsoluteFill` | `AbsoluteFill.tsx` | ✅ Done (RM-114) |
| `@remotion/player` | `VideoPlayer.tsx` + `VideoSurface.tsx` | ✅ Done (RM-113+119) |
| `PlayerRef` type | `PlayerHandle.ts` | ✅ Done (RM-113+119) |
| `@remotion/lottie` | `lottie-web` direct | ✅ Done (RM-117) |
| `@remotion/noise` | `animation.ts` noise2D/3D | ✅ Done (RM-110) |
| `TransitionSeries` + effects | `SceneRenderer.tsx` | ✅ Done (RM-112) |
| `<Audio>` | `AudioTrack.tsx` | ✅ Done (RM-115) |

**Progress: 12/12 Remotion features replaced. 11/11 tasks done. RM-EPIC-04 COMPLETE ✅**

### To Do — Priority 3 (Phase 4A — Video Quality, immediate user impact)

**Epic: RM-EPIC-05 — Video Quality & Personalization (10K business users)**

Goal: Raise output quality from "internal demo" to "client-facing". Biggest bang-for-buck improvements first.

| Key | Type | Summary | Priority | Status | Notes |
|-----|------|---------|----------|--------|-------|
| RM-121 | Task | Full-frame capture — frameStep 3→1 + streaming write | Highest | ✅ Done | frameStep 3→1 (full-frame). Streaming: toPng→writeFile→discard (O(1) memory). waitFrame 2→1. FFmpeg pre-loaded. inputFps=fps (no interpolation). |
| RM-122 | Task | Export quality presets — CRF/preset dynamic by settings | High | ✅ Done | 3 presets: draft (CRF 28/ultrafast), standard (CRF 24/fast), high (CRF 20/medium). AppSettings.exportQuality + validate.ts + SettingsPanel dropdown + exportVideo.ts QUALITY_PROFILES. Default: standard. |
| RM-123 | Task | TTS voice selection UI — expose Gemini 30+ voices + language picker | High | To Do | Currently hardcoded single voice "Kore". Gemini supports 30+ voices across languages. Settings panel voice dropdown + per-video language. |
| RM-124 | Task | Background music — ambient audio layer with auto-ducking during narration | Medium | ✅ Done | Lyria 3 Clip API (`bgMusic.ts`). Settings toggle (default OFF). 8 mood presets. Preview: AudioTrack global + useMemo ducking (0.35/0.1). Export: FFmpeg volume `between()` ducking filter. Full pipeline: Settings→Lyria→script.bgMusicUrl→preview→MP4. |

### To Do — Priority 4 (Phase 4B — User Experience, retention)

**Epic: RM-EPIC-06 — Post-Generation Editing & Media**

Goal: Let users refine AI output without regenerating. Add brand assets.

| Key | Type | Summary | Priority | Status | Notes |
|-----|------|---------|----------|--------|-------|
| RM-125 | Story | Scene-level editor — reorder/delete/edit scenes post-generation | High | To Do | Users say "almost perfect but...". 6 sub-tasks below. |

**Story: RM-125 Scene-Level Editor**

- Type: Story
- Priority: High
- Status: To Do
- Goal: Let users refine AI-generated video without regenerating. Edit in-place, preview instantly.
- Dependencies: None (all infrastructure exists: setScript, adjustSceneTimings, generateSceneTTS)
- Acceptance Criteria:
  - User can delete a scene → video re-renders without that scene, timing recalculated.
  - User can reorder scenes → startFrames recalculated, transitions preserved.
  - User can edit text/metric element values → preview updates instantly.
  - User can edit narration text → TTS regenerated for that scene only, timing adjusted.
  - User can change bgColor/transition per scene.
  - Editor panel does not block video preview (side-by-side or toggle).

**Task: RM-125a SceneEditor panel component + scene list**

- Type: Task
- Priority: Highest
- Status: To Do
- Parent: RM-125
- Scope:
  - New `src/components/SceneEditor.tsx` — collapsible panel below VideoPlayer.
  - Shows numbered scene list with thumbnail info (id, element count, narration preview).
  - Props: `script: VideoScript`, `onScriptChange: (s: VideoScript) => void`.
  - New `src/styles/editor.css` with `rm-editor-*` classes.
  - Toggle button in App.tsx (pencil icon, next to Export buttons).
- Acceptance Criteria:
  - Panel opens/closes. Scene list renders for any VideoScript.
  - No editing yet — read-only scene list in this task.
- Est. files: SceneEditor.tsx (~120 lines), editor.css (~80 lines), App.tsx (+15 lines).

**Task: RM-125b Delete + reorder scenes**

- Type: Task
- Priority: High
- Status: To Do
- Parent: RM-125
- Scope:
  - Delete button per scene → remove from `scenes[]` → `adjustSceneTimings()` → `setScript()`.
  - Move up/down buttons per scene → swap in array → `adjustSceneTimings()` → `setScript()`.
  - Revoke `ttsAudioUrl` blob on deleted scene.
  - Minimum 1 scene enforced (disable delete on last scene).
- Acceptance Criteria:
  - Delete scene → video instantly shorter, timing correct.
  - Reorder → transitions and frames recalculated.

**Task: RM-125c Edit scene properties (bgColor, transition, layout)**

- Type: Task
- Priority: High
- Status: To Do
- Parent: RM-125
- Scope:
  - Per-scene expandable section in SceneEditor.
  - Color picker for `bgColor` (native `<input type="color">`).
  - Dropdown for `transition` (fade/slide/wipe/clock-wipe).
  - Dropdown for `layout` (column/center/row).
  - Each change → immutable update to `script.scenes[i]` → `setScript()`.
- Acceptance Criteria:
  - Change bgColor → preview updates in real-time.
  - Change transition → next play-through shows new effect.

**Task: RM-125d Edit element values (text content, metric numbers, list items)**

- Type: Task
- Priority: High
- Status: To Do
- Parent: RM-125
- Scope:
  - Per-element inline editor inside expanded scene section.
  - `text` element → textarea for `content`.
  - `metric` element → editable `items[].value` and `items[].label`.
  - `list` element → editable `items[]` strings.
  - `callout` element → editable `title` and `content`.
  - Other element types: read-only display for now (charts, kawaii, lottie, etc.).
- Acceptance Criteria:
  - Edit text → preview updates instantly.
  - Edit metric value → count-up animation replays with new number.

**Task: RM-125e Edit narration + single-scene TTS regeneration**

- Type: Task
- Priority: Medium
- Status: To Do
- Parent: RM-125
- Scope:
  - Per-scene narration textarea in SceneEditor.
  - On blur/confirm: if narration changed, call `generateSceneTTS([editedScene])`.
  - Merge TTS result back → `adjustSceneTimings()` → `setScript()`.
  - Show "Regenerating audio..." spinner on that scene only.
  - Debounce: don't regenerate on every keystroke, only on confirm.
- Acceptance Criteria:
  - Edit narration → new TTS audio plays on next preview.
  - Scene duration auto-adjusts to new audio length.
  - Other scenes unaffected.

**Task: RM-125f Keyboard shortcuts + polish**

- Type: Task
- Priority: Low
- Status: To Do
- Parent: RM-125
- Scope:
  - `Del` key to delete selected scene.
  - `Ctrl+Z` undo last edit (single-level: save previous script snapshot).
  - Scene click → player seeks to that scene's startFrame.
  - Mobile: touch-friendly (44px buttons, no drag-drop on mobile).
- Acceptance Criteria:
  - Undo restores previous state.
  - Click scene → player jumps to that scene.

**Execution order:** RM-125a → RM-125b → RM-125c → RM-125d → RM-125e → RM-125f
| RM-126 | Task | Image element — URL/upload → embed in scene as `<img>` | High | To Do | Company logo, product photos, team pictures. New atomic element type. AI can reference user-provided image URLs. |
| RM-127 | Task | Video template library — pre-built script skeletons + data slot binding | Medium | To Do | "Quarterly Report", "Product Launch", "Team Update" templates. User fills in data, AI adapts the template. Lowers barrier for first-time users. |
| RM-128 | Task | SRT/VTT subtitle export — generate from scene narration text + timing | Low | To Do | Accessibility + multi-language. Derive from existing narration + startFrame/durationInFrames. Near-zero AI cost. |

### To Do — Priority 5 (Phase 4C — Enterprise Scale, 10K users)

**Epic: RM-EPIC-07 — Enterprise Infrastructure**

Goal: Support 10,000 concurrent users with quota, branding, and batch workflows.

| Key | Type | Summary | Priority | Status | Notes |
|-----|------|---------|----------|--------|-------|
| RM-129 | Task | API gateway + per-user quota management | High | To Do | Centralized Gemini API key pool. Per-user/per-org rate limits. Usage tracking + billing hooks. |
| RM-130 | Task | PPTX export completeness — add icon, annotation, svg, map element rendering | Medium | To Do | Currently 9/15 elements export to PPT. 6 missing: icon (→ lucide name text), annotation (→ shape), svg (→ image), map (→ image snapshot), kawaii (→ emoji), lottie (→ skip). |
| RM-131 | Task | Batch generation — 1 template × N data sets → N videos | Medium | To Do | Sales teams generate per-region reports. Queue-based: user uploads CSV, each row → one video. Progress dashboard. |
| RM-132 | Task | Brand kit — company logo + font preset + color palette saved per org | Medium | To Do | Auto-apply logo to title/close scenes. Font selector (Google Fonts). Saved palette overrides AI generate_palette. |

### To Do — Priority 6 (Phase 5 — Export Performance, WebCodecs)

**Epic: RM-EPIC-08 — WebCodecs Export Pipeline (Replace FFmpeg.wasm)**

Goal: Replace FFmpeg.wasm (WASM software encoding, ~3fps) with browser-native WebCodecs API (hardware GPU encoding, 60-200fps). Reduce export time from ~8 minutes to ~1.5-2 minutes for a 30-second video. Cut bundle size by ~25MB.

**Analysis Summary (2026-04-01):**

Current bottleneck breakdown (30s video = 900 frames @ 30fps):
- Frame Capture (html-to-image toPng): ~180s — DOM clone + SVG serialize + PNG encode
- Video Encode (FFmpeg.wasm libx264): ~300s — WASM software, ~3fps, no GPU
- Audio Mux (FFmpeg.wasm): ~5s
- Total: ~8 minutes

WebCodecs projected performance:
- Frame Capture (toSvg + createImageBitmap): ~90s (1.5-2x faster)
- Video Encode (VideoEncoder HW H.264): ~5-15s (20-60x faster)
- Audio Mix (OfflineAudioContext + AudioEncoder): ~1s (3-5x faster)
- Total: ~1.5-2 minutes (4x improvement)

Browser support: Chrome/Edge 94+ (full HW accel), Safari 17+ (partial), Firefox (flag only → FFmpeg fallback).

**Architecture:**
- `WebCodecs VideoEncoder` → hardware H.264 encoding (GPU accelerated)
- `mp4-muxer` npm package → lightweight MP4 container (15KB vs 25MB FFmpeg WASM)
- `Web Audio API OfflineAudioContext` → TTS positioning + BGM ducking (replaces FFmpeg adelay/amix/volume filters)
- `WebCodecs AudioEncoder` → AAC encoding
- Feature detection: `canUseWebCodecs()` → WebCodecs path; fallback → existing FFmpeg.wasm path (Firefox)

**New files:**
- `src/services/webCodecsSupport.ts` — feature detection, codec config, quality profile mapping
- `src/services/exportVideoWebCodecs.ts` — WebCodecs video encoding pipeline
- `src/services/exportAudioWebCodecs.ts` — Web Audio mixing + AudioEncoder

| Key | Type | Summary | Priority | Status | Notes |
|-----|------|---------|----------|--------|-------|
| RM-133 | Task | Phase 1: WebCodecs video encoding — VideoEncoder + mp4-muxer replace FFmpeg.wasm libx264 | Highest | To Do | Keep html-to-image frame capture. PNG→ImageBitmap→VideoFrame→EncodedVideoChunk→mp4-muxer. HW accel `prefer-hardware`. Quality profiles: draft=2Mbps, standard=5Mbps, high=10Mbps (VBR). H.264 Main Profile Level 4.0. Feature detect → FFmpeg fallback. Est: 2-3 days. **Expected: encoding 3fps→60-200fps, total export -50%.** |
| RM-134 | Task | Phase 2: Optimized frame capture — toSvg + createImageBitmap, skip PNG encode/decode | High | To Do | Replace `toPng()` with `toSvg()→Blob→createImageBitmap()→VideoFrame`. Eliminates PNG compression + base64 round-trip. Or intercept html-to-image internal canvas via `transferToImageBitmap()`. Est: 1-2 days. **Expected: frame prep 20-40% faster.** |
| RM-135 | Task | Phase 3: Web Audio mixing — OfflineAudioContext replaces FFmpeg audio filters | Medium | To Do | Decode TTS WAVs + BGM MP3 via `decodeAudioData()`. BufferSource per TTS with `.start(delaySec)`. GainNode automation `linearRampToValueAtTime` for smooth BGM ducking (better than FFmpeg step-function `between()`). `startRendering()→AudioBuffer→AudioData→AudioEncoder(AAC)→mp4-muxer`. Est: 3-4 days. |
| RM-136 | Task | Phase 4: Firefox fallback — lazy-load FFmpeg.wasm only when WebCodecs unavailable | Low | To Do | Dynamic `import()` for FFmpeg packages. Only Firefox loads ~25MB WASM. Add telemetry for path usage (WebCodecs vs FFmpeg). Consider WebM via MediaRecorder as lighter Firefox alternative. |
| RM-137 | Task | Phase 5 (future): Canvas-native rendering for hot elements — D3 charts on OffscreenCanvas | Low | To Do | Research-only. If frame capture remains bottleneck after Phase 1-3, selectively render BarChart/PieChart/LineChart via D3 canvas renderer instead of SVG DOM. Compositing into main frame. Multi-month effort — only pursue if justified by profiling. |

**Execution order:** RM-133 → RM-134 → RM-135 → RM-136 → RM-137

**Key risks:**
- `VideoFrame` memory leak — each 1080p RGBA = ~8MB GPU memory, must `.close()` after use
- No CRF mode in WebCodecs — use bitrate (VBR) instead, approximate mapping to current CRF profiles
- Firefox WebCodecs still behind flag — must maintain complete FFmpeg.wasm fallback
- Safari AudioEncoder AAC had issues in 16.x — need careful feature detection, Safari 17+ is reliable

**Dependencies to add:** `mp4-muxer` (~15KB gzipped)
**Dependencies to remove (after Phase 3):** `@ffmpeg/core`, `@ffmpeg/core-mt` (lazy-load for Firefox only)

### To Do — Maintenance / Superseded

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-56 | Task | ~~Reduce bundle size — analyze and tree-shake Remotion deps~~ | ~~Low~~ | Superseded by RM-EPIC-04 (remove Remotion entirely) |
| RM-57 | Task | Multi-provider AI support — Claude, GPT as alternatives to Gemini | Low | Provider abstraction layer |
| RM-58 | Task | Multi-speaker TTS — different voices for different scenes | Low | Partially addressed by RM-123 (voice selection). Full multi-speaker = different voice per scene role. |
| RM-83 | Task | Migrate IndexedDB cache layer to `idb` promise wrapper | Low | 当前 db.ts 手写 IDB 正常工作。简化语法但不解决实际问题。 |
| RM-84 | Task | Evaluate `vite-plugin-pwa` to replace hand-managed manifest/service worker wiring | Low | 当前 SW 正常运行，迁移风险 > 收益。 |
| RM-85 | Task | ~~Evaluate MediaBunny/WebCodecs-era browser media pipeline for future export simplification~~ | ~~Low~~ | ✅ Done — Deep analysis completed. Superseded by RM-EPIC-08 (WebCodecs migration plan). See Phase 5 section. |

### Milestone Status

**Production Hardening — 7/7 COMPLETE ✅:**
- ✅ Unified runtime schema (RM-90 validate.ts)
- ✅ Unit tests (RM-80: 170 tests, 10 files)
- ✅ Observability (RM-87 metrics.ts — generation/export/tts/error events)
- ✅ Export UI responsiveness (RM-91 yield)
- ✅ CJK language-aware timing (RM-48)
- ✅ Export failure clears progress state (RM-97a: auto-clear 5s + dismiss button, 3 tests)
- ✅ FFmpeg MT downgrade validated (RM-97b: 7 tests — SAB/COOP detection, MT→ST fallback, both-fail throw)

**Remove Remotion (RM-EPIC-04) — 11/11 COMPLETE ✅**

**Phase 4 Roadmap:**
- 🟡 Phase 4A: Video Quality (RM-121~124) — RM-121 ✅, RM-122 ✅, RM-123 ⬜, RM-124 ✅
- ⬜ Phase 4B: User Experience (RM-125~128) — scene editor, images, templates, subtitles
- ⬜ Phase 4C: Enterprise Scale (RM-129~132) — API gateway, PPTX, batch, brand kit
- ⬜ Phase 5: Export Performance (RM-133~137) — WebCodecs HW encoding, Web Audio mixing, -25MB bundle

### JIRA Backlog Format

#### Epic: RM-EPIC-01 Production Hardening

**Story: RM-97 Export Reliability and Recovery**

- Type: Story
- Priority: Highest
- Status: Done (RM-97a ✅, RM-97b ✅)
- Goal: Make MP4 export reliable under success, fallback, and failure conditions without leaving the UI in a broken state.
- Dependencies: RM-38
- Acceptance Criteria:
  - Export failure always clears loading/progress UI.
  - Single-thread fallback works when multi-thread initialization fails.
  - Silent output, audio mux failure, and capture failure are distinguishable in logs.
  - Preview/export parity is spot-checked against the same `VideoScript`.

**Task: RM-97a Add export failure-path verification** ✅ Done

- Type: Task
- Priority: High
- Status: Done
- Parent: RM-97
- Scope:
  - Verify `capturing`, `writing`, `encoding`, and `muxing` failure paths.
  - Confirm `showExportStage` and progress state are always reset.
- Acceptance Criteria:
  - Each export stage has an explicit failure test case.
  - No stuck overlay remains after any simulated export failure.
- Implementation:
  - **Bug fixed:** error alert persisted forever — `exportProgress` never cleared to null after error/done.
  - **Fix 1:** `useExport` finally block adds `setTimeout(() => onProgress(null), 5000)` — auto-clears after 5s.
  - **Fix 2:** Error alert gets dismiss button (`rm-alert-dismiss`) for immediate close.
  - **Fix 3:** CSS for dismiss button (position:absolute top-right, hover opacity).
  - **Tests:** 3 new tests in `test/useExport.test.tsx` — error auto-clear, success auto-clear, showStage always reset.
  - Files: useVideoActions.ts, App.tsx, styles/base.css, test/useExport.test.tsx (new).

**Task: RM-97b Add FFmpeg multi-thread downgrade validation** ✅ Done

- Type: Task
- Priority: High
- Status: Done
- Parent: RM-97
- Scope:
  - Force `SharedArrayBuffer` / `crossOriginIsolated` negative cases.
  - Validate downgrade to single-thread export path.
- Acceptance Criteria:
  - Logs clearly indicate downgrade reason.
  - Export still completes in fallback mode.
- Implementation:
  - Exported `canUseMultithreadCore`, `getFFmpeg`, `_resetFFmpegForTest`, `_isMultiThread` for test access.
  - 7 tests in `test/exportFFmpeg.test.ts`:
    - `canUseMultithreadCore`: SAB missing → false, crossOriginIsolated false → false, both present → true.
    - `getFFmpeg`: SAB missing → direct ST, MT load throws → fallback ST, both fail → throws, MT succeeds → isMultiThread true.
  - Files: exportVideo.ts (+4 export lines), test/exportFFmpeg.test.ts (new).

**Story: RM-98 Observability and Diagnostics** ✅ Done (RM-87)

- Implemented as metrics.ts — IndexedDB event log with trackEvent/trackError/getStats/exportEventsAsJSON.
- 4 埋点: generation, export, tts, error (auto via logError).
- No external dependency (Sentry/PostHog not needed for MVP).

~~**Story: RM-99 Worker Orchestration Hardening**~~ → Removed (RM-82 rejected)

#### Epic: RM-EPIC-02 SVG and Visual Vocabulary

**Story: RM-100 Professional and Study SVG System** ✅ Done

- Type: Story
- Priority: High
- Status: Done
- Goal: Improve perceived output quality with a reusable SVG vocabulary for professional and educational videos.
- Acceptance Criteria:
  - Business scenes can render consistent KPI/risk/growth icons. ✅ RM-100a: 45 lucide icons (6 categories)
  - Study scenes can render instructional annotation graphics within the SVG/custom engine model. ✅ RM-100b: 7 roughjs hand-drawn shapes
- Bonus: RM-100c unified chart formatting + Tableau10 professional palette

**Task: RM-100a Add `lucide` icon layer**

- Type: Task
- Priority: High
- Status: Done
- Parent: RM-100
- Scope:
  - Add a curated icon set for KPI, finance, alerts, science, education, and summary scenes.
- Acceptance Criteria:
  - Icons are tree-shaken imports. ✅ 45 个精选图标，分 6 类 tree-shaken import
  - At least 3 existing scene types can consume the icon system. ✅ 新增独立 `icon` 元素类型，可与任意场景组合（row layout + text/metric/callout）
- Implementation Notes:
  - `lucide-react` installed. IconElement.tsx (~110 lines) with ICON_REGISTRY (45 icons across 6 categories: business, status, education, science, arrows, general).
  - Default animation: `bounce`. Spring preset: `hero`. AI selects icon via `name` prop.
  - 6 files modified + 1 new file. Validate enum 11→12. All 80 tests pass.

**Task: RM-100b Add `roughjs` annotation renderer**

- Type: Task
- Priority: Medium
- Status: Done
- Parent: RM-100
- Scope:
  - Add SVG-only annotation primitives such as arrows, circles, brackets, highlights, and hand-drawn emphasis.
- Acceptance Criteria:
  - Renderer works inside custom engine/export path. ✅ rough.generator() 纯计算 → React `<path>` 渲染，无 DOM 操作
  - No canvas-only dependency is introduced into the live composition path. ✅ SVG-only（generator 内部 Canvas 仅用于路径计算，不渲染）
- Implementation Notes:
  - `roughjs` installed. AnnotationElement.tsx (~150 lines) with 7 shapes: circle, underline, arrow, box, cross, highlight, bracket.
  - Drawing animation: `pathLength=1` + `strokeDashoffset` driven by spring. Fill uses opacity fade-in.
  - Spring preset: `support` (soft, fluid). Default color: `#ef4444` (red emphasis).
  - 6 files modified + 1 new file. Validate enum 12→13. All 80 tests pass.

**Task: RM-100c Add D3 helper layer for formatting and palettes**

- Type: Task
- Priority: Medium
- Status: Done
- Parent: RM-100
- Scope:
  - Introduce `d3-format` and `d3-scale-chromatic` where they reduce duplicated chart logic.
- Acceptance Criteria:
  - Metric and chart label formatting is standardized. ✅ `formatValue()` (d3-format SI prefix) replaces manual M/K logic in 2 files
  - At least one categorical and one sequential chart palette are sourced from a chart-safe preset. ✅ `schemeTableau10` (categorical, colorblind-friendly) replaces hardcoded 8-color array in 4 files
- Implementation Notes:
  - `d3-format` + `d3-scale-chromatic` installed. chartHelpers.ts (~70 lines): `formatValue`, `formatPercent`, `chartColor`, `CHART_COLORS`.
  - Eliminated: DEFAULT_COLORS ×4 files, formatVal() ×2 files. Single source of truth in chartHelpers.ts.
  - d3-array skipped — statistics computed AI-side, not needed in frontend. All 80 tests pass.

#### Epic: RM-EPIC-03 Deferred Research

**Spike: RM-101 Browser Media Stack Research**

- Type: Spike
- Priority: Low
- Status: To Do
- Goal: Assess whether future browser media tooling can simplify export without violating the single live export path rule.
- Scope:
  - Evaluate MediaBunny/WebCodecs-era tooling as research only.
  - Compare with current FFmpeg.wasm path on complexity, compatibility, and correctness.
- Acceptance Criteria:
  - Output is a written recommendation.
  - No second production export path is merged.

**Spike: RM-102 SVG Morph and Asset Optimization Research**

- Type: Spike
- Priority: Low
- Status: To Do
- Goal: Assess selective SVG enhancements that may improve polish later.
- Scope:
  - Evaluate `flubber` for targeted morph transitions.
  - Evaluate SVGO build integration threshold.
- Acceptance Criteria:
  - Recommendation includes adoption criteria and explicit non-goals.
  - No broad animation framework is introduced.

### Removed / Superseded

| Key | Type | Summary | Reason |
|-----|------|---------|--------|
| RM-old-24 | Task | Scene schema constraints (slide_induction.json) | Superseded by atomic element system |
| RM-old-25 | Task | Add ComparisonScene | Superseded — AI composes freely with atomic elements |
| RM-old-26 | Task | Add TransitionScene | Superseded — crossfade built into ReportComposition |
| RM-old-30 | Task | Template library | Superseded — AI controls theme via elements |
| RM-old-35 | Task | MP4 via MediaRecorder | Superseded — frame-by-frame html-to-image + FFmpeg.wasm |
| RM-old-38 | Task | FFmpeg progress to UI (standalone) | Merged into RM-40 |
| RM-old-39 | Task | WebCodecs GPU encoder (Chrome only) | Rejected — user wants single encoder path for all browsers |
| RM-old-dual | Arch | Dual-track export (WebCodecs + FFmpeg) | Rejected — unnecessary complexity, FFmpeg.wasm-mt sufficient |
| RM-50 | Task | Element self-description schema | Superseded — agent tool `get_element_catalog` replaces this (RM-65) |
| RM-51 | Task | Multi-stage OODAE agent loop (5 turns) | Superseded — OODAE Agent Loop implemented as RM-64 (max 12 iterations) |
| RM-45 | Task | CFML integration test — embed widget in sample .cfm page | Removed — CFML host integration no longer required |
| RM-79 | Task | Adopt Zod runtime schemas | Superseded by RM-90 — self-contained validate.ts achieves same goal without Zod dependency |
| RM-81 | Task | Playwright browser smoke tests | Removed — user does not want Playwright |
| RM-82 | Task | Comlink worker boundary | Removed — FFmpeg.wasm already handles workers internally via Emscripten pthreads. No raw postMessage in codebase. Comlink adds abstraction with zero benefit. |
| RM-53 | Task | Node.js render service (Remotion renderMedia) | Removed — fully frontend architecture, no server dependency |
| RM-76 | Task | @remotion/three 3D 可视化 | Removed — three.js ~600KB bundle + html-to-image 不支持 Canvas/WebGL，3D 内容导出时空白 |
| RM-77 | Task | AI Avatar (HeyGen/D-ID) | Removed — 付费 API + 需要服务器代理，违反 fully frontend 架构 |
| RM-78 | Task | SVG 角色 + TTS 口型同步 | Removed — react-kawaii 嘴巴不可控（固定 mood），需自绘 SVG 才可行，ROI 过低 |
| RM-52 | Task | Persistent JSONL logging | Superseded by RM-87 — metrics.ts IndexedDB 结构化事件日志替代 |
| RM-55 | Task | Production API proxy | Removed — fully frontend，不引入服务器 |

---

## Architecture Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-31 | Pivot from video editor to AI data-video generator | User's real need: prompt-driven report generation, not manual editing |
| 2026-03-31 | Prompt-first / OODAE architecture | Anti-hardcode: AI extracts data from prompt, no pre-structured data required |
| 2026-03-31 | IIFE bundle for CFML embed | Host app is CFML/Lucee — no React on host side |
| 2026-03-31 | Retry with error feedback | PPTAgent pattern: parse failure → send error back to AI → retry |
| 2026-03-31 | Atomic element system (agentic harness) | AI-First: replace fixed scene templates with composable elements. AI designs every frame. Harness only renders. |
| 2026-03-31 | 1+1 Evaluate must be synchronous | User sees only validated output. 5s extra latency acceptable. |
| 2026-03-31 | Frame-by-frame export (html-to-image + FFmpeg.wasm) | getDisplayMedia requires permission dialog — rejected. Canvas captureStream fails on DOM-rendered Remotion. Frame capture is zero-permission. |
| 2026-03-31 | Simplify prompt must pair with Evaluate | Freedom without governance = chaos. Goose pattern. |
| 2026-03-31 | Gemini TTS for video narration | User confirmed paid API key. Model: gemini-2.5-flash-preview-tts. 60+ languages including Chinese. |
| 2026-03-31 | FFmpeg.wasm multi-thread for all browsers (no WebCodecs) | WASM single-thread too slow (~13 min for 30s video). Multi-thread uses SharedArrayBuffer + Workers for 2-4x speedup. COOP/COEP already configured. |
| 2026-03-31 | D3.js modular adoption for chart elements (RM-47) | d3-shape/d3-scale/d3-sankey for SVG path calculation. Remotion interpolate() handles animation. D3 = math only, not rendering. |
| 2026-03-31 | Animation upgrade strategy: 3 layers | Layer 1: spring() + transitions + noise (零安装). Layer 2: react-kawaii + lottie + chroma-js (视觉丰富). Layer 3: @remotion/three + AI avatar (高级). |
| 2026-03-31 | No CSS animation libraries (animate.css, framer-motion, GSAP) | Remotion 用帧驱动 (useCurrentFrame)，CSS animation 用时间驱动。html-to-image 逐帧截图时 CSS 动画状态不可控。 |
| 2026-03-31 | OODAE Agent Loop with function calling (RM-64) | Single-shot prompt produces boring videos. Agent loop lets AI: observe data → orient insights → decide storyboard → act (produce script). Google Search grounding for context. Max 10 iterations, AI-first (no hardcoded call order). Legacy single-shot as fallback. |
| 2026-03-31 | FFmpeg.wasm multi-thread: UMD from public/ (RM-38) | Vite dev server transforms JS files → adds static `import` statements → breaks classic pthread workers (emscripten). Fix: serve `@ffmpeg/core-mt` UMD build from `public/ffmpeg-mt/` (Vite serves public/ as-is). UMD uses `importScripts()` (classic worker native). Runtime detection: `SharedArrayBuffer` + `crossOriginIsolated`. Auto-fallback to single-thread if MT load fails. |
| 2026-03-31 | Deep audit RM-86: D3 useMemo for all chart elements | D3 layout (sankey, pie, scales) was recalculated 30×/sec. Wrapped in useMemo — compute once, animate with spring(). |
| 2026-03-31 | Deep audit RM-86: Concurrency guards via useRef | `isGeneratingRef` + `isExportingRef` prevent double-click race conditions. Button disabled state alone is insufficient due to React state batching. |
| 2026-03-31 | Deep audit RM-86: Non-fatal pattern for TTS + Evaluate | TTS/Evaluate failures are caught and logged but never block video output. Video always works — audio and quality checks are additive. |
| 2026-03-31 | Deep audit RM-86: MIN_SCENE_FRAMES = 30 > TRANSITION_FRAMES = 20 | parseScript enforces minimum scene duration to prevent transition overlap rendering glitch. |
| 2026-03-31 | ClassifiedError system (RM-87a) | Production-grade error classification: ErrorCode enum, user-friendly messages, logError/logWarn, classifyHttpStatus. Foundation for observability pipeline. |
| 2026-03-31 | Cache TTL + stripRuntimeData | IndexedDB cache auto-expires after 7 days. Blob URLs stripped before save AND after load. clearCache() and deleteDatabase() for admin control. |
| 2026-03-31 | Chart responsive SVG (RM-89) | Fixed-pixel chart SVGs (280-760px) replaced with viewBox + width:100%. Charts auto-scale to container. GenericScene column layout adds alignItems:stretch. All element font sizes scaled up for 1080p video readability. AI prompt includes "Scene Layout Rules" section. |
| 2026-03-31 | Entrance animation system (RM-75) | computeEntranceStyle() pure function in useStagger.ts. 9 animation types (fade, slide-up, slide-left, slide-right, zoom, bounce, rubber-band, scale-rotate, flip). All driven by spring() progress value. Text, metric, list, callout elements support animation prop. AI chooses per-element. |
| 2026-03-31 | Unified runtime schema — validate.ts not Zod (RM-90 supersedes RM-79) | Self-contained validate.ts with zero deps. Canonical enums (VALID_ELEMENT_TYPES, VALID_LAYOUTS, VALID_TRANSITIONS, VALID_ANIMATIONS, VALID_STAGGER_SPEEDS, VALID_THEME_STYLES), range constraints (CONSTRAINTS), and structural validators (validateVideoScript, validateSettings). Returns {ok, data, errors, warnings} — callers decide behavior. parseScript.ts is now a thin wrapper. Cache load validates before returning. Settings load/save validated with safe fallback. useStagger derives types from validate.ts. Zod rejected: adds ~13KB bundle for what 230 lines of typed code achieves. |
| 2026-03-31 | Chart container entrance animation (RM-91) | All 4 chart elements (bar/pie/line/sankey) now support container-level entrance via computeEntranceStyle(). Default "zoom" (not "fade") for charts. parseAnimation() accepts optional fallback param. Prompt + elementCatalog recommend zoom/bounce. Container animates in, then internal animations play on top. |
| 2026-03-31 | TTS parallel generation (RM-92) | Serial for-loop replaced with runPool() concurrency=3 pool. 3 workers pull from shared index — at most 3 API calls in flight. 429 retry: single attempt after 1.5s delay. Progress callback fires per-completion (atomic counter). Zero new deps (~25 lines). Estimated 3-5x speedup (10-16s → 3-5s for 5-8 scenes). |
| 2026-03-31 | Fully frontend — no Node.js server (RM-53 removed) | User requires 100% browser-side architecture. No server-side rendering (Remotion renderMedia), no API proxy, no backend processing. All export via FFmpeg.wasm in-browser. |
| 2026-03-31 | Comlink rejected (RM-82 removed) | Deep analysis: FFmpeg.wasm already uses Emscripten pthreads internally. Zero raw postMessage in codebase. Frame capture blocked by DOM/html-to-image (not movable to Worker). OffscreenCanvas not applicable (requires Canvas API, not DOM/SVG). Comlink adds abstraction layer with no concrete benefit. |
| 2026-04-01 | Custom video context: dual-context frame remapping (RM-111) | Remotion TransitionSeries.Sequence remaps useCurrentFrame() to scene-local frames. Custom design: FrameContext (nestable, scene remap via FrameProvider) + VideoConfigContext (global, immutable). VideoProvider is controlled component — parent owns frame state, context only distributes. This enables both rAF-driven preview and seekTo-driven export to share the same composition tree. |
| 2026-04-01 | VideoPlayer/VideoSurface split (RM-113) | Preview and export need different player behavior. VideoPlayer: rAF loop + controls + responsive scaling + keyboard. VideoSurface: headless, seekTo-only, fixed resolution. Both share PlayerHandle interface (pause/play/seekTo/getCurrentFrame). This replaces the Remotion pattern of two <Player> instances (controls=true vs controls=false) with purpose-built components. |
| 2026-04-01 | Added @testing-library/react + jsdom devDependency | Required for testing React component hooks (VideoContext, VideoPlayer). Vitest config extended: include test/**/*.test.{ts,tsx}. jsdom selected per-file via `// @vitest-environment jsdom` comment to avoid affecting pure-node tests. |
| 2026-04-01 | Batch import migration — zero Remotion imports in src/ (RM-116) | 12 files, 19 import lines migrated in one pass. All elements, useStagger, NoiseBackground, GenericScene: pure import-path swap (remotion → VideoContext/animation/AbsoluteFill). ReportComposition rewritten: TransitionSeries → SceneRenderer + FrameProvider. TTS audio: HTML5 `<audio>` placeholder pending RM-115 AudioTrack. Confirms API compatibility of all custom modules — zero behavioral regressions. |
| 2026-03-31 | Remove Remotion — build custom video engine (RM-EPIC-04) | Remotion dual-license requires paid Company License for 4+ person teams. Project only uses ~10% of Remotion (spring, interpolate, Player, TransitionSeries, Audio, noise). Export pipeline already self-built (html-to-image + FFmpeg.wasm). Building custom replacements: ~450 lines new code, eliminates ~44MB bundle weight from Remotion packages, zero license risk, full control over animation/rendering. Execution: animation.ts (done) → VideoContext → AbsoluteFill → SceneRenderer → AudioTrack → VideoPlayer → batch import update → remove packages. |
| 2026-03-31 | CSS domain split (RM-95) | Single 862-line styles.css split into 9 domain files under src/styles/ (tokens, base, header, forms, settings, export, templates, panel, responsive). styles.css becomes @import hub (14 lines). Vite resolves @import natively. Each file < 180 lines, single responsibility. No runtime cost — CSS is bundled at build time. |
| 2026-03-31 | HistoryPanel CSS + layout fixes (RM-94, RM-96) | HistoryPanel had 16 undefined CSS classes (panel overlay, tabs, history list, btn-sm, btn-danger). backdrop-filter removed (GPU pressure). PromptTemplates moved above Player. History button H→↻. Mobile bottom-sheet for both Settings and History panels. |
| 2026-03-31 | PPT export — dual-format output from single VideoScript (RM-103) | pptxgenjs (~795KB) generates .pptx entirely in-browser. Same VideoScript drives both MP4 (custom engine+FFmpeg) and PPTX (pptxgenjs). Element mapping: text→addText, metric→multi addText, bar/pie/line→native addChart (editable in PowerPoint!), sankey→addTable (no native support), list→addText with bullets, callout→addShape+addText, divider→addShape(rect). kawaii→caption text only, lottie→skipped. Narration→slide speaker notes. Layout engine calculates x/y/w/h from scene.layout (column/row/center). Font sizes scaled ×0.6 (video 1080p→PPT 10"). Zero AI pipeline changes. |
| 2026-04-01 | AbsoluteFill.tsx — minimal drop-in (RM-114) | 27 lines. Remotion's AbsoluteFill has ~100 lines of Tailwind className detection — skipped entirely (project does not use Tailwind). Only `style` + `children` props needed (verified: 2 usage sites in GenericScene + ReportComposition). `forwardRef` deferred — not needed until RM-113 (VideoPlayer) or RM-119 (export frame capture). |
| 2026-04-01 | SceneRenderer — pure CSS scene transitions (RM-112) | Replaces Remotion TransitionSeries. 4 transition effects via inline CSS: fade (opacity), slide (translateX), wipe (clip-path inset), clock-wipe (clip-path polygon 24-point arc). Framework-agnostic design: accepts `frame` prop + `renderScene` callback — no context dependency. Overlap compression via `computeEffectiveStarts()`. Exiting scene uses entering scene's transition type (Remotion convention). 37 tests. |
| 2026-04-01 | Batch import migration — zero Remotion in src/ (RM-116) | 12 files, 19 import lines. 8 elements + useStagger + NoiseBackground + GenericScene: pure path swap. ReportComposition rewritten: TransitionSeries → SceneRenderer + FrameProvider. All custom modules confirmed API-compatible — zero behavioral regressions. 167 tests pass. |
| 2026-04-01 | TTS IndexedDB persistence (RM-121) | WAV blobs persisted via ttsCache.ts. DB v3→v4 adds `ttsAudio` object store. Save: fetch blob URL → store Blob. Load: read Blob → createObjectURL. Key format: `cache:sceneId` / `history-{id}:sceneId`. Cleanup on cache expire / history delete. `onblocked` + `onversionchange` handlers for reliable DB upgrades during HMR. |
| 2026-04-01 | VideoPlayer fullscreen + layout fix | Composition div changed to position:absolute (was in normal flow causing 1080px DOM height + 540px spacer = 1620px container). Fullscreen: browser Fullscreen API + `f` key shortcut + responsive fit (min width/height). |
| 2026-04-01 | Phase 4 roadmap — end-user perspective deep dive | Codebase review from end-user POV for 10K business users. Key gaps identified: (1) frameStep=3 choppy animation, (2) CRF=28 text blur, (3) single TTS voice, (4) no image/logo embed, (5) no post-gen editing, (6) PPTX missing 6/15 elements. Three phases: 4A video quality (RM-121~124), 4B UX/media (RM-125~128), 4C enterprise (RM-129~132). Priority: quality first (biggest user perception impact), then editing, then scale. |
| 2026-04-01 | AudioTrack integrated into ReportComposition (RM-115) | Bare `<audio>` placeholder replaced with `<AudioTrack src={ttsAudioUrl}>`. Play/pause synced via usePlaying(), frame-to-time drift correction (>0.3s threshold), volume clamp 0-1, auto-pause on unmount. 12/12 Remotion features now fully replaced. |
| 2026-04-01 | Remotion packages removed from package.json (RM-118) | 5 packages removed: remotion, @remotion/lottie, @remotion/noise, @remotion/player, @remotion/transitions. npm pruned 8 packages. Zero Remotion deps in project. Build OK, 167 tests pass. |
| 2026-04-01 | RM-EPIC-04 complete — all docs updated (RM-120) | 7 doc files updated: AGENTS.md, task.md, docs/architecture.md, render-flow.md, project-structure.md, template-contracts.md, cfml-integration.md. Zero active Remotion references in docs. Architecture Decisions Log historical entries preserved. |
| 2026-04-01 | Export error alert auto-clear (RM-97a) | Bug: exportProgress stuck in error state forever — alert never dismissed. Fix: useExport finally adds setTimeout(onProgress(null), 5000) for auto-clear. Error alert gets ✕ dismiss button for immediate close. 3 new tests verify error/success cleanup + showStage always reset. |

---

## OODAE Agent Architecture

```
┌──────────────────────────────────────────────┐
│              OODAE Agent Loop                │
│              (max 10 iterations)             │
│                                              │
│  ┌─ Observe ─┐  ┌─ Orient ──┐               │
│  │analyze_data│  │Google     │               │
│  │            │  │Search     │               │
│  └────────────┘  └───────────┘               │
│                                              │
│  ┌─ Decide ──────────────────┐               │
│  │draft_storyboard           │               │
│  │get_element_catalog        │               │
│  │generate_palette           │               │
│  └───────────────────────────┘               │
│                                              │
│  ┌─ Act ─────────────────────┐               │
│  │produce_script → TERMINATES│               │
│  └───────────────────────────┘               │
│                                              │
│  AI decides tool order + iteration count.    │
│  No hardcoded sequence.                      │
└──────────────┬───────────────────────────────┘
               │ VideoScript JSON
┌──────────────▼───────────────────────────────┐
│           Evaluate (1+1 self-check)          │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│         Harness (React/Custom Engine)        │
│                                              │
│  Renders: GenericScene + 15 atomic elements  │
│  (text, metric, bar-chart, pie-chart,        │
│   line-chart, sankey, list, divider,         │
│   callout, kawaii, lottie, icon,             │
│   annotation, svg, map)                      │
│                                              │
│  Audio: Gemini TTS → AudioTrack              │
│  Export: html-to-image → FFmpeg.wasm         │
│  Validates: parseScript + retry              │
└──────────────────────────────────────────────┘
```

**Principle: AI decides. Harness executes. JSON is the contract.**

### Agent Tools

| Tool | OODAE Phase | Purpose |
|------|-------------|---------|
| `analyze_data` | Observe | Compute stats, rankings, percentages, trends from user data |
| Google Search | Orient | Search web for industry context, company info, benchmarks |
| `draft_storyboard` | Decide | Write story arc, scene plan, color mood, pacing notes |
| `get_element_catalog` | Decide | Discover available visual elements and their schemas |
| `generate_palette` | Decide | Generate harmonious color palette from hex or mood keyword |
| `produce_script` | Act | Output final VideoScript JSON — terminates the loop |

### Fallback Strategy

If agent loop fails (tool errors, API issues), system falls back to legacy single-shot generation (prompt → JSON → parse). This ensures the app always produces output.

---

## Export Architecture (FFmpeg.wasm Multi-Thread)

```
html-to-image (frame capture, every 3rd frame)
        ↓
PNG data URLs → FFmpeg.wasm writeFile
        ↓
@ffmpeg/core-mt (multi-thread, SharedArrayBuffer)
  libx264 -preset ultrafast -threads auto
        ↓
MP4 file (H.264 + AAC audio) → download
```

| | Single-thread (fallback) | Multi-thread (primary) |
|--|---|---|
| Package | `@ffmpeg/core` (ESM from node_modules) | `@ffmpeg/core-mt` (UMD from `public/ffmpeg-mt/`) |
| CPU cores | 1 (`-threads 1`) | `Math.min(hardwareConcurrency, 4)` |
| Speed (30s video) | ~13 min | ~3-5 min (est. 2-4x faster) |
| Headers | None | COOP/COEP (Vite dev: configured; CFML host: must set) |
| Browser | All | Chrome 92+, Firefox 79+, Edge 92+ |
| Detection | — | `SharedArrayBuffer` + `crossOriginIsolated` |
| Fallback | — | Auto: if MT load fails → single-thread (user invisible) |

**Why UMD from public/?** Vite dev server transforms JS files through its ESM pipeline, adding static `import` statements. Emscripten's pthread workers are classic workers — they can't use `import`. UMD build uses `importScripts()` (classic worker native). Files in `public/` are served as-is without Vite transformation.

---

## TTS Integration (Implemented)

```
Prompt → Agent Loop (OODAE) → VideoScript (with narration per scene)
       → Gemini TTS (each narration → PCM audio → WAV)
       → AudioTrack (HTML5 audio synced with scenes via frame engine)
       → Scene timing adjusted to match audio length (TTS-first)
       → FFmpeg.wasm (mux video + audio → MP4 with AAC)
```

---

## Visual Enhancement Roadmap

```
Layer 1 (RM-68~71) — 立即提升 ✅ ALL DONE
├── spring() 弹性动画 (custom animation.ts) ✅
├── SceneRenderer CSS transitions (slide/wipe/clock-wipe) ✅
├── noise2D/3D (custom animation.ts Perlin 动态背景) ✅
└── Stagger choreography (useStagger hook) ✅

Layer 2 (RM-72~75) — 视觉丰富 ✅ ALL DONE
├── react-kawaii (可爱角色引导) ✅
├── lottie-web direct (动态图标预设) ✅
├── chroma-js (智能配色) ✅
└── 更多 entrance animation (9 种) ✅

Layer 3 (RM-76~78) — ALL REMOVED
├── ~~3D 可视化~~ Removed — html-to-image 不支持 Canvas/WebGL
├── ~~AI Avatar (HeyGen/D-ID)~~ Removed — 付费 API + 需服务器代理
└── ~~SVG 角色 + TTS 口型同步~~ Removed — ROI 过低
```

### 兼容性约束
- 必须帧驱动 (useCurrentFrame from VideoContext) — CSS animation 不可用
- 必须纯 DOM/SVG — html-to-image 不支持 Canvas
- lottie-web 使用 goToAndStop(frame, true) 实现帧同步
