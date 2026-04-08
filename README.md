# React-Motion

**AI-powered data-to-video report generator.** Paste your data, describe the story you want to tell, and let AI create professional animated video presentations with narration, music, and rich visuals.

---

## Features

- **AI Video Generation** — Multi-agent system powered by Google Gemini generates complete video scripts from raw data and a text prompt
- **15+ Visual Elements** — Bar charts, line charts, pie charts, Sankey diagrams, maps, SVG graphics, Lottie animations, metrics, timelines, comparisons, and more
- **Professional Narration** — Google TTS with 30+ selectable voices
- **AI Background Music** — Generated via Google Lyria
- **AI Scene Backgrounds** — Image generation via Imagen
- **Cinematic Transitions** — 15+ WebGL shader effects (fade, dissolve, slide, wipe, zoom, rotate, etc.)
- **Multiple Export Formats** — MP4 (WebCodecs + FFmpeg fallback), audio-only, PowerPoint (PPTX)
- **Multi-Agent Architecture** — 3-role collaboration (Storyboard, Visual Director, Reviewer) with automatic single-agent fallback
- **Quality Gates** — Deterministic validators for SVG quality, data accuracy, and visual variety
- **Real-Time Cost Tracking** — Per-category API cost monitoring (agent, SVG, TTS, BGM, image)
- **History & Caching** — IndexedDB persistence for generated assets; blob caching avoids regeneration
- **Storage Management** — Visual IndexedDB usage breakdown with per-entry delete
- **15+ Templates** — Pre-built prompts for financial reports, supply chain, sales, product launches, and more
- **Progressive Web App** — Installable, offline-capable with service worker caching
- **Dark / Light Theme** — Full design system with CSS custom properties

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| AI / LLM | Google Gemini API (multi-turn, tool use) |
| Speech | Google Cloud TTS |
| Music | Google Lyria |
| Images | Google Imagen |
| Charts | D3.js (d3-scale, d3-shape, d3-sankey, d3-geo) |
| Video Export | WebCodecs API, FFmpeg (WASM), mp4-muxer |
| Presentation Export | pptxgenjs |
| Rendering | Canvas API, WebGL (transition shaders) |
| Storage | IndexedDB, localStorage |
| Icons | Lucide React |
| Other | Chroma.js, RoughJS, Lottie Web, TopoJSON |

## How It Works

```
┌──────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│  Input    │───>│  AI Agent    │───>│  SVG Gen   │───>│  TTS +   │───>│  Export   │
│  Data +   │    │  Loop        │    │  (focused) │    │  BGM +   │    │  MP4 /   │
│  Prompt   │    │  (script)    │    │            │    │  Images  │    │  PPTX    │
└──────────┘    └──────────────┘    └────────────┘    └──────────┘    └──────────┘
                   Stage 1             Stage 2           Stages 3-5      Stage 6
```

1. **Input** — Paste CSV/structured data and write a narrative prompt
2. **Script Generation** — AI agent loop produces a scene-by-scene video script
3. **SVG Synthesis** — Dedicated pass generates high-quality data visualizations
4. **Media Generation** — TTS narration, background music, and scene images in parallel
5. **Preview** — Play the video with synchronized narration and animations
6. **Export** — Download as MP4, extract audio, or generate a PowerPoint deck

## Architecture

### Multi-Agent System

- **Single-Agent Mode** (default) — OODAE loop (Observe → Orient → Decide → Act → Execute)
- **Multi-Agent Mode** (beta) — Three specialized roles:
  - **Storyboard Agent** — Plans narrative structure using Apple's 6-beat framework (hook → why → how → proof → climax → resolution)
  - **Visual Director Agent** — Designs scenes, elements, layouts, and transitions
  - **Reviewer Agent** — Validates quality and requests refinements

### Custom Video Engine

Built from scratch (replaced Remotion) with:
- Frame-by-frame Canvas rendering
- Element registry pattern for 15+ visual types
- Custom spring/interpolation animation engine
- Ken Burns camera motion (pan/zoom)
- WebGL transition shaders between scenes
- Scene layout system (column, row, center)

### Caching Strategy

- **IndexedDB** — TTS audio, BGM, generated images, full generation history
- **Blob URLs** — Reusable references restored on page refresh
- **Cost Persistence** — Tracked across sessions via localStorage

## Project Structure

```
React-Motion/
├── react-motion.iife.js     # Bundled application (IIFE)
├── react-motion.css          # Compiled styles
├── sw.js                     # Service worker (PWA caching)
├── manifest.json             # PWA manifest
├── favicon.svg               # App icon
├── ffmpeg-mt/                # FFmpeg WASM binaries (multi-threaded)
│   ├── ffmpeg-core.js
│   ├── ffmpeg-core.wasm
│   └── ffmpeg-core.worker.js
└── assets/
    └── worker-*.js           # Web worker scripts
```

### Source Layout (pre-build)

```
src/
├── components/       # React UI (App, Settings, History, Export, Templates)
├── hooks/            # Custom hooks (useAppState, useVideoActions)
├── video/            # Video engine (player, renderer, elements, animations)
│   ├── elements/     # 15+ visual element components
│   └── effects/      # Background effects (Bokeh, Flow, Rising)
├── services/         # Business logic
│   ├── agent*.ts     # AI agent system (loop, tools, hooks, config)
│   ├── generate*.ts  # 6-stage pipeline orchestration
│   ├── export*.ts    # Video/audio/PPTX export
│   ├── gemini.ts     # Gemini API client
│   ├── tts.ts        # Text-to-speech
│   ├── bgMusic.ts    # Background music generation
│   ├── imageGen.ts   # Image generation
│   ├── svgGen.ts     # SVG synthesis
│   ├── db.ts         # IndexedDB operations
│   ├── cache.ts      # Cache management
│   └── costTracker.ts# API cost monitoring
├── types/            # TypeScript type definitions
└── styles/           # CSS modules & design tokens
```

## Browser Requirements

- **WebCodecs API** — For MP4 export (Chrome 94+, Edge 94+)
- **SharedArrayBuffer** — For FFmpeg WASM (requires COOP/COEP headers)
- **IndexedDB** — For caching and history persistence
- **Web Audio API** — For audio playback and export

Falls back to FFmpeg WASM if WebCodecs is unavailable.

## License

Private

---

Built with React, TypeScript, and Google Gemini.
