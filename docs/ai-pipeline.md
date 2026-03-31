# AI Pipeline — OODAE Agent Loop

## Overview

The AI pipeline uses the OODAE pattern (Observe → Orient → Decide → Act → Evaluate) implemented as a multi-turn agent loop with Gemini function calling. The AI agent decides its own workflow — no hardcoded call sequence.

## Pipeline Stages

### Stage 1: Agent Loop (`agentLoop.ts`)

The agent loop runs up to **10 iterations**. Each iteration:

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

The AI writes a natural-language story outline:
- Opening hook
- Data highlights to emphasize
- Story arc (intro → analysis → insight → conclusion)
- Scene count, color mood, pacing

**Why this matters**: Without a storyboard, the AI produces mechanical data dumps. With it, the video has narrative flow.

### `get_element_catalog` (Decide)

Returns the list of 15 available element types with their properties and usage tips.

**When to call**: Before producing the final script, so the AI knows what visual tools it has.

### `generate_palette` (Decide — REQUIRED)

Generates a cohesive color palette from a primary color or mood keyword using chroma-js LCH color space. Returns: primary, secondary, accent, 8 chart colors, background light/dark, text colors with guaranteed contrast.

**Mood keywords**: professional, corporate, warm, cool, bold, calm, elegant, playful, nature, tech, finance, energy.

**When to call**: BEFORE `produce_script`. This is mandatory — the AI must use palette colors for all scene backgrounds, chart colors, and text colors.

### `produce_script` (Act — Terminal)

The AI outputs the complete VideoScript JSON. This **terminates the agent loop**.

## Files

| File | Purpose |
|------|---------|
| `services/agentLoop.ts` | OODAE loop engine (max 10 iterations) |
| `services/agentTools.ts` | Tool registry: declarations + executors |
| `services/gemini.ts` | Gemini API client with function calling support |
| `services/prompt.ts` | Agent system prompt (OODAE-aware, creative direction) |
| `services/generateScript.ts` | Orchestrator: agent loop → evaluate → TTS |
| `services/evaluate.ts` | 1+1 AI self-check |
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

## Fallback

If the agent loop fails at any point, `generateScript.ts` catches the error and falls back to the legacy single-shot pipeline (direct prompt → JSON → parse). This legacy path uses `buildSystemPrompt()` (not the agent prompt) and does not use tools.

## Progress Reporting

The agent reports progress at each iteration:

```
[1/10] Thinking...
[2/10] Analyzing data...
[3/10] Writing storyboard...
[4/10] Reviewing elements...
[5/10] Producing video script...
```

This is displayed in the UI via the `onProgress` callback.
