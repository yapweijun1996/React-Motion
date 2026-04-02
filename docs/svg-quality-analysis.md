# SVG Quality Analysis — Gemini Model Capabilities

Last updated: 2026-04-02

## Summary

Isolated SVG generation via Gemini is excellent. The quality gap in the real pipeline comes from **structural constraints**, not model inability. Key bottlenecks: JSON embedding overhead, multi-scene output dilution, and temperature pressure under budget limits.

---

## Test Results (gemini-3-flash-preview, 2026-04-02)

### Isolated SVG (direct prompt → raw SVG response)

| Test Case | Visual Elements | Defs | Gradients | Connectors | Pass |
|-----------|:-:|:-:|:-:|:-:|:-:|
| Flowchart | 44 | ✅ | ✅ | 1 | ✅ |
| Org Chart | 42 | ✅ | ✅ | 6 | ✅ |
| Mind Map | 42 | ✅ | ✅ | 3 | ✅ |

### Pipeline Conditions (SVG inside VideoScript JSON)

| Condition | Scene 1 (title) | Scene 2 (flowchart) |
|-----------|:-:|:-:|
| **T=0.8, with SVG rules** | 2 elements (title only) | **25 elements** ✅ |
| **T=0.5, with SVG rules** | 4 elements (title only) | **26 elements** ✅ |
| **T=0.5, no SVG rules** | 3 elements (title only) | 20 elements (no gradients) |

### Key Finding

The **scene 2 flowchart SVG passes quality gates** in all pipeline conditions when SVG quality rules are present in the system prompt. The model is capable — the constraint is how we extract and evaluate.

---

## Root Causes of Quality Perception Gap

### 1. Title Scene SVG Dilution

**Problem**: AI generates title/intro scenes using `svg` element type instead of `text` element. These title SVGs are minimal (2-4 elements) and fail the quality gate even though they serve a different purpose.

**Impact**: The quality gate at `agentHooks.ts:247-273` checks ALL SVGs equally. A title SVG with 2 elements triggers "SVG has only 2 visual elements — need ≥10" even though the actual data visualization SVG in a later scene has 25+ elements.

**Fix direction**: Differentiate title/intro SVGs from data visualization SVGs. Options:
- Add an `intent` field to SVG elements (`"intent": "title"` vs `"intent": "diagram"`)
- Only apply strict quality gate to SVGs with `animation: "draw"` (diagram intent)
- Instruct AI to use `text` element for title scenes, reserve `svg` for diagrams

### 2. JSON String Escaping Overhead

**Problem**: SVG markup inside JSON requires escaping: `"` → `\"`, newlines → `\n`. The model uses single quotes in SVG attributes (`viewBox='0 0 800 500'`) to avoid double-quote escaping. This works but reduces SVG spec compliance.

**Impact**: Minor. The SVG sanitizer (`svgSanitize.ts`) and DOMParser handle single-quoted attributes. However, complex SVGs with embedded data or CSS can trigger parse failures if quotes aren't consistently escaped.

**Evidence**: Test B scene 2 uses `viewBox='0 0 800 500'` (single quotes) — works correctly. No parse failures observed in testing.

### 3. Temperature Pressure (T=0.5)

**Problem**: When budget reaches 70% (`BUDGET_WARN_THRESHOLD`), temperature drops from 0.8 → 0.5. This makes the model more conservative, producing shorter SVGs with less detail.

**Impact**: Moderate. Test D (T=0.5, no SVG rules) produced 20 elements without gradients. With SVG rules present, T=0.5 still produces 26 elements. The rules in the prompt compensate for the lower temperature.

**Key insight**: SVG quality rules in the system prompt are more important than temperature. T=0.5 + rules = 26 elements. T=0.5 without rules = 20 elements without gradients.

### 4. Multi-Scene Output Budget

**Problem**: The model must generate a full VideoScript JSON (title, scenes, elements, narration) in a single `produce_script` call. SVG markup competes with narration, other elements, and JSON structure for output token budget.

**Impact**: When the script has 6-8 scenes, each scene's SVG gets proportionally less output budget. The model may simplify SVGs to fit everything in one response.

