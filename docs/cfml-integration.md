# CFML / Lucee Integration Guide

## Overview

React-Motion is packaged as a single IIFE bundle for embedding in CFML/Lucee applications. The host page loads the bundle via `<script>` tag and calls `ReactMotion.mount()`.

## Build Output

```
dist/
├── react-motion.iife.js    # ~45 MB (includes all deps, React, D3, FFmpeg refs)
├── react-motion.css         # ~7 KB
└── assets/worker-*.js       # Web worker (FFmpeg)
```

Build command: `npm run build`

## Embedding

### Minimal Setup

```html
<div id="react-motion-root"></div>
<link rel="stylesheet" href="/assets/react-motion/react-motion.css">
<script src="/assets/react-motion/react-motion.iife.js"></script>
<script>
  ReactMotion.mount(document.getElementById('react-motion-root'));
</script>
```

### With Business Data

```html
<script>
  ReactMotion.mount(document.getElementById('react-motion-root'), {
    data: {
      title: "Q1 Sales Report",
      rows: #serializeJSON(queryData)#,
      columns: [
        { key: "region", label: "Region", type: "string" },
        { key: "revenue", label: "Revenue", type: "number" }
      ]
    },
    options: {
      lang: "zh",
      theme: "corporate"
    }
  });
</script>
```

### Unmounting

```javascript
const instance = ReactMotion.mount(el, config);
// Later:
instance.unmount();
```

## Mount API

```typescript
function mount(el: HTMLElement, config?: MountConfig): { unmount: () => void }

type MountConfig = {
  data?: BusinessData;
  options?: WidgetOptions;
};

type WidgetOptions = {
  lang?: "en" | "zh";
  theme?: "corporate" | "modern" | "minimal";
};

type BusinessData = {
  title?: string;
  rows?: Record<string, unknown>[];
  columns?: ColumnDef[];
  aggregations?: Aggregation[];
  chartConfig?: ChartConfig;
};
```

All fields are optional. If no `data` is provided, the user can paste data directly into the prompt textarea.

## Required Headers (Production)

FFmpeg.wasm multi-thread requires SharedArrayBuffer, which needs COOP/COEP headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

### Lucee/CFML Example

```cfml
<cfheader name="Cross-Origin-Opener-Policy" value="same-origin">
<cfheader name="Cross-Origin-Embedder-Policy" value="credentialless">
```

### Apache (.htaccess)

```apache
Header set Cross-Origin-Opener-Policy "same-origin"
Header set Cross-Origin-Embedder-Policy "credentialless"
```

### IIS (web.config)

```xml
<httpProtocol>
  <customHeaders>
    <add name="Cross-Origin-Opener-Policy" value="same-origin" />
    <add name="Cross-Origin-Embedder-Policy" value="credentialless" />
  </customHeaders>
</httpProtocol>
```

Without these headers, export falls back to single-thread FFmpeg (slower but functional).

## API Key Configuration

The widget needs a Gemini API key. Three options:

1. **Settings panel** (recommended for dev): User enters key via gear icon -> stored in localStorage
2. **Environment variable**: Set in `.env.local` (dev only, never ship to production)
3. **Server proxy** (recommended for production): Route API calls through CFML backend to hide key

Current MVP uses option 1 or 2. For production deployment (RM-55), implement a server-side proxy.

## Gotchas

| Issue | Solution |
|-------|----------|
| Widget shows blank | Check that `el` exists in DOM before calling `mount()` |
| No video player | Container must have non-zero dimensions for VideoPlayer to render |
| Export slow | Add COOP/COEP headers to enable multi-thread FFmpeg |
| API key exposed | Move to server-side proxy for production |
| Large bundle (~44MB) | Mostly FFmpeg WASM. Consider lazy loading or CDN caching. |
| Multiple mounts | Each `mount()` creates an independent React root. Unmount before re-mounting to same element. |
