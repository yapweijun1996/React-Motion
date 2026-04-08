# AI Pipeline — OODAE Agent Loop

## Overview

The AI pipeline uses the OODAE pattern (Observe → Orient → Decide → Act → Evaluate) implemented as a multi-turn agent loop with Gemini function calling. The AI agent decides its own workflow — no hardcoded call sequence.

## Pipeline Stages (6 stages)

```
generateScript.ts orchestrates:
  Agent Loop → Evaluate → SVG Gen → TTS → BGM → Image Gen
  (26%)        (0%)       (8%)     (43%)  (12%)  (11%)
```

### Stage 1: Agent Loop (`agentLoop.ts`)

The agent loop runs up to **12 iterations** (single-agent) or **9+4** (multi-agent: 4 storyboard + 9 director + retries). Each iteration:

1. Send conversation + tool definitions to Gemini
2. Gemini returns text, function calls, or both
3. If function call → execute tool → send result back → continue
4. If `produce_script` called → extract VideoScript → **terminate loop**

**Multi-agent mode** (default): Storyboard Agent (Flash Lite) → Visual Director Agent (Pro) → Quality Reviewer (Flash Lite). Each agent has its own tool set and system prompt.

The AI may use fewer or more iterations. It may skip tools or call them multiple times.

### Stage 2: Evaluate (inside agent loop)

Quality checks now run inside the agent loop (RM-155):
- **Deterministic gates** (`agentHooks.ts`): data accuracy, SVG complexity, element variety, layout conformance
- **AI reviewer** (`evaluate.ts`): narration↔visual sync, "So What?" test, hook quality
- Issues trigger retry within the same agent loop (max 2 retries)

### Stage 3: SVG Post-Generation (`svgGen.ts`) — RM-197

SVG diagrams are generated in a **separate focused pipeline stage**, not inline in `produce_script`. This solves the attention dilution problem where SVG quality dropped when competing with JSON structure generation.

Flow:
1. Agent outputs `{ type: "svg", svgPrompt: "description..." }` (no markup)
2. After parse, `svgGen.ts` scans for SVG elements with `svgPrompt` but no `markup`
3. Each SVG gets a **focused Gemini call** with dedicated SVG system prompt
4. Generated markup is injected back into the script
5. Also regenerates SVGs with existing markup that has < 10 visual elements

Result: SVG quality jumped from 3-5 to 50+ visual elements.

### Stage 4: TTS (`tts.ts`)

Each scene's `narration` field is sent to Gemini 2.5 Flash TTS. Scene timings are adjusted to match audio duration (TTS-first timing). Concurrent pool (default 2 parallel).

### Stage 5: BGM (`bgMusic.ts`)

Background music generated via Lyria 3 Clip API. 30-second loop, mood-based prompt. Fixed cost $0.04/clip.

### Stage 6: Image Generation (`imageGen.ts`)

AI-generated background images for scenes with `imagePrompt`. Concurrent pool (max 2 parallel). Images rendered as subtle background layer behind elements.

## Cost Tracking (RM-198/200)

Every API call records real token usage from Gemini's `usageMetadata` response field. Cost is calculated from a pricing table in `costTracker.ts`.

```
[Cost] Total: $0.345 (20 calls 183.7K in 9.9K out) | agent:$0.206 tts:$0.021 bgm:$0.040 imageGen:$0.078
```

- **UI**: Preview header badge + sidebar Cost modal with per-category breakdown
- **Persistence**: saved to localStorage (refresh recovery) + IndexedDB history per entry
- **Categories**: agent, svgGen, tts, bgm, imageGen, other

## Agent Tools

### `analyze_data` (Observe)

Receives the user's raw data and an analysis instruction. Returns the data snapshot so the AI can compute statistics on the next turn.

**When to call**: Before drafting the storyboard. Helps the AI understand data distributions, rankings, and outliers.

### Google Search (Orient)

Built-in Gemini grounding tool. The AI can search the web for context about companies, industries, benchmarks, or terminology mentioned in the user's data.

**When to call**: When the data references entities the AI wants more context about.

### `draft_storyboard` (Decide)

The AI writes a natural-language story outline using the **Apple 6-beat narrative contract**:
- **Hook**: state the most important conclusion immediately (not a topic title)
- **Why It Matters**: connect to audience consequence
- **How It Works**: explain the driver/mechanism/structure
- **Proof**: show evidence (1-3 scenes depending on complexity)
- **Climax**: isolate the single strongest insight
- **Resolution**: compress to one takeaway + one implication

