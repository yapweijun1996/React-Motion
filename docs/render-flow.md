# Render & Export Flow

## Preview (Browser)

`VideoPlayer` renders the `ReportComposition` in the browser via `VideoProvider` context. No server needed.

```
VideoScript
  → ReportComposition.tsx
    → SceneRenderer (scene sequencing + CSS transitions)
      → FrameProvider (scene-local frame remap)
        → GenericScene (layout + element routing)
          → 15 element renderers (text, metric, bar-chart, icon, map, etc.)
          → Dark/light text auto-contrast (isDarkBg detection)
        → AudioTrack (TTS narration per scene, blob URL)
    → Progress bar (bottom, theme color)
```

### SVG and Pseudo-3D Scenes

Both `svg` and `svg-3d` elements render as inline SVG in the DOM:

- **`svg`**: Sanitized SVG injected via `dangerouslySetInnerHTML`. Supports `draw` animation (Apple-style path drawing via `DrawingSvg`).
- **`svg-3d`**: Same sanitized SVG, plus per-layer transforms driven by `useLayoutEffect` each frame:
  - Layer depth: deterministic translateY from `depthPreset` table
  - Wrapper tilt: CSS perspective + rotateX/Y from `cameraTilt`
  - Parallax: sinusoidal translateX per layer, amplitude from `parallax`
  - Float: sinusoidal XY on wrapper container
  - Shadow: CSS `filter: drop-shadow` from `shadow` preset
  - Reveal: fade (opacity), rise (opacity + translateY), draw (delegates to DrawingSvg)

Shared sanitization via `svgSanitize.ts` — whitelist includes both camelCase and lowercase SVG tags for cross-environment safety. Root `<svg>` attributes are also sanitized (not just children).

This path is preferred because export captures the same DOM/SVG scene tree through `html-to-image`, preserving preview/export parity.

### Transitions

Configured per scene via `scene.transition` field:

| Type | Effect | Default |
|------|--------|---------|
| `fade` | Cross-fade opacity | Yes (fallback) |
| `slide` | Slide in from edge | No |
| `wipe` | Horizontal wipe | No |
| `clock-wipe` | Radial clock sweep | No |

Transition duration: **20 frames** (spring timing, damping=200).

### Audio in Preview

Each scene's `ttsAudioUrl` (blob URL to WAV) is passed to `<AudioTrack>` inside each scene's `<FrameProvider>`. AudioTrack syncs play/pause with `usePlaying()` and corrects drift when it exceeds 0.3s via frame-to-time seek. Audio pauses automatically on scene unmount.

---

## Export Pipeline

Export uses a completely separate path from preview — no screen recording.

```
Step 1: Frame Capture
  VideoSurface (hidden, full resolution 1920x1080)
    → html-to-image (toPng) every 3rd frame
    → PNG data URLs stored in memory

Step 2: Write to FFmpeg FS
  PNG data URLs → fetchFile → ff.writeFile("frame00001.png", ...)

Step 3: Encode Silent MP4
  FFmpeg: -framerate 10 -i frame%05d.png
          -c:v libx264 -preset ultrafast -crf 28
          -pix_fmt yuv420p -tune stillimage
          → output.mp4

Step 4: Mux Audio (if TTS exists)
  Per-scene WAV → ff.writeFile("audio_0.wav", ...)
  FFmpeg: -filter_complex "[1:a]adelay=0|0[a0];[2:a]adelay=5000|5000[a1];
           [a0][a1]amix=inputs=2:duration=longest:normalize=0[aout]"
          -map 0:v -map [aout] -c:v copy -c:a aac -b:a 128k
          → output_with_audio.mp4 → replaces output.mp4

Step 5: Download
  ff.readFile("output.mp4") → Blob → URL.createObjectURL → <a download>
```

### Export-Safe Boundary for Pseudo-3D SVG

Supported in `svg-3d` (export-safe):

- Layered SVG `<g>` groups with `id` or `data-layer` targeting
- Per-layer `translate` transforms (depth + parallax)
- Wrapper `perspective` + `rotateX`/`rotateY` (cameraTilt)
- SVG `<defs>` gradients, masks, and standard filters
- CSS `filter: drop-shadow` (shadow presets)
- `DrawingSvg` stroke animation (reveal: draw)

Avoid (not export-safe):

- `foreignObject` with embedded XHTML
- Nested HTML 3D scenes inside SVG
- Complex CSS 3D on individual SVG child elements
- True 3D runtime content (Three.js/WebGL)

The more a scene depends on browser-specific 3D composition instead of plain SVG/DOM, the higher the risk of preview/export mismatch.

### FFmpeg Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Frame step | 3 | Capture every 3rd frame (10 fps input) |
| Preset | ultrafast | Speed over compression |
| CRF | 28 | Acceptable quality for presentations |
| Tune | stillimage | Optimized for static slides |
| Pixel format | yuv420p | Universal compatibility |
| Audio codec | AAC 128kbps | Standard MP4 audio |
| Multi-thread | Auto-detect | SharedArrayBuffer + COOP/COEP required |

### Multi-Thread Support

FFmpeg.wasm multi-thread uses SharedArrayBuffer + Web Workers. Requires:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`

These headers are configured in `vite.config.ts` (dev) and must be set by the CFML host (production).

If multi-thread fails, automatically falls back to single-thread.

### Export Progress Stages

```
"capturing"  → Frame capture (0-100%)
"writing"    → Write PNGs to FFmpeg FS (0-100%)
"encoding"   → libx264 encoding (0-100%, from FFmpeg progress)
"muxing"     → Audio muxing (brief)
"done"       → Download triggered
"error"      → Error message displayed
```

### Memory Considerations

- PNG data URLs: ~2-5 MB each at 1920x1080
- 100 frames (10 seconds at 30fps/3) ≈ 200-500 MB in memory
- TTS audio: ~48 KB/sec at 24kHz 16-bit mono, negligible
- All frame files cleaned up from FFmpeg FS after export

---

## PPT Export Pipeline

Alternative export path — generates a PowerPoint file from the same `VideoScript`.

```
VideoScript
  → exportPptx.ts (pptxgenjs)
    → Per scene: addSlide()
      → bgColor → slide.background
      → narration → slide.addNotes() (speaker notes)
      → elements → pptxgenjs API calls:
          text → addText()
          metric → addText() (big number + label)
          bar-chart → addChart(bar) [native, editable in PPT]
          pie-chart → addChart(pie/doughnut) [native]
          line-chart → addChart(line) [native]
          sankey → addTable() (no native sankey in PPT)
          list → addText() with bullets
          callout → addShape(roundRect) + addText()
          divider → addShape(rect)
          kawaii → caption text only (no SVG equivalent)
          lottie → skipped (no animation in PPT)
    → pres.writeFile() → browser download .pptx
```

### Layout Engine

Elements are positioned using a layout engine that calculates `x/y/w/h` (in inches) based on the scene's `layout` prop:
- **column**: stack vertically, full width
- **row**: side by side, equal width
- **center**: stack vertically, full width (same as column)

### Font Scaling

Video font sizes (96-128px for titles) are scaled by ×0.25 for PPT (→ 24-32pt), which maps correctly to 10" wide slides.

## TTS History Restore

When restoring a video from history, TTS audio is regenerated in the background:

```
History restore
  → setScript(script without audio) — video plays immediately (silent)
  → async: generateSceneTTS(scenes) — using saved narration text
  → setScript(script with audio) — audio available
```

User sees the video immediately; narration audio appears after ~3-5 seconds.
