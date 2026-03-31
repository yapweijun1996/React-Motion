# React-Motion Task Board

## Epic: RM — AI Data-to-Video Report Generator (Agentic Harness)

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
| RM-18 | Task | Rewrite AGENTS.md — pivot from video editor to AI data-video generator | Done |
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

### In Progress / Testing

| Key | Type | Summary | Status | Notes |
|-----|------|---------|--------|-------|
| RM-37 | Bug | MP4 export speed — FFmpeg.wasm single-thread extremely slow (~1%/8s) | Testing | Need: `-preset ultrafast`, `-crf 28`, `-tune stillimage`, frameStep=3. Pipe FFmpeg progress to UI. |

### To Do — Priority 1 (Next Sprint: Export Speed + TTS)

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-38 | Task | FFmpeg.wasm multi-thread — switch to `@ffmpeg/core-mt` for all browsers | High | Install `@ffmpeg/core-mt`, load with `coreURL`/`wasmURL`/`workerURL`. COOP/COEP already configured. ~2-4x faster. |
| RM-39 | Task | FFmpeg `-threads` auto-detect — use `navigator.hardwareConcurrency` | High | Part of RM-38. Pass `-threads N` to libx264 for multi-core encoding. |
| RM-40 | Task | FFmpeg progress → UI — pipe encoding percent to end user | High | Currently only in console.log, user sees stuck "Encoding..." |
| RM-41 | Task | Optimize FFmpeg settings — `-preset ultrafast -crf 28 -tune stillimage` | High | Faster encoding at acceptable quality trade-off for presentation video. |
| RM-42 | Task | TTS integration — Gemini 2.5 Flash TTS for scene narration | High | API: `gemini-2.5-flash-preview-tts`, paid tier confirmed. Output PCM→WAV. |
| RM-43 | Task | Remotion `<Audio>` integration — sync TTS audio with scenes | High | Depends on RM-42. Scene duration adjusted to match audio length (Option A). |
| RM-44 | Task | Export MP4 with audio track — FFmpeg.wasm mux video + audio | High | Depends on RM-43. |
| RM-45 | Task | CFML integration test — embed widget in sample .cfm page | High | Validate mount API + script tag + COOP/COEP headers in real host. |

### To Do — Priority 2 (Enhancement)

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-47 | Task | Add more atomic elements: pie-chart, table, image, progress-bar | Medium | Expand AI's rendering toolkit |
| RM-48 | Task | Language-aware scene duration — CJK text needs longer read time | Medium | PPTAgent pattern: CJK ×1.5 duration |
| RM-49 | Task | Loading animation during AI generation | Medium | UX: skeleton or progress indicator |
| RM-50 | Task | Element self-description schema — let AI query available elements | Medium | Agentic harness: agent discovers tools |
| RM-51 | Task | Multi-stage OODAE agent loop (5 turns) | Medium | Only if 1+1 Evaluate proves insufficient |
| RM-52 | Task | Persistent JSONL logging for debug and cost tracking | Low | PPTAgent pattern |

### To Do — Priority 3 (Post-MVP)

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-53 | Task | Node.js render service — high-quality MP4 via Remotion renderMedia() | Low | Upgrade path when browser encoding is insufficient |
| RM-54 | Task | Prompt history — recall and re-generate previous reports | Low | LocalStorage or CFML-managed |
| RM-55 | Task | Production API proxy — move Gemini key to server-side | Low | Security: don't expose API key in bundle |
| RM-56 | Task | Reduce bundle size — analyze and tree-shake Remotion deps | Low | Current: 677KB / 210KB gzip |
| RM-57 | Task | Multi-provider AI support — Claude, GPT as alternatives to Gemini | Low | Provider abstraction layer |
| RM-58 | Task | Multi-speaker TTS — different voices for different scenes | Low | Gemini TTS supports 2 speakers |

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
| 2026-03-31 | Gemini TTS for video narration (planned) | User confirmed paid API key. Model: gemini-2.5-flash-preview-tts. 60+ languages including Chinese. |
| 2026-03-31 | FFmpeg.wasm multi-thread for all browsers (no WebCodecs) | WASM single-thread too slow (~13 min for 30s video). Multi-thread uses SharedArrayBuffer + Workers for 2-4x speedup. COOP/COEP already configured. Simpler than dual-track — one encoder path for all browsers. |

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
MP4 file (H.264) → download
```

| | Single-thread (current) | Multi-thread (target) |
|--|---|---|
| Package | `@ffmpeg/core` (default) | `@ffmpeg/core-mt` |
| CPU cores | 1 | `navigator.hardwareConcurrency` (4-8) |
| Speed (30s video) | ~13 min | ~3-5 min (est. 2-4x faster) |
| Headers | None | COOP/COEP (already configured) |
| Browser | All | Chrome 92+, Firefox 79+, Edge 92+ |

---

## TTS Integration Plan

```
Current pipeline:
  Prompt → Gemini (VideoScript with narration text per scene)
         → Remotion (render visual scenes)
         → FFmpeg.wasm (encode MP4)

With TTS:
  Prompt → Gemini (VideoScript with narration text per scene)
         → Gemini TTS (each narration → PCM audio)
         → FFmpeg.wasm (PCM → WAV per scene)
         → Remotion (<Audio> components synced with scenes)
         → FFmpeg.wasm (mux video + audio → MP4)
```

Key challenge: Scene duration must match audio length. Options:
- A. Generate TTS first, then adjust scene durationInFrames to fit audio
- B. Generate script with fixed durations, trim/pad audio to fit

Option A is more natural — let the narration pace drive the video timing.

---

## Agentic Harness Architecture

```
┌─────────────────────────────────────┐
│            AI Agent (Gemini)        │
│                                     │
│  OODAE: Observe → Orient → Decide  │
│         → Act → Evaluate           │
│                                     │
│  Decides: story, design, layout,   │
│  colors, emphasis, data highlights  │
│  + narration text (→ TTS)          │
└──────────────┬──────────────────────┘
               │ VideoScript JSON
               │ (scenes + elements + narration)
┌──────────────▼──────────────────────┐
│         Harness (React/Remotion)    │
│                                     │
│  Renders: GenericScene + 6 atomic  │
│  elements (text, metric, bar-chart,│
│  list, divider, callout)           │
│                                     │
│  Audio: Gemini TTS → <Audio>       │
│  Export: html-to-image → FFmpeg    │
│  Validates: parseScript + retry    │
└─────────────────────────────────────┘
```

**Principle: AI decides. Harness executes. JSON is the contract.**