Additional planning fields: `audience_mode` (business/product/education/mixed), `core_takeaway` (one sentence verdict), `hook_statement` (bold opening claim), scene count (6-9), color mood, pacing.

**Why this matters**: Without a storyboard, the AI produces mechanical data dumps. The Apple-style discipline ensures every scene has a single clear message and the narrative progresses from perception to proof to consequence.

### `get_element_catalog` (Decide)

Returns the list of 15 available element types with their properties and usage tips.

**When to call**: Before producing the final script, so the AI knows what visual tools it has.

### `generate_palette` (Decide — REQUIRED)

Generates a cohesive color palette from a primary color or mood keyword using chroma-js LCH color space. Returns: primary, secondary, accent, 8 chart colors, background light/dark, text colors with guaranteed contrast.

**Mood keywords**: professional, corporate, warm, cool, bold, calm, elegant, playful, nature, tech, finance, energy.

**When to call**: BEFORE `produce_script`. This is mandatory — the AI must use palette colors for all scene backgrounds, chart colors, and text colors.

### `produce_script` (Act — Terminal)

The AI outputs the complete VideoScript JSON. This **terminates the agent loop**.

## Creative Direction Framework

The agent system prompt (`prompt.ts`) embeds a structured creative framework that guides AI output quality:

### Apple 6-Beat Narrative Contract (RM-188)
Every video follows the Apple-inspired 6-beat structure:
1. **Hook** — state the most important conclusion immediately (not a topic title)
2. **Why It Matters** — connect to audience consequence ("Why should I care?")
3. **How It Works** — explain the driver, mechanism, or structure ("Because...")
4. **Proof** — show evidence with interpretation (1-3 scenes by complexity)
5. **Climax** — isolate the single strongest insight (maximum visual impact)
6. **Resolution** — compress to one takeaway + one implication (no recap dump)

Scene count: 6 (compact) → 7-8 (moderate) → 9 max (complex). No title cards, no "thank you" endings.

### Tone Ladder
- **default** (business/mixed): precise, calm, premium
- **elevated** (education/product): more cinematic but disciplined
- **launch** (product/marketing): stronger reveal language for hook/climax only

### "So What?" Rule
Every chart/metric must INTERPRET data, not just display it. Narration explains significance, not raw numbers.

### Apple Visual Grammar
Each beat maps to a visual job:
- **Hook**: center layout, 1 dominant element, viewer knows the point in 2 seconds
- **Why It Matters**: metric + callout, or comparison with one key contrast
- **How It Works**: svg/timeline/sankey, complex visuals earn their place here
- **Proof**: bar-chart/line-chart/comparison/map, 1 chart per scene + title
- **Climax**: center layout, 1 dominant element + optional spotlight, strongest contrast
- **Resolution**: clean text/callout/progress, low clutter, calm animation

Constraints: max 1 hero element per scene, max 3 content elements, spotlight only in climax or 1 proof scene, background rhythm restrained→peak→calm.

### Narration ↔ Visual Sync
- Every data point in narration must be visible in the same scene's elements
- Every chart/metric must be referenced in narration
- Narration interprets visuals, not duplicates them
- Evaluator enforces this as checks #5 and #8

### Emotional Engagement
- Kawaii characters (1-2 per video) as emotional anchors (conversational tone only)
- Annotation elements for hand-drawn emphasis
- Icon elements alongside metrics for visual richness

## Files

| File | Purpose |
|------|---------|
| `services/generateScript.ts` | **Orchestrator**: 6-stage pipeline (agent → eval → svg → tts → bgm → image) |
| `services/agentLoop.ts` | OODAE loop engine — routes to single or multi-agent mode |
| `services/agentLoopMulti.ts` | Multi-agent: Storyboard → Visual Director → Quality Reviewer |
| `services/agentLoopSingle.ts` | Single-agent mode (Flash Lite, all tools in one agent) |
| `services/agentPhase.ts` | Agent phase executor (shared by multi-agent roles) |
| `services/agentTools.ts` | Tool registry: declarations + executors |
| `services/agentHooks.ts` | Deterministic quality gates (data accuracy, SVG complexity, layout) |
| `services/agentHooksData.ts` | Data accuracy checker with coreDigitsMatch fallback |
| `services/svgGen.ts` | **SVG post-generation** — focused Gemini calls for high-quality SVG |
| `services/costTracker.ts` | **Cost tracking** — real token counts from API usageMetadata |
| `services/gemini.ts` | Gemini API client with function calling + cost recording |
| `services/tts.ts` | TTS audio generation (Gemini 2.5 Flash TTS) |
| `services/bgMusic.ts` | Background music (Lyria 3 Clip API) |
| `services/imageGen.ts` | AI image generation (Gemini 2.5 Flash Image) |
| `services/prompt.ts` | Legacy unified agent system prompt |
| `services/promptStoryboard.ts` | Storyboard Agent prompt — Apple 6-beat narrative contract |
| `services/promptVisualDirector.ts` | Visual Director Agent prompt — Apple visual grammar + svgPrompt |
| `services/evaluate.ts` | AI quality reviewer (narration↔visual sync, "So What?" test) |
| `services/parseScript.ts` | VideoScript JSON validation |
| `components/CostModal.tsx` | Cost breakdown modal (per-category bars + cumulative history) |

