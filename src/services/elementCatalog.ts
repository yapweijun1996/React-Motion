/**
 * Element catalog — single source of truth for available visual elements.
 * Used by the agent tool `get_element_catalog` to tell AI what it can use.
 */

export const ELEMENT_CATALOG = [
  {
    type: "text",
    props: "content, fontSize, color, fontWeight, align (left|center|right), animation (fade|slide-up|slide-left|slide-right|zoom|bounce|rubber-band|scale-rotate|flip|typewriter), letterSpacing, textTransform (uppercase|none), delay, stagger",
    description: "Text block with spring entrance animation. Hero-grade spring (punchy). Use 'bounce' for titles, 'scale-rotate' for dramatic reveals, 'flip' for surprises, 'typewriter' for cinematic character-by-character reveal with blinking cursor (great for opening hooks, key insights, dramatic quotes).",
  },
  {
    type: "metric",
    props: "items: [{ value: '11.7M', label: 'Total', color, subtext? }], animation (fade|slide-up|bounce|rubber-band|scale-rotate|flip), stagger",
    description: "Big KPI numbers with count-up + spring entrance. Use 'bounce' for celebratory metrics, 'rubber-band' for surprise numbers.",
  },
  {
    type: "bar-chart",
    props: "bars: [{ label, value, color }], highlightIndex, showPercentage, animation (fade|slide-up|slide-left|slide-right|zoom|bounce|rubber-band|scale-rotate|flip), stagger",
    description: "Horizontal bar chart with container entrance + spring-driven bar fill. Default animation: 'zoom'. Use 'bounce' for celebratory data, 'slide-up' for sequential reveals.",
  },
  {
    type: "pie-chart",
    props: "slices: [{ label, value, color }], donut (bool), highlightIndex, showPercentage, animation (fade|slide-up|slide-left|slide-right|zoom|bounce|rubber-band|scale-rotate|flip), stagger",
    description: "Pie/donut chart with container entrance + spring rotation fill. Default animation: 'zoom'. Use 'bounce' for fun breakdowns, 'scale-rotate' for dramatic reveals.",
  },
  {
    type: "line-chart",
    props: "series: [{ name, data: [{ label, value }], color }] OR flat: data + color. showDots (bool), animation (fade|slide-up|slide-left|slide-right|zoom|bounce|rubber-band|scale-rotate|flip), stagger",
    description: "Line chart with container entrance + spring line-draw. Default animation: 'zoom'. Use 'slide-left' for time-series flow, 'bounce' for positive trends.",
  },
  {
    type: "sankey",
    props: "nodes: [{ name, color }], links: [{ source: nodeIndex, target: nodeIndex, value }], animation (fade|slide-up|slide-left|slide-right|zoom|bounce|rubber-band|scale-rotate|flip), stagger",
    description: "Flow/allocation diagram with container entrance + staggered node/link reveal. Default animation: 'zoom'. Use 'slide-right' for left-to-right flow emphasis.",
  },
  {
    type: "list",
    props: "items: [string], icon (bullet|check|arrow|star|warning), color, textColor, fontSize, animation (fade|slide-up|slide-left|slide-right|bounce), stagger",
    description: "Bullet list with staggered entrance. Defaults to slide-left. Use 'bounce' for fun lists.",
  },
  {
    type: "divider",
    props: "color, width, stagger",
    description: "Visual separator with spring width expansion. Support-grade spring.",
  },
  {
    type: "callout",
    props: "title, content, borderColor, fontSize, animation (fade|slide-up|slide-left|bounce|rubber-band|scale-rotate), stagger",
    description: "Bordered highlight box. Use 'bounce' for aha moments, 'slide-left' for sequential reveals.",
  },
  {
    type: "kawaii",
    props: "character, mood, size, color, caption, captionColor, captionSize, stagger",
    description: "Cute SVG mascot character with bounce-in animation. Adds personality to the video.",
    characters: "astronaut, backpack, browser, cat, chocolate, credit-card, cyborg, file, folder, ghost, human-cat, human-dinosaur, ice-cream, mug, planet, speech-bubble",
    moods: "sad, shocked, happy, blissful, lovestruck, excited, ko",
    usage_tips: "Match character to topic: 'planet' for space/geo, 'credit-card' for finance, 'browser' for tech, 'mug' for casual. Match mood to data: 'excited' for good results, 'shocked' for outliers, 'sad' for bad metrics. Use in opening/closing scenes or alongside callouts.",
  },
  {
    type: "lottie",
    props: "preset, size, loop, stagger",
    description: "Animated icon (Lottie). Frame-synced to video. Use alongside data for visual punctuation.",
    presets: "checkmark, arrow-up, arrow-down, pulse, star, thumbs-up",
    usage_tips: "Use 'checkmark' for positive results, 'arrow-up'/'arrow-down' for trends, 'pulse' for attention/alerts, 'star' for highlights, 'thumbs-up' for approval. Place next to metrics or callouts in 'row' layout.",
  },
  {
    type: "icon",
    props: "name, size, color, label, labelColor, labelSize, strokeWidth, animation (fade|slide-up|zoom|bounce|rubber-band|scale-rotate|flip), stagger",
    description: "SVG icon from curated library (lucide). Crisp at any size. Default animation: 'bounce'. Use in 'row' layout alongside text/metrics for KPI cards, section headers, or visual anchors.",
    names: "trending-up, trending-down, dollar-sign, bar-chart, pie-chart, target, award, briefcase, building, wallet, check-circle, x-circle, alert-triangle, info, thumbs-up, thumbs-down, shield-check, ban, book-open, graduation-cap, lightbulb, brain, pencil, file-text, library, atom, microscope, cpu, globe, zap, rocket, wifi, arrow-right, arrow-up, arrow-down, arrow-up-right, chevron-right, clock, calendar, users, heart, star, eye, search, map-pin",
    usage_tips: "Match icon to topic: 'trending-up' for growth, 'dollar-sign' for finance, 'graduation-cap' for education, 'atom' for science, 'rocket' for launches, 'shield-check' for security. Use size 48-80 for hero icons, 32-40 for inline. Place in 'row' layout with text or metric for icon+label pairs.",
  },
  {
    type: "annotation",
    props: "shape (circle|underline|arrow|box|cross|highlight|bracket), color, fillColor, strokeWidth, roughness (0.5-3), size, label, labelColor, labelSize, stagger",
    description: "Hand-drawn sketch annotation (roughjs). Stroke draws in progressively with spring animation. Perfect for educational emphasis, marking important data, or adding a casual/friendly feel.",
    shapes: "circle (emphasis ring), underline (wavy underline), arrow (pointing direction), box (highlight area), cross (wrong/eliminated), highlight (semi-transparent marker), bracket (curly brace grouping)",
    usage_tips: "Use 'circle' to emphasize key data points, 'underline' below important text, 'arrow' for flow/direction, 'cross' for wrong answers in educational content, 'highlight' for key phrases, 'bracket' to group items. Set roughness 1-2 for casual, 0.5 for neat. Use size 80-150. Place in 'row' layout with text for annotated explanations.",
  },
  {
    type: "svg",
    props: "markup (SVG string), animation, stagger",
    description: "Inline SVG diagram — AI generates raw SVG markup for custom visuals like flowcharts, org charts, mind maps, process diagrams, Venn diagrams, timelines, or any custom infographic. SVG is sanitized (no scripts). Auto-scales to fill available space via viewBox.",
    usage_tips: "Use for diagrams that don't fit standard chart types. Include viewBox attribute. Use readable font-size (16+). Keep colors from the palette. Text in SVG should use fill not color. One svg element per scene (it auto-expands). Good for: process flows (boxes + arrows), org structures, comparison diagrams, timeline visuals, concept maps.",
  },
  {
    type: "map",
    props: "countries: [{ name, value?, color? }], baseColor?, strokeColor?, showLabels? (bool), animation, stagger",
    description: "World map with country highlighting. Uses d3-geo Natural Earth projection. Highlight countries by name with custom colors and value labels. Perfect for regional comparisons, market distribution, user geography.",
    supported_countries: "China, USA, India, Japan, Germany, UK, France, Brazil, Canada, Australia, Russia, South Korea, Italy, Spain, Mexico, Indonesia, Turkey, Saudi Arabia, Switzerland, Netherlands, Sweden, Singapore, Malaysia, Thailand, Vietnam, Philippines, Nigeria, South Africa, Egypt, Argentina, Colombia, Chile, Peru, New Zealand, Ireland, Norway, Denmark, Finland, Poland, Taiwan, Hong Kong, UAE, Israel, Portugal, Greece, Belgium, Austria, Czech Republic",
    usage_tips: "Use for geographic data: market share by country, user distribution, supply chain origins, regional revenue. One map per scene. Use palette.chart colors for country highlights. Keep countries to 3-8 for readability. showLabels=true adds name+value tooltip on each highlighted country.",
  },
  {
    type: "progress",
    props: "value (number), max (number, default 100), label (string), color (hex), variant ('circular'|'semicircle'|'linear'), suffix (string, default '%'), thickness (number 4-32, default 14), animation, stagger",
    description: "Animated gauge/progress indicator. Circular ring fills with spring animation + count-up number. Great for completion rates, scores, targets, KPIs. More visual than plain metric — the arc fill is inherently cinematic.",
    usage_tips: "Use 'circular' (default) for hero KPIs on dark backgrounds — very dramatic. Use 'semicircle' for dashboard style. Use 'linear' when showing multiple progress bars in a column. Pair with a text title above. One progress per scene for maximum impact, or up to 3 in 'row' layout.",
  },
  {
    type: "timeline",
    props: "items: [{ label, description?, color? }], activeIndex (number, -1=none), orientation ('horizontal'|'vertical'), lineColor (hex), animation, stagger",
    description: "Milestone timeline with animated line draw + staggered node pop-in. Perfect for project phases, chronological events, process steps, roadmaps.",
    usage_tips: "Use 'horizontal' for 3-5 milestones (best fit for 1920px width). Use 'vertical' for 4-7 items with longer descriptions. Set activeIndex to highlight current/key milestone. Great for storytelling scenes — shows progression, before/after, phase transitions. One timeline per scene.",
  },
  {
    type: "comparison",
    props: "left: { title, value?, subtitle?, color?, items?: [string] }, right: { title, value?, subtitle?, color?, items?: [string] }, label (string, default 'VS'), animation, stagger",
    description: "Side-by-side comparison cards with VS divider. Left card slides from left, right from right, then VS pops in center. Cinematic reveal for contrasts.",
    usage_tips: "Use for: before/after, A vs B, old vs new, plan comparison, winner vs loser. Set value for big numbers (e.g. '$4.2M'). Use items array for bullet point features. Use contrasting colors (left blue, right red). One comparison per scene with layout 'center'.",
  },
];

