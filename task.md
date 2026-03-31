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

### In Progress

| Key | Type | Summary | Status | Notes |
|-----|------|---------|--------|-------|

### To Do — Priority 1 (Next Sprint)

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-33 | Task | Simplify prompt — remove prescriptive design rules, keep tool descriptions + goal only | High | Agentic harness: AI decides design, harness renders. Must pair with RM-34. |
| RM-34 | Task | 1+1 Evaluate — synchronous AI self-check after generation (data accuracy + quality) | High | Goose pattern: validate output, reject + retry if issues. Adds ~5s latency. |
| RM-35 | Task | MP4 export — browser-based MediaRecorder capture from Remotion Player | High | MVP approach: WebM output, no Node.js needed. Upgrade to server-side later. |
| RM-36 | Task | CFML integration test — embed widget in sample .cfm page | High | Validate mount API + script tag loading in real host. |

### To Do — Priority 2 (Enhancement)

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-37 | Task | Add more atomic elements: pie-chart, table, image, progress-bar | Medium | Expand AI's rendering toolkit |
| RM-38 | Task | Language-aware scene duration — CJK text needs longer read time | Medium | PPTAgent pattern: CJK ×1.5 duration |
| RM-39 | Task | Loading animation during AI generation | Medium | UX improvement: skeleton or progress indicator |
| RM-40 | Task | Element self-description schema — let AI query available elements | Medium | Agentic harness: agent discovers tools |
| RM-41 | Task | Multi-stage OODAE agent loop (5 turns) | Medium | Only if 1+1 Evaluate proves insufficient |
| RM-42 | Task | Persistent JSONL logging for debug and cost tracking | Low | PPTAgent pattern |

### To Do — Priority 3 (Post-MVP)

| Key | Type | Summary | Priority | Notes |
|-----|------|---------|----------|-------|
| RM-43 | Task | Node.js render service — high-quality MP4 export via Remotion renderMedia() | Low | Upgrade from browser MediaRecorder |
| RM-44 | Task | Prompt history — recall and re-generate previous reports | Low | LocalStorage or CFML-managed |
| RM-45 | Task | Production API proxy — move Gemini key to server-side | Low | Security: don't expose API key in bundle |
| RM-46 | Task | Reduce bundle size — analyze and tree-shake Remotion deps | Low | Current: 654KB / 202KB gzip |
| RM-47 | Task | Multi-provider AI support — Claude, GPT as alternatives to Gemini | Low | Provider abstraction layer |

### Removed / Superseded

| Key | Type | Summary | Reason |
|-----|------|---------|--------|
| RM-old-24 | Task | Scene schema constraints (slide_induction.json) | Superseded by atomic element system — AI composes freely |
| RM-old-25 | Task | Add ComparisonScene | Superseded — AI can compose any layout with atomic elements |
| RM-old-26 | Task | Add TransitionScene | Superseded — crossfade built into ReportComposition |
| RM-old-30 | Task | Template library (corporate/modern/minimal) | Superseded — AI controls theme via elements, no fixed templates |

---

## Architecture Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-31 | Pivot from video editor to AI data-video generator | User's real need: prompt-driven report generation, not manual editing |
| 2026-03-31 | Prompt-first / OODAE architecture | Anti-hardcode: AI extracts data from prompt, no pre-structured data required |
| 2026-03-31 | IIFE bundle for CFML embed | Host app is CFML/Lucee — no React on host side |
| 2026-03-31 | Retry with error feedback | PPTAgent pattern: parse failure → send error back to AI → retry |
| 2026-03-31 | Atomic element system (agentic harness) | AI-First: replace fixed scene templates with composable elements. AI designs every frame. Harness only renders. |
| 2026-03-31 | 1+1 Evaluate must be synchronous | User sees only validated output. 5s extra latency is acceptable vs showing unverified content. |
| 2026-03-31 | MP4 export via browser MediaRecorder for MVP | No Node.js infrastructure needed. WebM output acceptable for MVP. Server-side upgrade later. |
| 2026-03-31 | Simplify prompt must pair with Evaluate | Freedom without governance = chaos. Goose pattern: agent has autonomy, harness validates output. |

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
└──────────────┬──────────────────────┘
               │ VideoScript JSON
               │ (scenes + elements)
┌──────────────▼──────────────────────┐
│         Harness (React/Remotion)    │
│                                     │
│  Renders: GenericScene + 6 atomic  │
│  elements (text, metric, bar-chart,│
│  list, divider, callout)           │
│                                     │
│  Validates: parseScript + retry    │
│  Governs: type checking, animation │
│  safety, performance               │
└─────────────────────────────────────┘
```

**Principle: AI decides. Harness executes. JSON is the contract.**
