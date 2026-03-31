import { validateSettings, type AppSettings } from "./validate";

export type { AppSettings } from "./validate";

const STORAGE_KEY = "react-motion-settings";

const AVAILABLE_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
  { id: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro" },
] as const;

export function getAvailableModels() {
  return AVAILABLE_MODELS;
}

/** Read settings from localStorage. Missing fields fall back to env vars. */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let stored: Partial<StoredSettings> = {};
    if (raw) {
      try {
        stored = JSON.parse(raw) as Partial<StoredSettings>;
      } catch {
        console.warn("[Settings] Corrupt JSON in localStorage, using defaults");
      }
    }

    const merged = {
      geminiApiKey:
        deobfuscate(stored.k) ||
        import.meta.env.DEVELOPMENT_GEMINI_API_KEY ||
        import.meta.env.VITE_GEMINI_API_KEY ||
        "",
      geminiModel:
        stored.geminiModel ||
        import.meta.env.DEVELOPMENT_GEMINI_MODEL ||
        import.meta.env.VITE_GEMINI_MODEL ||
        "gemini-2.0-flash",
      ttsConcurrency: stored.ttsConcurrency ?? 2,
    };

    const result = validateSettings(merged);
    if (!result.ok) {
      console.warn("[Settings] Validation failed:", result.errors);
      return getDefaults();
    }
    if (result.warnings.length > 0) {
      console.warn("[Settings]", result.warnings);
    }
    return result.data;
  } catch {
    return getDefaults();
  }
}

/** Persist user-chosen settings to localStorage. */
export function saveSettings(settings: AppSettings): void {
  const result = validateSettings(settings);
  if (!result.ok) {
    console.warn("[Settings] Refusing to save invalid settings:", result.errors);
    return;
  }

  try {
    const stored: StoredSettings = {
      k: obfuscate(result.data.geminiApiKey),
      geminiModel: result.data.geminiModel,
      ttsConcurrency: result.data.ttsConcurrency,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.warn("[Settings] Save failed:", err);
  }
}

/** Check whether a usable API key exists (from settings or env). */
export function hasApiKey(): boolean {
  return loadSettings().geminiApiKey.length > 0;
}

/** Remove all settings from localStorage. */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[Settings] Cleared");
  } catch {
    // Ignore
  }
}

// --- Internal ---

/** On-disk shape — API key stored as obfuscated 'k' field, not plaintext 'geminiApiKey' */
type StoredSettings = {
  k?: string;
  geminiModel?: string;
  ttsConcurrency?: number;
  // Legacy field — read for migration then discard
  geminiApiKey?: string;
};

function getDefaults(): AppSettings {
  return {
    geminiApiKey:
      import.meta.env.DEVELOPMENT_GEMINI_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      "",
    geminiModel:
      import.meta.env.DEVELOPMENT_GEMINI_MODEL ||
      import.meta.env.VITE_GEMINI_MODEL ||
      "gemini-2.0-flash",
    ttsConcurrency: 2,
  };
}

/**
 * Simple obfuscation: reverse + base64.
 * NOT encryption — just prevents API key from appearing in plaintext
 * when inspecting localStorage in DevTools or extensions scanning storage.
 */
function obfuscate(value: string): string {
  if (!value) return "";
  const reversed = value.split("").reverse().join("");
  return btoa(reversed);
}

function deobfuscate(value: string | undefined): string {
  if (!value) return "";
  try {
    return atob(value).split("").reverse().join("");
  } catch {
    // If decode fails, treat as legacy plaintext
    return value;
  }
}
