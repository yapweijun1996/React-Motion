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
  "theme": { "primaryColor": "#hex", "secondaryColor": "#hex", "style": "corporate"|"modern"|"minimal" },
  "scenes": [
    {
      "id": "scene-N",
      "startFrame": number,
      "durationInFrames": number (150-270 frames = 5-9 seconds, vary per scene role),
      "bgColor": "#hex",
      "bgGradient": "linear-gradient(135deg, #hex1, #hex2)" (optional — CSS gradient, overrides bgColor. Use for cinematic depth),
      "layout": "column"|"center"|"row",
      "narration": "spoken narration for TTS (2-4 sentences, 8-15 seconds per scene)",
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

{ "type": "svg", "markup": "<svg viewBox='0 0 800 400'>...</svg>" }
// svg: custom inline SVG diagram. Use for flowcharts, org charts, mind maps, process diagrams, timelines, Venn diagrams.
// AI generates the full SVG markup string. MUST include viewBox. Use palette colors (fill, not CSS color). Font-size 16+ inside SVG.
// One svg element per scene — it auto-scales to fill available space. Great for visuals that standard chart types can't express.

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
- Scene backgrounds should alternate light/dark for visual rhythm. Use high-contrast text colors.`;

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
- Narration and visual elements MUST be synchronized (see Narration ↔ Visual Sync above).`;
