/**
 * Quick-restore cache — saves/loads the LAST generated script.
 *
 * This is the fast-path for page reload: restore the most recent script
 * instantly without browsing history. Separate from historyStore which
 * manages the full list.
 *
 * Uses the shared DB from db.ts (v2 schema).
 */

import { openDB, STORE_SCRIPTS } from "./db";
import { logWarn } from "./errors";
import { saveTTSAudio, restoreTTSAudio, clearTTSAudio } from "./ttsCache";
import type { VideoScript } from "../types";

const LAST_SCRIPT_KEY = "last-script";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// --- Types ---

export type CachedEntry = {
  script: VideoScript;
  prompt: string;
  savedAt: number;
};

// --- Public API ---

/** Save the latest script for quick restore on page reload. */
export async function saveScript(script: VideoScript, prompt: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SCRIPTS, "readwrite");
    const store = tx.objectStore(STORE_SCRIPTS);

    const cleanScript = stripBlobUrls(script);
    store.put({ script: cleanScript, prompt, savedAt: Date.now() }, LAST_SCRIPT_KEY);

    await idbTx(tx);
    db.close();

    // Persist TTS audio blobs separately (blob URLs can't be serialized)
    const audioSaved = await saveTTSAudio("cache", script.scenes);
    console.log(`[Cache] Saved last script${audioSaved ? " + TTS audio" : ""}`);
  } catch (err) {
    logWarn("Cache", "CACHE_SAVE_FAILED", "Save failed", { error: err });
  }
}

/** Load the last saved script (quick restore). Returns null if expired or missing. */
export async function loadScript(): Promise<CachedEntry | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SCRIPTS, "readonly");
    const store = tx.objectStore(STORE_SCRIPTS);

    const result = await idbRequest<CachedEntry | undefined>(store.get(LAST_SCRIPT_KEY));
    db.close();

    if (!result) return null;

    // TTL check
    const age = Date.now() - result.savedAt;
    if (age > DEFAULT_TTL_MS) {
      console.log("[Cache] Expired — clearing");
      await clearCache();
      return null;
    }

    // Deep clone
    const script: VideoScript = JSON.parse(JSON.stringify(result.script));

    // Restore TTS audio blobs from IndexedDB
    script.scenes = await restoreTTSAudio("cache", script.scenes);

    const ageMin = (age / 60000).toFixed(0);
    const audioCount = script.scenes.filter((s) => s.ttsAudioUrl).length;
    console.log(`[Cache] Loaded last script (${ageMin} min old, ${audioCount} audio tracks)`);
    return { script, prompt: result.prompt, savedAt: result.savedAt };
  } catch (err) {
    logWarn("Cache", "CACHE_LOAD_FAILED", "Load failed", { error: err });
    return null;
  }
}

/** Clear the quick-restore cache. */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SCRIPTS, "readwrite");
    tx.objectStore(STORE_SCRIPTS).clear();
    await idbTx(tx);
    db.close();
    await clearTTSAudio("cache");
  } catch (err) {
    logWarn("Cache", "UNKNOWN", "Clear failed", { error: err });
  }
}

// --- Helpers ---

/** Strip blob URLs (not serializable), but KEEP durationMs (timing metadata). */
function stripBlobUrls(script: VideoScript): VideoScript {
  return {
    ...script,
    scenes: script.scenes.map((s) => ({
      ...s,
      ttsAudioUrl: undefined,
      // Keep ttsAudioDurationMs — used for scene timing on restore
    })),
  };
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
