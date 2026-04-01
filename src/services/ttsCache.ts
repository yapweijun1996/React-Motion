/**
 * TTS audio blob cache — persists WAV audio in IndexedDB.
 *
 * Blob URLs (blob:http://...) are memory-only and lost on page reload.
 * This module stores the actual WAV Blob binary so audio survives
 * page refreshes and cache/history restores.
 *
 * Key format: "{prefix}:{sceneId}" where prefix is:
 *   - "cache"        — for quick-restore cache (single last script)
 *   - "history-{id}" — for history entries
 */

import { openDB, STORE_TTS_AUDIO } from "./db";
import { logWarn } from "./errors";
import type { VideoScene } from "../types";

// --- Types ---

type TTSAudioEntry = {
  blob: Blob;
  durationMs: number;
};

// --- Public API ---

/**
 * Save TTS audio blobs to IndexedDB.
 * Fetches each scene's blob URL, stores the raw Blob.
 */
export async function saveTTSAudio(
  prefix: string,
  scenes: readonly VideoScene[],
): Promise<boolean> {
  const audioScenes = scenes.filter((s) => s.ttsAudioUrl);
  if (audioScenes.length === 0) return false;

  // Step 1: Fetch all blobs from blob URLs (outside IDB transaction)
  const entries: { key: string; blob: Blob; durationMs: number }[] = [];
  for (const scene of audioScenes) {
    try {
      const res = await fetch(scene.ttsAudioUrl!);
      const blob = await res.blob();
      entries.push({
        key: `${prefix}:${scene.id}`,
        blob,
        durationMs: scene.ttsAudioDurationMs ?? 0,
      });
    } catch {
      // Blob URL already revoked — skip
    }
  }

  if (entries.length === 0) return false;

  // Step 2: Write all in one IDB transaction
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(STORE_TTS_AUDIO)) {
      console.warn("[TTSCache] Store not found — skipping save");
      db.close();
      return false;
    }
    const tx = db.transaction(STORE_TTS_AUDIO, "readwrite");
    const store = tx.objectStore(STORE_TTS_AUDIO);
    for (const e of entries) {
      store.put({ blob: e.blob, durationMs: e.durationMs }, e.key);
    }
    await idbTx(tx);
    db.close();
    console.log(`[TTSCache] Saved ${entries.length} audio tracks (${prefix})`);
    return true;
  } catch (err) {
    logWarn("TTSCache", "CACHE_SAVE_FAILED", `Failed to save TTS audio (${prefix})`,
      { error: err instanceof Error ? err.message : err });
    return false;
  }
}

/**
 * Restore TTS audio from IndexedDB into scene objects.
 * Creates new blob URLs for each restored audio track.
 * Returns scenes with ttsAudioUrl + ttsAudioDurationMs populated.
 */
export async function restoreTTSAudio(
  prefix: string,
  scenes: VideoScene[],
): Promise<VideoScene[]> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(STORE_TTS_AUDIO)) {
      console.warn("[TTSCache] Store not found — skipping restore");
      db.close();
      return scenes;
    }
    const tx = db.transaction(STORE_TTS_AUDIO, "readonly");
    const store = tx.objectStore(STORE_TTS_AUDIO);

    // Fire all get requests synchronously within the transaction
    const lookups = scenes.map((scene) => ({
      sceneId: scene.id,
      req: store.get(`${prefix}:${scene.id}`) as IDBRequest<TTSAudioEntry | undefined>,
    }));

    // Wait for transaction to complete (all reads finish)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();

    // Rebuild blob URLs from stored blobs
    let count = 0;
    const result = scenes.map((scene, i) => {
      const entry = lookups[i].req.result;
      if (!entry?.blob) return scene;
      count++;
      return {
        ...scene,
        ttsAudioUrl: URL.createObjectURL(entry.blob),
        ttsAudioDurationMs: entry.durationMs,
      };
    });

    if (count > 0) {
      console.log(`[TTSCache] Restored ${count} audio tracks (${prefix})`);
    }
    return result;
  } catch (err) {
    logWarn("TTSCache", "CACHE_LOAD_FAILED", `Failed to restore TTS audio (${prefix})`,
      { error: err instanceof Error ? err.message : err });
    return scenes;
  }
}

/**
 * Delete all TTS audio entries matching a prefix.
 * Used when cache expires or history entry is deleted.
 */
export async function clearTTSAudio(prefix: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TTS_AUDIO, "readwrite");
    const store = tx.objectStore(STORE_TTS_AUDIO);

    // Iterate all keys, delete matching prefix
    const cursor = store.openCursor();
    await new Promise<void>((resolve, reject) => {
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) { resolve(); return; }
        const key = c.key as string;
        if (typeof key === "string" && key.startsWith(`${prefix}:`)) {
          c.delete();
        }
        c.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });

    await idbTx(tx);
    db.close();
  } catch (err) {
    logWarn("TTSCache", "UNKNOWN", `Failed to clear TTS audio (${prefix})`, { error: err });
  }
}

// --- Helpers ---

function idbTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
