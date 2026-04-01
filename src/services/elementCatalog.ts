/**
 * Element catalog — single source of truth for available visual elements.
 * Used by the agent tool `get_element_catalog` to tell AI what it can use.
 */

export const ELEMENT_CATALOG = [
  {
    type: "text",
    props: "content, fontSize, color, fontWeight, align (left|center|right), animation (fade|slide-up|slide-left|slide-right|zoom|bounce|rubber-band|scale-rotate|flip|typewriter), letterSpacing, textTransform (uppercase|none), glow (bool), shadow (bool), delay, stagger",
    description: "Text block with spring entrance animation. Hero-grade spring (punchy). Use 'bounce' for titles, 'scale-rotate' for dramatic reveals, 'flip' for surprises, 'typewriter' for cinematic character-by-character reveal. Set glow:true for neon text-shadow on dark backgrounds (cinematic titles). Set shadow:true for drop-shadow depth on light backgrounds.",
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
    usage_tips: "Use 'circle' to emphasize key data points, 'underline' below important text, 'arrow' for flow/direction, 'cross' for wrong answers in educational content, 'highlight' for key phrases, 'bracket' to group items. Set roughness 1-2 for casual, 0.5 for neat. Use size 80-150. MUST place in 'row' layout paired with text/metric/callout — NEVER as a standalone element in 'column' layout. Annotation is a decoration, not content. If you need a standalone label, use text or callout instead.",
  },
  {
    type: "svg",
    props: "markup (SVG string), animation (fade|slide-up|zoom|draw), drawSpeed (number, default 1), stagger",
    description: "Inline SVG diagram — AI generates raw SVG markup for custom visuals. SVG is sanitized (no scripts). Auto-scales via viewBox. animation 'draw' enables Apple-style path-drawing.",
    usage_tips: "Use for ANY visual that standard chart types can't express. WHEN DATA IS SPATIAL, NOT TABULAR — use svg instead of bar-chart or line-chart. DRAW ANIMATION: Set animation:'draw' for Apple-style path-drawing. drawSpeed:0.5 for slow, 2 for fast. Ensure paths have explicit stroke colors.",
    svg_quality_rules: "CRITICAL — generate PREMIUM quality SVG, not bare shapes. Follow these rules: (1) USE <defs> for gradients (<linearGradient>, <radialGradient>), reusable markers, and glow filters. (2) Every major shape must have gradient fill, rounded corners (rx), and a subtle stroke border — never flat single-color rectangles. (3) ADD DETAIL: labels with font-size 16-22, data badges/pills (small rounded rects with text inside), metric callouts, dotted connector lines (<line stroke-dasharray='4,4'>). (4) USE VISUAL HIERARCHY: primary elements larger and brighter, secondary elements smaller and muted. (5) For nodes/entities: use circles or rounded rects with icon-like symbols inside (a letter, a simple glyph). (6) For connections/flows: use paths with arrowhead markers, varying stroke-width for importance. (7) ADD CONTEXT: axis labels, legend dots, scale indicators, subtle grid lines where appropriate. (8) COLOR DEPTH: use 3-4 opacity levels of palette colors (full, 70%, 40%, 15%) for layered depth. (9) MINIMUM COMPLEXITY: at least 15-20 SVG elements per diagram — a diagram with only 3-5 shapes looks empty on a 1920x1080 canvas. (10) viewBox should be 800x500 or similar wide format. Text uses fill attribute, not CSS color.",
  },
  {
    type: "svg-3d",
    props: "markup (SVG string with grouped layers), layers ([string] — ids of <g> groups, back-to-front order), depthPreset (subtle|card-stack|exploded), cameraTilt (left|right|top), parallax (none|subtle|medium), float (bool), shadow (soft|medium|strong), reveal (fade|rise|draw), drawSpeed (number), delay, stagger",
    description: "Pseudo-3D inline SVG — premium-web spatial depth using layered groups, perspective tilt, parallax drift, and floating motion. Export-safe (pure SVG + CSS transforms). NOT true 3D. Use for architectural diagrams, exploded views, isometric cards, layered panels, product surfaces, process stacks where spatial structure helps understanding.",
    usage_tips: "Use svg-3d for hook, how-it-works, proof, and climax scenes where spatial depth adds visual impact. List layer ids in back-to-front order in 'layers' array. One svg-3d per scene, layout 'center'. depthPreset:'subtle' for gentle, 'card-stack' for stacked, 'exploded' for dramatic.",
    svg_quality_rules: "IMPORTANT: Generate RICH, detailed SVG — not plain rectangles. Each layer MUST include: (1) a card with rounded corners, gradient fill, and subtle border; (2) a layer title in bold; (3) 2-4 sub-component badges/pills inside the card showing specific items; (4) a small metric or icon where relevant. Use <defs> for gradients and reusable elements. Use <rect rx='16'> for rounded cards. Use smaller <rect rx='8'> for badges/pills inside cards. Add subtle connecting lines between layers with <line stroke-dasharray='4,4'>. Keep font-size 18-24 for titles, 14-16 for badges. Use the palette colors with opacity variations for depth.",
    markup_example: `<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#172554"/></linearGradient><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#312e81"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient><linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#2e1065"/></linearGradient></defs><g id="data"><rect x="80" y="390" width="640" height="110" rx="16" fill="url(#g1)" stroke="#334155" stroke-width="1.5"/><text x="110" y="422" fill="#e2e8f0" font-size="20" font-weight="bold">Data Layer</text><rect x="110" y="438" width="120" height="28" rx="8" fill="#334155"/><text x="170" y="457" text-anchor="middle" fill="#94a3b8" font-size="13">PostgreSQL 2TB</text><rect x="245" y="438" width="100" height="28" rx="8" fill="#334155"/><text x="295" y="457" text-anchor="middle" fill="#94a3b8" font-size="13">Redis 94%</text><rect x="360" y="438" width="130" height="28" rx="8" fill="#334155"/><text x="425" y="457" text-anchor="middle" fill="#94a3b8" font-size="13">Elastic 180M</text><rect x="505" y="438" width="90" height="28" rx="8" fill="#334155"/><text x="550" y="457" text-anchor="middle" fill="#94a3b8" font-size="13">S3 45TB</text></g><line x1="400" y1="390" x2="400" y2="378" stroke="#475569" stroke-dasharray="4,4" stroke-width="1"/><g id="services"><rect x="100" y="265" width="600" height="110" rx="16" fill="url(#g2)" stroke="#3b82f6" stroke-width="1.5"/><text x="130" y="297" fill="#bfdbfe" font-size="20" font-weight="bold">Microservices</text><rect x="130" y="313" width="110" height="28" rx="8" fill="#1e3a5f" stroke="#3b82f6" stroke-width="0.5"/><text x="185" y="332" text-anchor="middle" fill="#93c5fd" font-size="13">User Svc</text><rect x="255" y="313" width="130" height="28" rx="8" fill="#1e3a5f" stroke="#3b82f6" stroke-width="0.5"/><text x="320" y="332" text-anchor="middle" fill="#93c5fd" font-size="13">Payment $2.8M</text><rect x="400" y="313" width="140" height="28" rx="8" fill="#1e3a5f" stroke="#3b82f6" stroke-width="0.5"/><text x="470" y="332" text-anchor="middle" fill="#93c5fd" font-size="13">Notify 850K/day</text><rect x="555" y="313" width="120" height="28" rx="8" fill="#1e3a5f" stroke="#3b82f6" stroke-width="0.5"/><text x="615" y="332" text-anchor="middle" fill="#93c5fd" font-size="13">Search 400ms</text></g><line x1="400" y1="265" x2="400" y2="253" stroke="#475569" stroke-dasharray="4,4" stroke-width="1"/><g id="gateway"><rect x="120" y="140" width="560" height="110" rx="16" fill="url(#g3)" stroke="#6366f1" stroke-width="1.5"/><text x="150" y="172" fill="#c7d2fe" font-size="20" font-weight="bold">API Gateway</text><text x="540" y="172" fill="#818cf8" font-size="16">10K req/s</text><rect x="150" y="188" width="80" height="28" rx="8" fill="#312e81" stroke="#6366f1" stroke-width="0.5"/><text x="190" y="207" text-anchor="middle" fill="#a5b4fc" font-size="13">Auth</text><rect x="245" y="188" width="110" height="28" rx="8" fill="#312e81" stroke="#6366f1" stroke-width="0.5"/><text x="300" y="207" text-anchor="middle" fill="#a5b4fc" font-size="13">Rate Limit</text><rect x="370" y="188" width="90" height="28" rx="8" fill="#312e81" stroke="#6366f1" stroke-width="0.5"/><text x="415" y="207" text-anchor="middle" fill="#a5b4fc" font-size="13">Routing</text></g><line x1="400" y1="140" x2="400" y2="128" stroke="#475569" stroke-dasharray="4,4" stroke-width="1"/><g id="frontend"><rect x="140" y="15" width="520" height="110" rx="16" fill="url(#g4)" stroke="#8b5cf6" stroke-width="1.5"/><text x="170" y="47" fill="#ddd6fe" font-size="20" font-weight="bold">Frontend</text><text x="520" y="47" fill="#a78bfa" font-size="16">12M users/mo</text><rect x="170" y="63" width="100" height="28" rx="8" fill="#4c1d95" stroke="#8b5cf6" stroke-width="0.5"/><text x="220" y="82" text-anchor="middle" fill="#c4b5fd" font-size="13">React SPA</text><rect x="285" y="63" width="110" height="28" rx="8" fill="#4c1d95" stroke="#8b5cf6" stroke-width="0.5"/><text x="340" y="82" text-anchor="middle" fill="#c4b5fd" font-size="13">Next.js SSR</text><rect x="410" y="63" width="100" height="28" rx="8" fill="#4c1d95" stroke="#8b5cf6" stroke-width="0.5"/><text x="460" y="82" text-anchor="middle" fill="#c4b5fd" font-size="13">CDN Edge</text></g></svg>`,
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

export const CAMERA_SYSTEM = {
  description: "Each scene supports a 'camera' prop for cinematic camera movement. Controls how the virtual camera moves during the scene. Defaults to 'drift' (subtle Ken Burns) if not set.",
  values: {
    "push-in": "Zoom from 1.0→1.15 + slight upward drift — focus, tension, draw attention inward",
    "pull-out": "Zoom from 1.15→1.0 + slight downward drift — reveal bigger picture, macro view",
    "pan-left": "Horizontal pan left — timeline progression, sequence flow",
    "pan-right": "Horizontal pan right — timeline progression, sequence flow",
    "pan-up": "Vertical pan upward — growth, rising data, aspiration",
    "zoom-center": "Strong center zoom 1.0→1.2 — climax, maximum emphasis",
    "drift": "Subtle Ken Burns motion (default) — keeps scene alive without distraction",
    "static": "No motion — dense data scenes that need stillness for reading",
  },
  note: "Camera is a SCENE-level prop (not element-level). Set on the scene object: scene.camera = 'push-in'. Match camera to narrative: push-in for building tension, pull-out for conclusion/reveal, zoom-center for climax.",
};

export const SPOTLIGHT_SYSTEM = {
  description: "Any element can have a 'spotlight' prop for cinematic focus effect. When active, the spotlit element scales up slightly while all other elements in the scene dim and blur — like a stage spotlight.",
  props: "spotlight: { at: frameNumber, duration: frameCount }",
  details: {
    at: "Scene-local frame when spotlight activates (e.g. 30 = 1s at 30fps)",
    duration: "How many frames the spotlight lasts (e.g. 45 = 1.5s at 30fps)",
  },
  note: "Only ONE element per scene should have spotlight at any given time. Spring physics ensure smooth fade in/out. Use on climax scenes to draw attention to the key data point, metric, or insight.",
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
  "ANNOTATION: Use 'annotation' for educational/study videos — 'circle' to highlight key points, 'cross' for wrong answers, 'arrow' for flow. Hand-drawn style adds warmth. Don't overuse — 1-2 per video for emphasis. MUST pair with another element in 'row' layout — NEVER place as standalone block in 'column' layout.",
  "SVG: Use 'svg' for ANY custom visual that charts can't express — flowcharts, org charts, mind maps, Venn diagrams, AND scientific diagrams (solar systems, orbits, atoms, ecosystems, circuits, networks). RULE: when data is spatial/relational rather than tabular, svg is better than bar-chart or line-chart. Example: planetary orbits → svg with concentric circles + planet dots + draw animation, NOT a bar chart. AI generates full SVG markup. Include viewBox. Use palette colors. One svg per scene. animation:'draw' for Apple-style cinematic path-drawing.",
  "MAP: Use 'map' element for geographic data — country comparisons, regional revenue, user distribution, supply chains. Highlight 3-8 countries with palette.chart colors. One map per scene.",
  "PROGRESS: Use 'progress' for KPIs that are percentages, scores, or completion rates. The circular arc fill is inherently cinematic — much more visual than plain metric numbers. Use variant 'circular' on dark backgrounds for maximum drama.",
  "TIMELINE: Use 'timeline' for chronological storytelling — project phases, event sequences, roadmaps. The staggered node pop-in creates natural pacing. Set activeIndex to draw attention to the current/key milestone.",
  "COMPARISON: Use 'comparison' for side-by-side contrasts — before/after, A vs B, old vs new, plan options. Cards slide in from opposite sides for dramatic reveal. Use with layout 'center'. One comparison per scene.",
  "SVG-3D: Use 'svg-3d' for premium pseudo-3D spatial diagrams — architecture exploded views, isometric cards, layered panels, product surfaces. Author SVG with <g id='bg'>, <g id='base'>, <g id='mid'>, <g id='front'> layers listed in back-to-front order in 'layers' array. Use depthPreset 'subtle' for gentle depth, 'card-stack' for stacked cards, 'exploded' for dramatic separation. cameraTilt 'left' is default. Set float:true for gentle floating motion. Do NOT use svg-3d for simple flat diagrams — use 'svg' instead. One svg-3d per scene, layout 'center'.",
  "SPOTLIGHT: Add spotlight:{at:30, duration:45} to ONE element per scene for cinematic focus — that element scales up while others dim+blur. Use on climax/evidence scenes to spotlight the key metric, chart, or insight. at=frame when focus starts (scene-local), duration=how long. Spring physics handles smooth transition. Don't overuse — 1-2 spotlight moments per video for maximum impact.",
  "CAMERA: Set scene.camera for cinematic camera movement. 'push-in' for building tension/focus, 'pull-out' for revealing the big picture, 'pan-left'/'pan-right' for timelines/sequences, 'pan-up' for growth narratives, 'zoom-center' for climax scenes. Default 'drift' adds subtle life. Use 'static' for dense data scenes. Match camera to narrative role: hook→push-in, evidence→drift, climax→zoom-center, resolution→pull-out.",
  "BACKGROUND IMAGE (scene.imagePrompt): Set imagePrompt on 1-3 key scenes (hook, climax, close) to generate AI background imagery for cinematic depth. Describe mood and style, NOT foreground content — elements handle that. Examples: 'Soft bokeh office lighting, warm tones', 'Dark tech grid with glowing blue nodes', 'Sunset cityscape silhouette, warm gradient'. Keep bgColor as fallback if image generation fails or is disabled. Set imageOpacity (0.0-1.0, default 0.35) to control visibility — lower for text-heavy scenes (0.15-0.25), higher for atmospheric scenes (0.4-0.6). Don't use imagePrompt on chart-heavy scenes — it competes with data visualization.",
];
