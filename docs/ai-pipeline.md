# AI Pipeline — OODAE Agent Loop

## Overview

The AI pipeline uses the OODAE pattern (Observe → Orient → Decide → Act → Evaluate) implemented as a multi-turn agent loop with Gemini function calling. The AI agent decides its own workflow — no hardcoded call sequence.

## Pipeline Stages

### Stage 1: Agent Loop (`agentLoop.ts`)

The agent loop runs up to **12 iterations**. Each iteration:

1. Send conversation + tool definitions to Gemini
2. Gemini returns text, function calls, or both
3. If function call → execute tool → send result back → continue
4. If `produce_script` called → extract VideoScript → **terminate loop**

```
Iteration 1: AI calls analyze_data → computes rankings, percentages
Iteration 2: AI calls Google Search → finds industry context
Iteration 3: AI calls draft_storyboard → plans story arc
Iteration 4: AI calls get_element_catalog → reviews available elements
Iteration 5: AI calls generate_palette → gets cohesive color palette (REQUIRED)
Iteration 6: AI calls produce_script → outputs final JSON → DONE
```

The AI may use fewer or more iterations. It may skip tools or call them multiple times.

### Stage 2: Evaluate (`evaluate.ts`)

A separate Gemini call reviews the generated script for:
- Data accuracy (no invented numbers)
- Data completeness (no ignored data)
- Scene integrity (startFrame math)
- Visual variety
- **Narration↔Visual sync** — every data point in narration must appear in a visual element (metric, chart, callout) in the same scene, and every chart/metric must be referenced in narration

If issues are found, the evaluator returns a corrected VideoScript.

### Stage 3: TTS (`tts.ts`)

Each scene's `narration` field is sent to Gemini 2.5 Flash TTS. Scene timings are adjusted to match audio duration (TTS-first timing).

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
| `services/agentLoop.ts` | OODAE loop engine (max 12 iterations) |
| `services/agentTools.ts` | Tool registry: declarations + executors |
| `services/gemini.ts` | Gemini API client with function calling support |
| `services/prompt.ts` | Legacy unified agent system prompt (OODAE-aware, "So What?" rule, narration↔visual sync) |
| `services/promptStoryboard.ts` | Storyboard Agent prompt — Apple 6-beat narrative contract |
| `services/promptVisualDirector.ts` | Visual Director Agent prompt — Apple visual grammar per beat |
| `services/promptAgents.ts` | Multi-agent prompt builders, handoff formatting, scene plan parsing |
| `services/generateScript.ts` | Orchestrator: agent loop → evaluate → TTS |
| `services/evaluate.ts` | 1+1 AI self-check (data accuracy + narration↔visual sync) |
| `services/parseScript.ts` | VideoScript JSON validation |

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

## SVG Generation Quality

SVG diagrams (flowcharts, org charts, mind maps) are the highest-complexity output from the AI pipeline. See `docs/svg-quality-analysis.md` for the full quality analysis.

### How SVG is Generated

Phase 2 (Visual Director) generates SVG markup embedded in the `produce_script` JSON:

```json
{
  "type": "svg",
  "markup": "<svg viewBox='0 0 800 500'>...full SVG...</svg>",
  "animation": "draw"
}
```

The Visual Director runs on the Pro model override (`getSvgModel()`) with 11 SVG quality rules in its system prompt.

### Quality Gate (agentHooks.ts)

Deterministic checks after `produce_script`:
- Visual elements (rect, circle, path, text, etc.) ≥ 10
- Has `<defs>` block with gradients
- `linearGradient` or `radialGradient` present

### Known Bottlenecks

1. **Title scene SVG dilution** — AI sometimes uses `svg` for title scenes (2-4 elements), triggering quality gate failures meant for diagram SVGs.
2. **Retry loses model override** — `retryPhaseWithFeedback()` does not forward `modelOverride`, falling back to Flash model for SVG-critical retries.
3. **Budget pressure reduces quality** — T=0.5 under pressure produces shorter SVGs, but SVG quality rules in the prompt compensate well.
4. **Multi-scene output budget** — SVGs compete with narration and other elements for output token budget in a single API call.

### Test Scripts

```bash
npx vite-node test/svg-quality-smoke.ts     # Isolated SVG quality (3 scenarios)
npx vite-node test/svg-pipeline-smoke.ts    # Pipeline condition comparison (4 scenarios)
```

## Fallback

If the agent loop fails at any point, `generateScript.ts` catches the error and falls back to the legacy single-shot pipeline (direct prompt → JSON → parse). This legacy path uses `buildSystemPrompt()` (not the agent prompt) and does not use tools.

## Progress Reporting

The agent reports progress at each iteration:

```
[1/12] Thinking...
[2/12] Analyzing data...
[3/12] Writing storyboard...
[4/12] Reviewing elements...
[5/12] Producing video script...
```

This is displayed in the UI via the `onProgress` callback.
