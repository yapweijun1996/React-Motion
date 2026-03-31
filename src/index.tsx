import { createRoot } from "react-dom/client";
import { App } from "./App";
import type { MountConfig } from "./types";

function mount(el: HTMLElement, config?: MountConfig) {
  const safeConfig = config ?? {};

  console.group("[ReactMotion] mount");
  console.log("Element:", el);
  console.log("Config:", JSON.stringify(safeConfig, null, 2));
  console.log("Has structured data:", !!safeConfig.data);
  console.groupEnd();

  const root = createRoot(el);
  root.render(<App config={safeConfig} />);

  return {
    unmount: () => root.unmount(),
  };
}

// Expose to global scope for CFML integration
(window as unknown as Record<string, unknown>).ReactMotion = { mount };

// Dev mode: auto-mount with no hardcoded data — user provides everything via prompt
if (import.meta.env.DEV) {
  const root = document.getElementById("root");
  if (root) {
    mount(root);
  }
}

export { mount };
export type { MountConfig } from "./types";
