/**
 * Shared prompt building blocks used by both AGENT and LEGACY system prompts.
 * Single source of truth — edit here, both prompts update automatically.
 */

/** VideoScript JSON schema (no heading — each prompt adds its own). */
export const VIDEO_SCRIPT_SCHEMA = `{
  "id": "unique-string",
  "title": "string",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "durationInFrames": number,
  "narrative": "overall narrative summary",
  "theme": { "primaryColor": "#hex", "secondaryColor": "#hex", "style": "corporate"|"modern"|"minimal", "chartColors": [palette.chart] },
  "scenes": [
    {
      "id": "scene-N",
      "startFrame": number,
      "durationInFrames": number (150-270 frames = 5-9 seconds, vary per scene role),
      "bgColor": "#hex",
      "bgGradient": "linear-gradient(135deg, #hex1, #hex2)" (optional — CSS gradient, overrides bgColor. Use for cinematic depth),
      "bgEffect": "bokeh"|"flow"|"rising" (optional — canvas background animation. EXPLICIT OPT-IN: omit this field for most scenes. Only set on 2-3 key scenes with different effects. Never on chart-heavy scenes or scenes with imagePrompt),
      "camera": "push-in"|"pull-out"|"pan-left"|"pan-right"|"pan-up"|"zoom-center"|"drift"|"static" (optional — cinematic camera movement, default "drift"),
      "layout": "column"|"center"|"row",
      "narration": "spoken narration for TTS (2-4 sentences, 8-15 seconds per scene)",
      "imagePrompt": "optional — AI-generated description for scene background image. Describe mood, style, lighting, composition in 1-2 sentences. Example: 'Modern office with soft blue bokeh lighting, clean and professional atmosphere'. Only set when a static bgColor/bgGradient feels plain and a photographic/illustrated background would add cinematic depth. The generated image is rendered as a subtle background layer behind all elements.",
      "imageOpacity": 0.35 (optional — background image opacity 0.0-1.0, default 0.35. Use 0.15-0.25 for subtle texture, 0.3-0.5 for visible background, 0.6+ for dominant image. Lower values keep text readable),
      "transition": "fade"|"slide"|"wipe"|"clock-wipe"|"radial-wipe"|"diamond-wipe"|"iris"|"zoom-out"|"zoom-blur"|"slide-up"|"split"|"rotate"|"dissolve"|"pixelate" (how THIS scene enters, default "fade"),
      "elements": [ ... element objects ... ]
    }
  ]
}`;

/** 14 scene transition types. */
export const SCENE_TRANSITIONS = `## Scene transitions (14 types — use variety!)
**Classic:**
- "fade": crossfade (default, smooth and safe)
- "slide": new scene pushes old scene horizontally (sequential flow)
- "wipe": new scene slides over from left (reveals)
- "clock-wipe": clockwise circular sweep (dramatic moments)
**Geometric reveals:**
- "radial-wipe": circle expanding from center (focus/spotlight effect)
- "diamond-wipe": diamond shape expanding from center (elegant, unique)
- "iris": rectangle expanding from center outward (classic film)
- "split": vertical split — two halves open from center (dramatic reveal)
**Motion-based:**
- "slide-up": new scene pushes up from bottom (vertical flow, lists)
- "zoom-out": exiting scene shrinks + fades (pulling back, overview)
- "zoom-blur": exiting scene zooms + blurs out (dreamy, cinematic)
- "rotate": exiting scene rotates + shrinks away (playful, energetic)
**Premium WebGL (requires Canvas Effects ON in settings):**
- "dissolve": noise-based pixel dissolve between scenes (cinematic, mysterious)
- "pixelate": mosaic pixelation that peaks at midpoint then resolves (retro, tech)
Use at least 4 different transitions per video. Never repeat the same transition 3 times in a row.`;

/** Element stagger (animation rhythm). */
export const ELEMENT_STAGGER = `## Element stagger (animation rhythm)
Every element supports a "stagger" prop that controls animation timing:
- "tight": fast, energetic (5-frame intervals) — use for data-dense scenes
- "normal": balanced (8-frame intervals) — default
- "relaxed": calm, spacious (12-frame intervals) — use for storytelling scenes
- "dramatic": slow reveal (18-frame intervals) — use for key insight reveals
Noise perturbation adds organic variation automatically. Vary stagger across scenes!`;

