# Data Lifecycle & Privacy Boundaries

React-Motion handles business data (reports, metrics, company information) and API credentials. This document defines what data is stored, where, how long, and how it's cleaned up.

## Storage Inventory

| Storage | Data | Location | TTL | Cleanup |
|---------|------|----------|-----|---------|
| IndexedDB | VideoScript + user prompt | Browser, `react-motion` DB | **7 days** | Auto-expire on load; manual via Settings |
| localStorage | API key (obfuscated), model selection | Browser, `react-motion-settings` key | None (manual) | Manual via Settings > Clear All Data |
| Blob URLs | TTS audio (WAV), export video (MP4) | Browser memory | Per-session | Revoked on unmount / after download |
| FFmpeg WASM | PNG frames, WAV audio, MP4 output | WASM virtual filesystem | During export | Deleted after export completes |
| Service Worker | Static assets only (JS, CSS, SVG) | Browser cache, `rm-cache-v1` | Until SW update | Old caches purged on activate |

## What is NOT stored

- Business data is never sent to any server other than the Gemini API
- Gemini API responses are not cached
- Export video files are not uploaded anywhere
- No analytics, telemetry, or tracking

## API Key Handling

| Aspect | Detail |
|--------|--------|
| **Storage** | localStorage, obfuscated (base64 of reversed key) |
| **Not plaintext** | Prevents casual exposure in DevTools storage tab |
| **Not encrypted** | Obfuscation is not a security boundary — any code on the same origin can decode it |
| **API call** | Key is passed as URL query parameter to Gemini API (`?key=...`) |
| **Recommendation** | For production deployment, move API key to server-side proxy (RM-55) |

### Clearing the API key

Users can clear the API key via **Settings > Clear All Data**. This removes:
- localStorage `react-motion-settings` entry
- IndexedDB `react-motion` database

## IndexedDB Cache

### What's cached
- The last generated `VideoScript` JSON (scenes, elements, theme)
- The user's prompt text (may contain business data)
- Timestamp of when it was saved

### What's stripped before caching
- `ttsAudioUrl` (blob URLs don't survive page reload)
- `ttsAudioDurationMs` (runtime-only)

### TTL Policy
- Default TTL: **7 days**
- On `loadScript()`: if entry is older than 7 days, it is automatically deleted and `null` is returned
- Manual clear: Settings > Clear Cached Scripts

### CFML Host Considerations
- When embedded in a CFML/Lucee app, IndexedDB is scoped to the host origin
- If the host serves multiple departments, they share the same cache namespace
- Consider using different origins for sensitive vs. non-sensitive data environments

## Blob URLs (TTS Audio)

| Event | Action |
|-------|--------|
| TTS generation | `URL.createObjectURL(wavBlob)` — stored in scene object |
| TTS error | `URL.revokeObjectURL()` on the failed blob |
| New generation | All existing scene audio blob URLs revoked before regenerating |
| Component unmount | All scene audio blob URLs revoked |
| Page reload | Blob URLs are automatically invalidated by the browser |
| Cache load | Blob URLs stripped (they don't persist) |

## Export (FFmpeg WASM)

During MP4 export, the following temporary data exists in FFmpeg's WASM virtual filesystem:

| Data | Created | Deleted |
|------|---------|---------|
| PNG frames (`frame_001.png`, ...) | Frame capture loop | After encoding completes |
| WAV audio per scene | Before audio muxing | After muxing completes |
| `output.mp4` | After video encoding | After blob creation |
| `output_with_audio.mp4` | After audio muxing | After rename to `output.mp4` |

All temp files are deleted in `finally` blocks to ensure cleanup even on error.

**Note**: FFmpeg WASM operates in memory. During export, PNG frames exist in WASM heap. A browser heap snapshot taken during export could expose frame data. This is inherent to browser-side video encoding.

## Console Logging

### What is logged
- Operation progress (stage names, timing, frame counts)
- API response metadata (length, status code, model name)
- Error messages and stack traces

### What is NOT logged
- User's business data or prompt text
- API keys
- Gemini API response content
- Mount config data

### Network Tab Visibility
- API key appears in Gemini API request URLs (query parameter `?key=...`)
- This is visible in browser DevTools Network tab
- Cannot be avoided with the current Gemini API (key-based auth, no Bearer token)

## User Controls

| Action | Location | Effect |
|--------|----------|--------|
| Clear Cached Scripts | Settings panel | Deletes IndexedDB cache |
| Clear All Data | Settings panel | Deletes IndexedDB + localStorage (API key + model) |
| Browser "Clear site data" | Browser settings | Clears everything (IndexedDB, localStorage, SW cache) |

## Recommendations for Production

1. **API Key Proxy (RM-55)**: Move Gemini API key to a server-side proxy. The widget calls your server; your server calls Gemini. This removes the key from the browser entirely.

2. **Content Security Policy**: Set CSP headers to restrict which origins can be contacted:
   ```
   connect-src 'self' https://generativelanguage.googleapis.com;
   ```

3. **Cache TTL Tuning**: The 7-day default can be adjusted in `cache.ts` (`DEFAULT_TTL_MS`). For highly sensitive environments, reduce to 24 hours or disable caching entirely.

4. **Audit Trail**: For compliance, consider RM-52 (JSONL logging) to record generation events (timestamps, model used, prompt hash — not prompt content).
