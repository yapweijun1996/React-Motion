# AGENTS.md

## Project

This repository builds **React-Motion**, an AI-powered data-to-video report generator designed to embed into existing business systems.

The product goal:

- end users provide business data + a natural language prompt
- AI analyzes the data and generates a video script (narrative, highlights, structure)
- Remotion renders the script into a professional presentation video (animated charts, text overlays, transitions)
- end users preview in-browser and export MP4 for management presentations
- the entire tool is packaged as a JS bundle and embedded in a CFML/Lucee host application via `<script>` tag

This is **not** a general-purpose video editor or NLE.
It is a **prompt-driven data presentation video generator** — the AI decides the story, Remotion renders it.

---

## Current phase

**Phase 0 — Greenfield.**

No source code exists yet. The repository contains only planning documents (`CLAUDE.md`, `AGENTS.md`), environment config (`.env.local`), and reference material (`sample-project/`).

All sections below describe the **target architecture** — the structure to build toward, not existing code.

---

## Core product flow

```
CFML/Lucee host app
  ↓ passes business data (JSON) + user prompt
React-Motion widget (JS bundle embedded via <script>)
  ↓ sends data + prompt to AI
Gemini API
  ↓ returns video script (scenes, narrative, chart configs, highlights)
Remotion composition
  ↓ renders animated charts, text, transitions per script
Browser preview (Remotion Player)
  ↓ user approves
Export MP4 (Node.js render service or Remotion Lambda)
  ↓
End user presents to boss / management
```

---

## Runtime stack (planned)

- `index.tsx` — widget bootstrap, exposes `window.ReactMotion.mount(el, config)`.
- `App.tsx` — main shell: prompt input, preview surface, export controls.
- `store/*` — global state: project data, AI generation state, render state.
- `features/prompt/*` — prompt input UI and prompt processing logic.
- `features/ai/*` — Gemini API integration: data analysis, script generation, narrative generation.
- `features/player/*` — Remotion Player preview surface.
- `features/export/*` — export/render job flow and progress UI.
- `video/*` — Remotion compositions, scene components, chart animations, text overlays.
- `templates/*` — reusable video report templates (chart report, summary report, comparison report, etc.).
- `services/*` — API clients, data normalization, validation, render orchestration.
- `types/*` — TypeScript type definitions for all data contracts.
- `utils/*`, `config/*`, `hooks/*` — supporting layers.

> None of these paths exist yet. Create them incrementally as implementation begins.

---

## Canonical paths to treat as source of truth

Once implementation begins, these are the authoritative source paths:

- `features/`, `video/`, `templates/`, `store/`, `services/`, `types/`, `utils/`, `hooks/`, `config/`, `tests/`, `docs/`
- Root-level files (`App.tsx`, `index.tsx`, `package.json`, `vite.config.ts`)
- `src/` duplicate or partial files should not be changed by default unless the active import path requires it
- `sample-project/` is reference-only and must never become a live implementation dependency

---

## Product boundary model

### Widget shell (to build)
- `index.tsx`: widget bootstrap, mounts into a host-provided DOM element
- `App.tsx`: main shell with prompt input, preview, and export controls
- must work as an embedded widget inside a CFML/Lucee HTML page
- host app provides data via mount config; widget does not fetch data on its own

### State (to build)
- `store/*`: central state management
- state should be divided by responsibility:
  - prompt state (user input, prompt history)
  - project state (video script, scene data)
  - AI generation state (loading, results, errors)
  - preview state (playback position, player status)
  - export/render state (progress, success, failure)
- state edits should go through store actions/slices, not ad-hoc mutable globals

### Prompt pipeline (to build)
- user enters a natural language prompt describing what they want to present
- prompt is combined with the business data context
- sent to Gemini API for analysis and script generation
- prompt pipeline lives under `features/prompt/*` and `features/ai/*`

### AI pipeline (to build)
- `features/ai/*`: Gemini API integration
- receives: business data (JSON) + user prompt
- returns: structured video script (scenes, narrative text, chart configs, highlights, recommendations)
- AI output must conform to a typed `VideoScript` contract
- AI decides story structure, emphasis, and insight ordering
- deterministic executor validates AI output before passing to Remotion

### Preview pipeline (to build)
- browser preview uses Remotion Player
- preview components consume the structured `VideoScript`
- preview should reflect the generated script exactly as export would render it

