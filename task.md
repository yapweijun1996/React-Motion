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

### In Progress / Testing

| Key | Type | Summary | Status | Notes |
|-----|------|---------|--------|-------|
| RM-38 | Task | FFmpeg.wasm multi-thread — `@ffmpeg/core-mt` UMD from `public/ffmpeg-mt/` | Testing | Runtime detection (SharedArrayBuffer + crossOriginIsolated). Auto-fallback to single-thread. UMD bypasses Vite ESM transformation. |

### To Do — Remaining

**Visual Enhancement Layer 1 & 2: ✅ ALL DONE** (RM-68~75: spring, transitions, noise, stagger, kawaii, lottie, chroma-js, 9 entrance animations)

**Maintenance**

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-83 | Task | Migrate IndexedDB cache layer to `idb` promise wrapper | Low | 当前 db.ts 手写 IDB 正常工作。简化语法但不解决实际问题。 |
| RM-84 | Task | Evaluate `vite-plugin-pwa` to replace hand-managed manifest/service worker wiring | Low | 当前 SW 正常运行，迁移风险 > 收益。 |

### To Do — Priority 3 (Post-MVP)

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-56 | Task | Reduce bundle size — analyze and tree-shake Remotion deps | Low | Current: ~44MB IIFE (Remotion+React+D3). Consider lazy-load or code-split. |
| RM-57 | Task | Multi-provider AI support — Claude, GPT as alternatives to Gemini | Low | Provider abstraction layer |
| RM-58 | Task | Multi-speaker TTS — different voices for different scenes | Low | Gemini TTS supports 2 speakers |
| RM-85 | Task | Evaluate MediaBunny/WebCodecs-era browser media pipeline for future export simplification | Low | Research-only. Do not introduce a second live export path during MVP. |

### Milestone Status

**Production Hardening — 5/7 complete:**
- ✅ Unified runtime schema (RM-90 validate.ts)
- ✅ Unit tests (RM-80: 80 tests, 4 files)
- ✅ Observability (RM-87 metrics.ts — generation/export/tts/error events)
- ✅ Export UI responsiveness (RM-91 yield)
- ✅ CJK language-aware timing (RM-48)
- ⬜ Export failure clears progress state and stays user-visible (RM-97)
- ⬜ FFmpeg multi-thread validated in production-like conditions (RM-38)

### JIRA Backlog Format

#### Epic: RM-EPIC-01 Production Hardening

**Story: RM-97 Export Reliability and Recovery**

- Type: Story
- Priority: Highest
- Status: To Do
- Goal: Make MP4 export reliable under success, fallback, and failure conditions without leaving the UI in a broken state.
- Dependencies: RM-38
- Acceptance Criteria:
  - Export failure always clears loading/progress UI.
  - Single-thread fallback works when multi-thread initialization fails.
  - Silent output, audio mux failure, and capture failure are distinguishable in logs.
  - Preview/export parity is spot-checked against the same `VideoScript`.

**Task: RM-97a Add export failure-path verification**

- Type: Task
- Priority: High
- Status: To Do
- Parent: RM-97
- Scope:
  - Verify `capturing`, `writing`, `encoding`, and `muxing` failure paths.
  - Confirm `showExportStage` and progress state are always reset.
- Acceptance Criteria:
  - Each export stage has an explicit failure test case.
  - No stuck overlay remains after any simulated export failure.

**Task: RM-97b Add FFmpeg multi-thread downgrade validation**

- Type: Task
- Priority: High
- Status: To Do
- Parent: RM-97
- Scope:
  - Force `SharedArrayBuffer` / `crossOriginIsolated` negative cases.
  - Validate downgrade to single-thread export path.
- Acceptance Criteria:
  - Logs clearly indicate downgrade reason.
  - Export still completes in fallback mode.

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
  - Study scenes can render instructional annotation graphics without leaving the SVG/Remotion model. ✅ RM-100b: 7 roughjs hand-drawn shapes
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
  - Renderer works inside Remotion/export path. ✅ rough.generator() 纯计算 → React `<path>` 渲染，无 DOM 操作
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
| 2026-03-31 | CSS domain split (RM-95) | Single 862-line styles.css split into 9 domain files under src/styles/ (tokens, base, header, forms, settings, export, templates, panel, responsive). styles.css becomes @import hub (14 lines). Vite resolves @import natively. Each file < 180 lines, single responsibility. No runtime cost — CSS is bundled at build time. |
| 2026-03-31 | HistoryPanel CSS + layout fixes (RM-94, RM-96) | HistoryPanel had 16 undefined CSS classes (panel overlay, tabs, history list, btn-sm, btn-danger). backdrop-filter removed (GPU pressure). PromptTemplates moved above Player. History button H→↻. Mobile bottom-sheet for both Settings and History panels. |
| 2026-03-31 | PPT export — dual-format output from single VideoScript (RM-103) | pptxgenjs (~795KB) generates .pptx entirely in-browser. Same VideoScript drives both MP4 (Remotion+FFmpeg) and PPTX (pptxgenjs). Element mapping: text→addText, metric→multi addText, bar/pie/line→native addChart (editable in PowerPoint!), sankey→addTable (no native support), list→addText with bullets, callout→addShape+addText, divider→addShape(rect). kawaii→caption text only, lottie→skipped. Narration→slide speaker notes. Layout engine calculates x/y/w/h from scene.layout (column/row/center). Font sizes scaled ×0.6 (video 1080p→PPT 10"). Zero AI pipeline changes. |

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
│         Harness (React/Remotion)             │
│                                              │
│  Renders: GenericScene + 11 atomic elements  │
│  (text, metric, bar-chart, pie-chart,        │
│   line-chart, sankey, list, divider,         │
│   callout, kawaii, lottie)                    │
│                                              │
│  Audio: Gemini TTS → <Audio>                 │
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
       → Remotion (<Audio> components synced with scenes)
       → Scene timing adjusted to match audio length (TTS-first)
       → FFmpeg.wasm (mux video + audio → MP4 with AAC)
```

---

## Visual Enhancement Roadmap

```
Layer 1 (RM-68~71) — 立即提升 ✅ ALL DONE
├── spring() 弹性动画 ✅
├── @remotion/transitions (slide/wipe/clock-wipe) ✅
├── @remotion/noise (Perlin 动态背景) ✅
└── Stagger choreography (useStagger hook) ✅

Layer 2 (RM-72~75) — 视觉丰富 ✅ ALL DONE
├── react-kawaii (可爱角色引导) ✅
├── @remotion/lottie (动态图标预设) ✅
├── chroma-js (智能配色) ✅
└── 更多 entrance animation (9 种) ✅

Layer 3 (RM-76~78) — 高级功能
├── @remotion/three (3D 可视化)
├── AI Avatar (HeyGen/D-ID)
└── SVG 角色 + TTS 口型同步
```

### 兼容性约束
- 必须帧驱动 (useCurrentFrame) — CSS animation 不可用
- 必须纯 DOM/SVG — html-to-image 不支持 Canvas
- @remotion/three 例外 — 官方包有特殊帧同步处理
- @remotion/lottie 例外 — 官方包将 Lottie 帧同步到 Remotion