/** Entrance animation types for all elements including charts. */
export const ENTRANCE_ANIMATIONS = `## Entrance animations
ALL elements (including charts) support an "animation" prop:
- "fade": gentle fade-in (default for text/list, safe)
- "slide-up": slide from below — great for text, lists
- "slide-left" / "slide-right": horizontal slide — great for staggered lists, sequential flow, sankey
- "zoom": scale up from small — **recommended default for charts**, great for titles, emphasis
- "bounce": overshoot + settle — great for celebratory metrics, fun chart scenes
- "rubber-band": stretch + snap — great for surprise data, "wow" moments
- "scale-rotate": spin + scale in — great for dramatic reveals, opening/closing
- "flip": 3D Y-axis flip — great for before/after, comparisons
- "typewriter": character-by-character typing with blinking cursor — **cinematic and engaging**. Best for: opening hooks, key insights, dramatic quotes, closing statements. Short text (≤40 chars) reveals per-character, longer text reveals per-word. Use sparingly (1-2 per video) for maximum impact.

**Charts (bar-chart, pie-chart, line-chart, sankey):** The whole chart animates in as a unit (zoom/bounce/etc), then internal animations (bar fill, pie rotation, line draw, node reveal) play on top. Use "zoom" or "bounce" for charts instead of "fade" — it gives much more visual impact.

Vary animations across scenes! Don't use "fade" for everything. Match animation mood to content.`;