export const STAGGER_SYSTEM = {
  description: "All elements support 'stagger' prop to control animation rhythm.",
  values: {
    tight: "5-frame intervals — fast, energetic",
    normal: "8-frame intervals — balanced (default)",
    relaxed: "12-frame intervals — calm, spacious",
    dramatic: "18-frame intervals — slow reveal, builds tension",
  },
  note: "Noise perturbation adds ±2 frames of organic variation automatically.",
};

export const ELEMENT_TIPS = [
  "Mix element types across scenes for visual variety.",
  "Use 'metric' for hero KPI numbers — they animate with count-up.",
  "Use 'bar-chart' or 'pie-chart' for comparisons, 'line-chart' for trends.",
  "Use 'sankey' for flow/allocation data.",
  "Use 'callout' to highlight key insights or warnings.",
  "Use 'list' with different icons (check, arrow, star, warning) for variety.",
  "Use 'divider' sparingly to separate sections within a scene.",
  "Each scene supports layout: 'column' (default), 'center', or 'row'.",
  "Scene bgColor should vary — don't make every scene white or dark. Use bgGradient for cinematic scenes: 'linear-gradient(135deg, #0f172a, #1e3a5f)' for dramatic dark, 'linear-gradient(180deg, #fefce8, #fef3c7)' for warm light. Gradients add depth and mood — use on 2-3 key scenes (hook, climax, close).",
  "Every scene MUST have a 'narration' field for TTS.",
  "Set stagger: 'tight' for data-dense scenes, 'dramatic' for key reveals.",
  "Vary stagger speed across scenes — don't use 'normal' for everything.",
  "Use 'kawaii' characters for personality — opening intro, data reactions, farewell. Don't overuse (1-2 per video).",
  "Use 'lottie' icons as visual punctuation — checkmark next to achievements, arrow-up next to growth metrics, pulse for alerts. Place in 'row' layout alongside text/metrics.",
  "LAYOUT: Chart scenes should have MAX 1 title + 1 chart. Charts auto-scale to fill available space.",
  "LAYOUT: Never put more than 3-4 elements per scene. Fewer elements = bigger elements = better visual impact.",
  "LAYOUT: Use layout 'center' for single-chart or hero-metric scenes for maximum impact.",
  "FONT SIZE STRICT: Scene titles fontSize 96-128 (bold). Subtitles 64-80. Body text 56-72. List items 48-64. ABSOLUTE MINIMUM 48 — anything below is FORBIDDEN. The 1920×1080 canvas is displayed smaller so text must be LARGE.",
  "COLOR PALETTE REQUIRED: Call generate_palette BEFORE produce_script. Use palette.chart for chart colors, palette.text.light on dark backgrounds, palette.text.dark on light backgrounds. Do NOT pick random hex colors.",
  "LAYOUT: Prefer more scenes with fewer elements over fewer scenes crammed with many small elements.",
  "ANIMATION: Use 'bounce' for celebratory/positive scenes, 'rubber-band' for surprise data, 'scale-rotate' for dramatic reveals, 'flip' for before/after comparisons.",
  "ANIMATION: Vary animation types across scenes — don't use 'fade' for everything. Mix bounce, slide-up, slide-left, zoom for visual rhythm.",
  "ANIMATION: Charts (bar-chart, pie-chart, line-chart, sankey) now support container-level entrance animation. Prefer 'zoom' or 'bounce' over 'fade' for charts — the whole chart scales/bounces in, then internal animations (bar fill, pie rotation, line draw) play on top.",
  "ICON: Use 'icon' element for section headers (icon + text in 'row'), KPI decoration (icon + metric in 'row'), or standalone visual anchors. Icons are SVG — crisp at any size, lightweight, and export-safe.",
  "ANNOTATION: Use 'annotation' for educational/study videos — 'circle' to highlight key points, 'cross' for wrong answers, 'arrow' for flow. Hand-drawn style adds warmth. Don't overuse — 1-2 per video for emphasis.",
  "SVG: Use 'svg' element for custom diagrams (flowcharts, org charts, mind maps, timelines, Venn diagrams) that don't fit standard chart types. AI generates the SVG markup directly. Include viewBox. Use palette colors. One svg per scene.",
  "MAP: Use 'map' element for geographic data — country comparisons, regional revenue, user distribution, supply chains. Highlight 3-8 countries with palette.chart colors. One map per scene.",
  "PROGRESS: Use 'progress' for KPIs that are percentages, scores, or completion rates. The circular arc fill is inherently cinematic — much more visual than plain metric numbers. Use variant 'circular' on dark backgrounds for maximum drama.",
  "TIMELINE: Use 'timeline' for chronological storytelling — project phases, event sequences, roadmaps. The staggered node pop-in creates natural pacing. Set activeIndex to draw attention to the current/key milestone.",
  "COMPARISON: Use 'comparison' for side-by-side contrasts — before/after, A vs B, old vs new, plan options. Cards slide in from opposite sides for dramatic reveal. Use with layout 'center'. One comparison per scene.",
];