**Evidence**: Not directly tested (our test used 2 scenes). Production scripts with 6+ scenes should be monitored for SVG element count.

### 5. Retry Phase Loses Model Override

**Problem**: `retryPhaseWithFeedback()` at `agentPhase.ts:199-225` does NOT forward `modelOverride`. The retry config lacks `modelOverride`, so it falls back to the default Flash model.

**Evidence** (code):
```typescript
// agentPhase.ts:211-224
const retryConfig: PhaseConfig = {
  name: `${name}-retry`,
  systemPrompt,
  userMessage: "",
  toolDeclarations,
  maxIterations: 2,
  context,
  budget,
  terminalTool,
  onProgress,
  // ❌ modelOverride is MISSING here
};
```

**Impact**: Critical. When the quality gate rejects a Phase 2 SVG (< 10 elements, no gradients), the retry runs on Flash model instead of Pro model, likely producing worse SVG than the first attempt.

### 6. JSON Mode Response Format Variance

**Problem**: Gemini's `responseMimeType: "application/json"` mode occasionally wraps the response in `[{...}]` (array) instead of `{...}` (object). The `produce_script` parser expects an object.

**Evidence**: Test C (T=0.5, JSON mode) returned `[{...}]`. The parser at `agentToolScript.ts:40` would call `JSON.parse()` successfully but get an array instead of the expected VideoScript object.

**Impact**: Low in production (Phase 2 does NOT use `jsonOutput: true`; it relies on function calling). This only affects the Phase 3 Reviewer which uses JSON mode.

---

## Quality Gate Assessment

### Current Production Gate (agentHooks.ts)

| Check | Threshold | Strictness |
|-------|-----------|:----------:|
| Visual elements | ≥ 10 | ⚠️ Too loose (prompt says ≥15-20) |
| Has `<defs>` | Required | ✅ Correct |
| Has gradients | Required | ✅ Correct |
| Connectors | Not checked | ❌ Missing |
| Text labels ≥ 3 | Not checked | ❌ Missing |
| Arrow markers | Not checked | ❌ Missing |

### Recommended Gate Enhancement

```
Visual elements ≥ 10 for all SVGs (current)
Visual elements ≥ 15 for diagram SVGs (intent !== "title")
Has connectors > 0 for diagram SVGs
Has text labels ≥ 3 for diagram SVGs
```

---

## Recommendations

### Immediate (low risk)

1. **Forward modelOverride in retryPhaseWithFeedback** — Fix the missing Pro model override in retry. One-line change.
2. **Instruct AI to avoid SVG for title scenes** — Add to prompt: "Use text element for title/intro scenes. Reserve svg element for diagrams, flowcharts, and data visualizations."

### Short-term (medium risk)

3. **Add SVG intent field** — `"intent": "title" | "diagram"` to differentiate quality gate thresholds.
4. **Add connector check to quality gate** — Reject diagram SVGs with 0 connectors.
5. **Lock minimum temperature for SVG** — Never drop below T=0.65 for Visual Director, even under budget pressure.

### Exploratory

6. **Separate SVG generation call** — Decouple SVG from VideoScript JSON. Generate VideoScript with SVG placeholders, then generate each SVG in a dedicated call. Trade-off: more API calls but higher SVG quality.
7. **Test gemini-3-flash for Visual Director** — Our tests show gemini-3-flash-preview produces 25+ element SVGs with rules. May not need Pro model anymore, reducing cost and latency.

---

## Test Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `test/svg-quality-smoke.ts` | `npx vite-node test/svg-quality-smoke.ts` | Isolated SVG quality (3 scenarios) |
| `test/svg-pipeline-smoke.ts` | `npx vite-node test/svg-pipeline-smoke.ts` | Pipeline condition comparison (4 scenarios) |

Output files in `test/svg-output/`:
- `*.svg` — raw SVG files for inspection
- `*.html` — browser-viewable wrappers
- `quality-report.json` — structured quality metrics
- `pipeline-report.json` — pipeline comparison metrics