/** Complete catalog of available visual element types. */
export const AVAILABLE_ELEMENTS = `## Available elements

{ "type": "text", "content": string, "fontSize": number, "color": hex, "fontWeight": number, "align": "left"|"center"|"right", "animation": "fade"|"slide-up"|"slide-left"|"slide-right"|"zoom"|"bounce"|"rubber-band"|"scale-rotate"|"flip"|"typewriter", "letterSpacing": number, "textTransform": "uppercase"|"none", "glow": boolean (optional, neon glow on dark bg), "shadow": boolean (optional, drop shadow) }
// text glow/shadow: Use glow:true for cinematic titles on dark/gradient backgrounds — creates a neon text-shadow effect. Use shadow:true for subtle depth on light backgrounds. Both can be combined.

{ "type": "metric", "items": [{ "value": "11.7M", "label": "Total", "color": hex, "subtext"?: string }] }

{ "type": "bar-chart", "bars": [{ "label": string, "value": number, "color": hex }], "highlightIndex": number, "showPercentage": boolean, "animation": "zoom"|"bounce"|"fade"|"slide-up"|etc }
// bar-chart: prefer animation "zoom" or "bounce" — whole chart scales in, then bars fill.

{ "type": "pie-chart", "slices": [{ "label": string, "value": number, "color": hex }], "donut": boolean, "highlightIndex": number, "showPercentage": boolean, "animation": "zoom"|"bounce"|"fade"|etc }
// pie-chart: prefer animation "zoom" or "bounce" — whole chart scales in, then slices rotate.

{ "type": "line-chart", "series": [{ "name": string, "data": [{ "label": string, "value": number }], "color": hex }], "showDots": boolean, "animation": "zoom"|"slide-left"|"bounce"|"fade"|etc }
// line-chart: prefer animation "zoom" or "slide-left" — whole chart enters, then line draws.

{ "type": "sankey", "nodes": [{ "name": string, "color": hex }], "links": [{ "source": nodeIndex, "target": nodeIndex, "value": number }], "animation": "zoom"|"slide-right"|"bounce"|"fade"|etc }
// sankey: prefer animation "zoom" or "slide-right" — whole diagram enters, then nodes/links reveal.

{ "type": "list", "items": [string, ...], "icon": "bullet"|"check"|"arrow"|"star"|"warning", "color": hex, "textColor": hex }

{ "type": "divider", "color": hex, "width": number }

{ "type": "callout", "title": string, "content": string, "borderColor": hex, "fontSize": number }

{ "type": "kawaii", "character": "ghost"|"cat"|"planet"|"browser"|"credit-card"|"mug"|"astronaut"|etc, "mood": "happy"|"excited"|"shocked"|"sad"|"blissful"|"lovestruck"|"ko", "size": number, "color": hex, "caption": string?, "captionColor": hex? }
// kawaii: cute SVG mascot. Use 1-2 per video for personality. Match character to topic, mood to data.

{ "type": "lottie", "preset": "checkmark"|"arrow-up"|"arrow-down"|"pulse"|"star"|"thumbs-up", "size": number, "loop": boolean }
// lottie: animated icon. Use alongside metrics/callouts for visual punctuation. Place in "row" layout.

{ "type": "svg", "markup": "<svg viewBox='0 0 800 400'>...</svg>", "animation": "fade"|"zoom"|"draw", "drawSpeed": number }
// svg: custom inline SVG diagram. Use for ANY visual that standard charts can't express: flowcharts, org charts, mind maps, process diagrams, Venn diagrams,
// AND scientific/spatial diagrams (solar systems, orbits, atoms, ecosystems, circuits, networks, hierarchies, cycles).
// RULE: when data is spatial or relational (not tabular), svg is BETTER than bar-chart/line-chart. Example: planetary orbits → svg with concentric circles + planet dots, NOT a bar chart.
// AI generates the full SVG markup string. MUST include viewBox. Use palette colors (fill, not CSS color). Font-size 16+ inside SVG.
// One svg element per scene — it auto-scales to fill available space.
// PLACEMENT RULE: Use svg ONLY in "How It Works" or "Proof" beats. NEVER use svg for title/hook/intro or resolution/closing scenes — use text element instead.
// **animation "draw"**: Apple-style path drawing — each SVG stroke draws itself sequentially, then fill fades in. Cinematic storytelling for process flows, architecture diagrams. Set drawSpeed:0.5 for slow, 1 for normal, 2 for fast. Ensure SVG paths have explicit stroke colors.

{ "type": "svg-3d", "markup": "<svg viewBox='0 0 800 500'><g id='bg'>...</g><g id='base'>...</g><g id='mid'>...</g><g id='front'>...</g></svg>", "layers": ["bg","base","mid","front"], "depthPreset": "subtle"|"card-stack"|"exploded", "cameraTilt": "left"|"right"|"top", "parallax": "none"|"subtle"|"medium", "float": boolean, "shadow": "soft"|"medium"|"strong", "reveal": "fade"|"rise"|"draw", "drawSpeed": number }
// svg-3d: pseudo-3D depth SVG — premium-web spatial feel using layered groups with perspective tilt, parallax, and floating motion.
// Author SVG with grouped <g id="..."> layers in back-to-front order. List ids in "layers" array. Export-safe (pure SVG + CSS transforms).
// Use for: architecture exploded views, isometric cards, layered panels, product surfaces, process stacks. NOT for flat diagrams (use "svg").
// depthPreset: "subtle" (gentle), "card-stack" (stacked), "exploded" (dramatic separation).
// cameraTilt: wrapper perspective tilt direction. parallax: per-layer horizontal drift. float: gentle floating motion.
// reveal "draw": Apple-style stroke drawing for linework-heavy diagrams. Keep text sparse. Avoid foreignObject.

{ "type": "map", "countries": [{ "name": "China", "value": "45K", "color": hex }, { "name": "USA", "value": "32K" }], "showLabels": true }
// map: world map with country highlighting. Use for geographic data (market share, user distribution, regional revenue).
// Supported: China, USA, Japan, Germany, UK, France, Brazil, India, Australia, Russia, South Korea, Malaysia, Singapore, Thailand, etc. (50+ countries).
// Use palette.chart colors. Keep to 3-8 highlighted countries. One map per scene.

{ "type": "progress", "value": 73, "max": 100, "label": "Revenue Target", "color": hex, "variant": "circular"|"semicircle"|"linear", "suffix": "%", "thickness": 14 }
// progress: animated gauge with spring arc fill + count-up number. Use "circular" for hero KPIs (most cinematic), "semicircle" for dashboard style, "linear" for multiple bars.
// Great for: completion rates, scores, targets. More visual than plain metric. One progress in "center" layout for maximum impact, or up to 3 in "row" layout.

{ "type": "timeline", "items": [{ "label": "Q1", "description": "Launch", "color": hex }, ...], "activeIndex": 0, "orientation": "horizontal"|"vertical", "lineColor": hex }
// timeline: milestone timeline with animated line draw + staggered node pop-in. Use "horizontal" for 3-5 milestones, "vertical" for 4-7 with longer descriptions.
// Set activeIndex to highlight current milestone. Great for: project phases, chronological events, roadmaps, process steps. One timeline per scene.

{ "type": "comparison", "left": { "title": "Before", "value": "$2.1M", "subtitle": "Manual process", "color": "#ef4444", "items": ["Slow", "Error-prone"] }, "right": { "title": "After", "value": "$4.2M", "subtitle": "Automated", "color": "#22c55e", "items": ["2x faster", "99.9% accurate"] }, "label": "VS" }
// comparison: side-by-side cards. Left slides from left, right from right, VS pops in center. Use for before/after, A vs B, winner vs loser.
// Use contrasting colors. Set value for big headline numbers. items[] for bullet features. One comparison per scene, layout "center".`;

