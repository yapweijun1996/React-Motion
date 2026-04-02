# Design System — React-Motion

## Product Context
- **What this is:** AI-powered data-to-video report generator. Users enter a prompt, AI generates a narrated video with animated charts, transitions, and BGM.
- **Who it's for:** Data analysts, marketing teams, and anyone who needs to turn data into compelling video presentations.
- **Space/industry:** AI video generation, data visualization, presentation tools. Peers: Lumen5, Synthesia, Gamma, Beautiful.ai, Chronicle.
- **Project type:** Web app / creative tool (React + TypeScript + Vite)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian
- **Decoration level:** Intentional — every visual element serves information hierarchy. Subtle grain texture for depth, never decorative for its own sake.
- **Mood:** Professional, precise, rhythmic. Like Bloomberg Terminal meets Stripe Dashboard: every pixel earns its place. Not cold, but purposeful.
- **Reference sites:** gamma.app, beautiful.ai, lumen5.com, chroniclehq.com, figma.com

## Typography
- **Display/Hero:** Satoshi (900/700 weight) — geometric, modern but warm. More personality than Inter, less corporate than Roboto. CDN: api.fontshare.com
- **Body:** DM Sans (400/500/600/700) — clear, readable, large x-height. Comfortable for long-form text. CDN: Google Fonts
- **UI/Labels:** DM Sans (500/600)
- **Data/Tables:** Geist Mono (400/500) — Vercel-made, native tabular-nums support. The best monospace for data display. CDN: Google Fonts
- **Code:** Geist Mono
- **Loading:** Google Fonts + Fontshare CDN, with `font-display: swap`
- **Scale:**
  - Hero: 42px / -1px tracking / 1.1 line-height
  - H1: 28px / -0.5px tracking / 1.2
  - H2: 22px / -0.3px tracking / 1.3
  - H3: 18px / 0 tracking / 1.4
  - Body: 15px / 0 tracking / 1.65
  - Small: 13px / 0 tracking / 1.5
  - Caption: 11px / 1.5px tracking / uppercase / mono

## Color
- **Approach:** Restrained — one accent + neutrals. Color is rare and meaningful.
- **Primary:** #0F766E (teal-700) — deep, trustworthy, stands out from the sea of blue-purple AI tools. Does not clash with chart colors in data visualization.
- **Primary Light:** #14B8A6 (teal-400) — for text on dark backgrounds, active states
- **Primary Hover:** #0D6D66 — subtle darken for interactive feedback
- **Primary Muted:** rgba(15, 118, 110, 0.15) — backgrounds, badges, highlights
- **Neutrals:** Warm stone scale (not cold grays):
  - 50: #FAFAF9
  - 100: #F5F5F4
  - 200: #E7E5E4
  - 300: #D6D3D1
  - 400: #A8A29E
  - 500: #78716C
  - 600: #57534E
  - 700: #44403C
  - 800: #292524
  - 900: #1C1917
  - 950: #0C0A09
- **Semantic:** success #16A34A, warning #D97706, error #DC2626, info #0284C7
- **Light mode (default):** Background #FAFAF9, surface #FFFFFF, elevated #F5F5F4. Primary stays #0F766E.
- **Dark mode:** Background #0C0A09, surface #1C1917, elevated #292524. Primary uses lighter variant #14B8A6 for visibility.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — information-dense but not cramped
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Hybrid — tool panels (prompt, settings) use strict grid; video preview gets breathing room
- **Grid:** Sidebar (240px fixed) + Center (fluid) + Right panel (320px fixed) on desktop. Single column on mobile.
- **Max content width:** 1200px for settings/docs pages; full-width for the main app
- **Border radius:** sm:4px, md:8px, lg:12px, full:9999px — hierarchical, not uniform

## Motion
- **Approach:** Intentional — UI motion is restrained but precise. The product is about animation, so the UI hints at that capability without competing with the output.
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50ms) short(150ms) medium(250ms) long(400ms)
- **Grain texture:** SVG noise at 3% opacity, fixed overlay. Adds tactile quality without GPU cost.

## CSS Custom Properties

```css
:root {
  /* Primary */
  --rm-primary: #0F766E;
  --rm-primary-hover: #0D6D66;
  --rm-primary-light: #14B8A6;
  --rm-primary-muted: rgba(15, 118, 110, 0.15);

  /* Semantic */
  --rm-success: #16A34A;
  --rm-warning: #D97706;
  --rm-error: #DC2626;
  --rm-info: #0284C7;

  /* Typography */
  --rm-font-display: 'Satoshi', system-ui, sans-serif;
  --rm-font-body: 'DM Sans', system-ui, sans-serif;
  --rm-font-mono: 'Geist Mono', 'SF Mono', monospace;

  /* Radius */
  --rm-radius-sm: 4px;
  --rm-radius-md: 8px;
  --rm-radius-lg: 12px;
  --rm-radius-full: 9999px;

  /* Spacing */
  --rm-space-2xs: 2px;
  --rm-space-xs: 4px;
  --rm-space-sm: 8px;
  --rm-space-md: 16px;
  --rm-space-lg: 24px;
  --rm-space-xl: 32px;
  --rm-space-2xl: 48px;
  --rm-space-3xl: 64px;

  /* Motion */
  --rm-duration-micro: 50ms;
  --rm-duration-short: 150ms;
  --rm-duration-medium: 250ms;
  --rm-duration-long: 400ms;

  /* Shadows */
  --rm-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --rm-shadow-lg: 0 10px 40px rgba(0,0,0,0.12);
}

/* Light theme (default) */
[data-theme="light"] {
  --rm-bg: #FAFAF9;
  --rm-bg-surface: #FFFFFF;
  --rm-bg-elevated: #F5F5F4;
  --rm-bg-hover: #E7E5E4;
  --rm-text: #1C1917;
  --rm-text-secondary: #57534E;
  --rm-text-muted: #A8A29E;
  --rm-border: #E7E5E4;
  --rm-border-subtle: #F5F5F4;
}

/* Dark theme */
[data-theme="dark"] {
  --rm-bg: #0C0A09;
  --rm-bg-surface: #1C1917;
  --rm-bg-elevated: #292524;
  --rm-bg-hover: #44403C;
  --rm-text: #F5F3F0;
  --rm-text-secondary: #A8A29E;
  --rm-text-muted: #78716C;
  --rm-border: #292524;
  --rm-border-subtle: #1C1917;
}

```

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Initial design system created | Created by /design-consultation based on competitive research of Gamma, Lumen5, Beautiful.ai, Synthesia, Chronicle |
| 2026-04-02 | Teal primary instead of blue/purple | Differentiates from every other AI tool. Conveys data trustworthiness over AI magic. |
| 2026-04-02 | Industrial/Utilitarian aesthetic | Positions React-Motion as a professional data tool (like Figma) rather than a friendly consumer app (like Canva) |
| 2026-04-02 | Warm stone neutrals | Cold grays feel sterile for a creative tool. Warm grays add just enough warmth to balance the industrial direction. |
| 2026-04-02 | Satoshi over Inter/Roboto | More geometric personality than system fonts, avoids the "every SaaS looks the same" trap |
| 2026-04-02 | Light theme as default | User preference. Light mode is the default experience. Dark mode available as option. |
