# Render & Export Flow

## Preview (Browser)

Remotion `<Player>` renders the `ReportComposition` in the browser. No server needed.

```
VideoScript
  → ReportComposition.tsx
    → TransitionSeries (scene sequencing + transitions)
      → GenericScene (layout + element routing)
        → 9 element renderers (text, metric, bar-chart, etc.)
      → <Audio> (TTS narration per scene, blob URL)
    → Progress bar (bottom, theme color)
```

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

Each scene's `ttsAudioUrl` (blob URL to WAV) is passed to Remotion's `<Audio>` component inside `<TransitionSeries.Sequence>`. Audio plays automatically when the scene's sequence is active.

---

## Export Pipeline

Export uses a completely separate path from preview — no screen recording.

```
Step 1: Frame Capture
  Remotion Player (hidden, full resolution 1920x1080)
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