/** Scene layout rules for 1920x1080 canvas. */
export const SCENE_LAYOUT_RULES = `## Scene Layout Rules (IMPORTANT)

The canvas is 1920×1080. Elements must fill the space — do NOT cram too many elements into one scene.

- **Chart scenes** (bar-chart, pie-chart, line-chart, sankey): Use **1 title text + 1 chart** per scene. Use layout: "column". The chart will auto-expand to fill available space.
- **Metric scenes**: Max 3-4 metric items per scene. Use layout: "center" or "row".
- **Data-heavy scenes**: If you need multiple charts, split them into separate scenes — one chart per scene.
- **Never put more than 3-4 elements in one scene.** More elements = smaller elements = bad visual impact.
- **Use layout: "center"** for single-chart or single-metric scenes for maximum visual impact.
- **FONT SIZES — STRICT MINIMUMS (the canvas is 1920×1080 but displayed smaller, so text must be LARGE)**:
  - Scene titles: fontSize **96-128** (bold, high contrast, color from palette)
  - Subtitles/section headers: fontSize **64-80**
  - Body text / callout content: fontSize **56-72**
  - List items: fontSize **48-64**
  - **ABSOLUTE MINIMUM: 48.** Any fontSize below 48 is FORBIDDEN — it will be unreadable when displayed.
  - **Metric values**: fontSize is controlled internally (160px), just keep value strings concise ("2.5M" not "2,500,000").
- **Prefer fewer, bigger elements** over many small elements. Each scene should have one clear focal point.
- Scene backgrounds should alternate light/dark for visual rhythm. Use high-contrast text colors.
- **bgEffect** (canvas animation — EXPLICIT OPT-IN ONLY): "bokeh" for dreamy/corporate (soft light orbs), "flow" for tech/science (drifting particles), "rising" for warm/celebratory (floating fireflies). **Rules:** Only set bgEffect on 2-3 dark/gradient scenes max. If multiple scenes use bgEffect, they MUST use different effects. Do NOT set bgEffect on chart-heavy scenes. Do NOT set bgEffect when imagePrompt is set. If a scene has no bgEffect field, NO canvas animation will render — this is the desired default.
- **NEVER use a chart element without data.** bar-chart needs bars[], pie-chart needs slices[], line-chart needs series[], sankey needs nodes[]+links[]. If the scene has no numeric data to chart, use text, callout, list, metric, or comparison instead.
- **Non-chart scenes still fill space.** Use layout "center" with a large metric, callout, comparison, or progress element as the focal point. Avoid scenes with only small text floating in empty space.
- **When NOT to use chart elements:**
  - No quantitative data for the scene → use text/callout/list
  - Only 1 data point → use metric or progress, not a 1-bar chart
  - Qualitative information (conclusions, recommendations) → use list or callout
  - Geographic data → use map element, not a chart
- **Decoration elements (annotation, icon, kawaii, lottie) are NOT standalone content.**
  - NEVER place annotation/icon/kawaii/lottie as the sole element in a scene row.
  - In "column" layout: pair them with a content element on the SAME row using a nested "row" wrapper, or place them BEFORE/AFTER a text title as a visual accent.
  - Best practice: use layout "row" when combining a decoration element with text or metric.
  - annotation is for EMPHASIS on existing content — circle around data, underline below text — not a standalone block.
  - annotation does NOT count as a rich visual or personality element for quality checks. Do NOT add annotation to satisfy visual variety requirements.
  - annotation MUST use "row" layout — the quality gate rejects annotation in "column" or "center" layout.
  - If you need a standalone label/tag, use a text element or callout instead of annotation.`;

/** Narration and visual synchronization rules. */
export const NARRATION_VISUAL_SYNC = `## Narration ↔ Visual Sync (CRITICAL)

The audience HEARS narration and SEES elements at the same time. They must tell the same story:

- **Every data point in narration must be visible**: If narration says "revenue grew 45%", that "45%" must appear in a metric, callout, or chart annotation in the SAME scene.
- **Every chart/metric must be narrated**: If a scene has a bar-chart, the narration should reference what the chart shows (trend, comparison, key value).
- **No orphan narration**: Don't narrate data that has no visual element. If you mention a number, show it.
- **No silent visuals**: Don't show a chart without narrating what it means.
- **Self-check before produce_script**: For each scene, mentally verify: "Would a viewer who can ONLY hear understand the same story as a viewer who can ONLY see?"`;