### Render pipeline (to build)
- export logic lives under `features/export/*` and/or `services/render*`
- render inputs must be derived from the canonical `VideoScript`
- MP4 export requires Node.js (Remotion render) — served by a separate Node.js microservice or Remotion Lambda
- render execution should never depend on transient UI-only state
- every export path must surface progress, success, and failure to the user

### Template/composition layer (to build)
- Remotion compositions and scene components live under `video/*`
- reusable report templates live under `templates/*`
- templates are scene-type driven: chart animation, text overlay, title card, comparison view, summary card, etc.
- each template is a React component with explicit typed props
- AI script references template types; Remotion resolves and renders them

---

## Canonical data contract rules

The video script is the source of truth between AI and Remotion.

At minimum, the app should converge around a structure like:

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
  type: "title" | "chart" | "highlight" | "comparison" | "summary" | "transition";
  startFrame: number;
  durationInFrames: number;
  props: Record<string, unknown>;
  narration?: string;
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
3. All scene props must be explicitly typed per scene type.
4. Do not create separate incompatible data models for preview and export.
5. Temporary UI state is allowed, but it must not affect the rendered video.
6. `BusinessData` from the host app is read-only — never mutated by the widget.

---

## AI integration rules

Use Gemini API for data analysis and script generation.

### What AI does
- analyzes business data to find patterns, outliers, rankings, trends
- interprets the user's prompt to determine presentation focus and tone
- generates a structured `VideoScript` with scenes, narrative, and chart configs
- suggests highlights and insights the user may not have noticed

### What AI does NOT do
- AI does not render video — Remotion does
- AI does not directly access the database — it receives pre-aggregated data
- AI does not control the UI — it outputs a data contract that the UI consumes

### AI output validation
- AI output must parse into a valid `VideoScript` type
- if AI output is malformed, surface the error to the user — do not silently degrade
- retry with adjusted context is allowed; silent fallback to hardcoded content is not

---

## Remotion usage rules

Remotion is the video rendering engine.

Use Remotion for:

- scene composition (chart animations, text overlays, transitions)
- frame-based timing
- browser video preview (Remotion Player)
- final MP4 render/export

Do not use Remotion for:

- UI interactions or editor chrome (use standard React / Motion for that)
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

Current MVP includes only:

* prompt input → AI generates video script from business data
* one or two report templates (bar chart report, summary report)
* browser preview via Remotion Player
* export MP4 (via Node.js render service)
* embed as JS bundle in CFML page

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

## Template contract rules

Templates are video scene primitives rendered by Remotion.

Rules:

1. Templates must be reusable React components with explicit typed props.
2. Templates must not read from stores — they receive all data via props.
3. Scene timing is controlled by the `VideoScript`, not hardcoded in templates.
4. Each template type corresponds to a `VideoScene.type` value.
5. New templates should follow existing template folder and typing conventions.

Planned template types for MVP:

- `title` — opening/closing title card with text animation
- `chart` — animated bar/line/pie chart with data labels
- `highlight` — callout for key insights or anomalies
- `comparison` — side-by-side or before/after view
- `summary` — closing summary with bullet points
- `transition` — scene transition effects

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

* Remotion composition/template development
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

* review `sample-project/` (especially `remotion-4.0.441/packages/example/`)
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
* Node.js is required for MP4 export (Remotion render service) — this is a separate deployment concern
* preview must work fully in-browser via Remotion Player
* Gemini API calls go from browser (or proxied through CFML/Node) — decide auth strategy in implementation
* local persistence is not needed for MVP (CFML host manages data)
* workers are allowed where they reduce UI blocking
* do not assume a complex backend beyond the Remotion render service

---

## Testing and verification standards

* Add or adjust tests in `tests/` when behavior changes
* Prioritize tests adjacent to the touched path
* Update docs when ownership, contracts, or render flow changes
* Verify preview behavior and export behavior separately when relevant

Current verification priorities:

* AI output parses into a valid `VideoScript`
* Remotion compositions render all scene types correctly
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
* keeps `VideoScript` as the single contract between AI and Remotion
* keeps preview and export derived from the same `VideoScript`
* ensures every failure path clears UI progress/loading state and surfaces the error
* updates impacted docs/tests
* avoids introducing a second implementation path
* keeps the MVP focused on prompt → AI script → video preview → export

---

## Useful docs (to create as implementation progresses)

* `docs/architecture.md`
* `docs/project-structure.md`
* `docs/ai-pipeline.md`
* `docs/render-flow.md`
* `docs/template-contracts.md`
* `docs/cfml-integration.md`
* `task.md`

> None of these files exist yet. Create each doc when the corresponding feature area is implemented.