## Gemini API Integration

### Function Calling

```typescript
// Tool declarations sent to Gemini
const tools: GeminiTool[] = [
  { function_declarations: [...] },  // Our custom tools
  { google_search: {} },             // Built-in search grounding
];

// Gemini responds with function calls
{ functionCall: { name: "analyze_data", args: { instruction: "rank by value" } } }

// We execute and send result back
{ functionResponse: { name: "analyze_data", response: { ... } } }
```

### Models

Configured via Settings panel or `.env.local`:
- `gemini-2.0-flash` — fast, good for iteration
- `gemini-2.5-flash` — balanced
- `gemini-3-flash-preview` — latest, best quality
- `gemini-2.5-pro` — highest quality, slower

### Temperature

- Agent loop: 0.8 (more creative for storyboarding)
- Evaluate: 0.7 (balanced)
- Legacy fallback: 0.7
- Force output: 0.5 (more deterministic)

## SVG Post-Generation Architecture (RM-197)

SVG diagrams are the highest-complexity visual output. Since RM-197, SVG generation is **decoupled from produce_script** into a separate focused pipeline stage.

### How SVG is Generated (Current)

1. **Agent loop**: AI outputs `svgPrompt` description instead of inline markup:
```json
{
  "type": "svg",
  "svgPrompt": "3-stage supply chain flowchart with gradient cards, arrow connectors...",
  "animation": "draw"
}
```

2. **Post-generation** (`svgGen.ts`): Focused Gemini call with dedicated SVG system prompt:
   - No JSON structure concerns — model focuses 100% on SVG quality
   - Transparent background (integrates as video element, no self-contained title/grid)
   - Only uses data from scene narration (no fabricated numbers)
   - Concurrent generation (max 2 parallel SVGs)

3. **Quality**: 50+ visual elements per diagram (was 3-5 with inline approach)

### Quality Gate (agentHooks.ts)

- SVG elements with `svgPrompt` **skip** complexity check (post-gen will fill markup)
- SVGs with existing markup still checked: ≥ 10 visual elements + `<defs>` with gradients
- Annotation removed from personality/rich-visual sets (RM-196) — no gaming quality gates

### SVG Rendering Pipeline

```
svgGen.ts → el.markup → svgSanitize.ts → SvgElement.tsx (dangerouslySetInnerHTML)
                          ↑
                   Security: whitelist tags, remove scripts/events
                   Sizing: width=100%, height=100%, preserveAspectRatio
```

## Fallback

If the agent loop fails at any point, `generateScript.ts` catches the error and falls back to the legacy single-shot pipeline (direct prompt → JSON → parse). This legacy path uses `buildSystemPrompt()` (not the agent prompt) and does not use tools.

## Progress Reporting

The pipeline reports progress through 6 stages:

```
Step 1/6 · AI Scripting     — agent loop iterations
Step 2/6 · Quality Check    — (runs inside agent loop)
Step 3/6 · SVG Generation   — focused SVG calls
Step 4/6 · Narration        — TTS generation per scene
Step 5/6 · Background Music — Lyria clip generation
Step 6/6 · Image Generation — AI background images
```

Displayed in the UI via `GenerationProgressBar` component. After completion, cost badge shows in Preview header.

## Cache & Restore (RM-201)

On page refresh, `useAppState` restores:
1. Script JSON from IndexedDB (`cache.ts`)
2. TTS blob URLs from IndexedDB (`ttsCache.ts` → `restoreTTSAudio`)
3. BGM blob URL from IndexedDB (`ttsCache.ts` → `restoreBGMAudio`)
4. Image blob URLs from IndexedDB (`imageCache.ts` → `restoreImageBlobs`)
5. Cost data from localStorage (`costTracker.ts` → `loadCostFromCache`)

History restore follows the same flow — tries cache first, only regenerates TTS for scenes with missing audio.