/** Hard constraints for scene generation (merged from both AGENT and LEGACY). */
export const HARD_CONSTRAINTS = `## Hard Constraints

- Scenes must not overlap: each startFrame = previous startFrame + previous durationInFrames.
- Canvas: 1920×1080 at 30fps unless user specifies otherwise.
- NEVER invent data. Only use numbers from the user's prompt.
- If data is incomplete, flag gaps using a list element with "warning" icon.
- Match the language of the user's prompt (Chinese prompt → Chinese narration).
- Every scene MUST have a "narration" field with natural spoken narration (1-3 sentences, 5-15 seconds per scene).
- Narration and visual elements MUST be synchronized (see Narration ↔ Visual Sync above).
- **Background Images (AI decision)**: You may set \`imagePrompt\` on scenes where a photographic/illustrated background would add cinematic depth. This is YOUR creative decision — use it when a plain bgColor feels insufficient for the scene's mood. Describe mood, style, and lighting in 1-2 sentences (e.g. "Soft blue bokeh office lighting, professional atmosphere"). Set \`imageOpacity\` (0.0-1.0, default 0.35) to control visibility. Skip on chart-heavy scenes. Typical use: 1-3 scenes per video (hook, climax, close). If the video doesn't need it, don't use it.`;

/** Cinematic storytelling tools — camera, spotlight, SVG draw. */
export const CINEMATIC_TOOLS = `## Cinematic Storytelling Tools

Three powerful tools for Apple-style narrative presentation. Use them together for maximum impact.

### 1. Camera Movement (scene-level: scene.camera)
Controls virtual camera motion during the scene. Match camera to narrative role:
- **"push-in"**: Zoom 1.0→1.15 + upward drift. USE FOR: building tension, focusing attention, hook scenes.
- **"pull-out"**: Zoom 1.15→1.0 + downward drift. USE FOR: revealing big picture, conclusion, resolution.
- **"pan-left" / "pan-right"**: Horizontal sweep. USE FOR: timelines, sequences, before→after flow.
- **"pan-up"**: Vertical upward sweep. USE FOR: growth narratives, rising trends, aspiration.
- **"zoom-center"**: Strong center zoom 1.0→1.2. USE FOR: climax scene, maximum emphasis moment.
- **"drift"**: Subtle Ken Burns (default). USE FOR: most scenes — keeps alive without distraction.
- **"static"**: No motion. USE FOR: dense data scenes, reading-heavy content.

**Narrative-Camera mapping:**
| Scene Role | Recommended Camera | Why |
|---|---|---|
| Hook | push-in | Draw viewer in immediately |
| Context/Why | drift | Neutral, let content speak |
| Evidence | drift or pan-right | Steady, data-focused |
| Climax | zoom-center | Maximum dramatic emphasis |
| Resolution | pull-out | Step back, see the big picture |

### 2. Spotlight (element-level: element.spotlight)
Dims + blurs all other elements while scaling up the spotlit element. Like a stage spotlight.
- Props: \`spotlight: { at: frameNumber, duration: frameCount }\`
- "at" = scene-local frame when spotlight activates (e.g. 30 = 1s at 30fps)
- "duration" = how long spotlight lasts (e.g. 45 = 1.5s)
- Only ONE element per scene should have spotlight at any time.
- USE FOR: climax scenes — spotlight the key metric or chart that delivers the insight.
- COMBINE WITH: camera "zoom-center" for double emphasis.
- Don't overuse — 1-2 spotlight moments per video.

### 3. SVG Path Drawing (element-level: svg element animation:"draw")
Apple-style stroke animation — each SVG path draws itself sequentially, then fill fades in.
- Set animation:"draw" on svg element, optionally drawSpeed (0.5=slow, 1=normal, 2=fast)
- USE FOR: explaining processes, architecture, cause-and-effect, system diagrams.
- BEST ON: scenes with camera "drift" or "push-in" — let the drawing be the focus.
- Ensure SVG paths have explicit stroke attributes for best effect.

### Combining All Three (Example)
A climax scene that reveals the key architecture diagram:
- camera: "zoom-center" (viewer zooms in)
- svg element with animation: "draw" (diagram draws itself)
- After drawing completes, spotlight the key node
This creates an Apple Keynote-quality reveal sequence.`;
