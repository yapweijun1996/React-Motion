/**
 * TTS & BGM audio blob cache — persists audio in IndexedDB.
 *
 * Blob URLs (blob:http://...) are memory-only and lost on page reload.
 * This module stores the actual Blob binary so audio survives
 * page refreshes and cache/history restores.
 *
 * Key format: "{prefix}:{sceneId}" for TTS, "{prefix}:bgm" for BGM.
 * Prefix is:
 *   - "cache"        — for quick-restore cache (single last script)
 *   - "history-{id}" — for history entries
 */

import { openDB, STORE_TTS_AUDIO } from "./db";
import { logWarn } from "./errors";
import type { VideoScene, VideoScript } from "../types";

// --- Types ---

type TTSAudioEntry = {
  blob: Blob;
  durationMs: number;
};

// --- Self-healing store creation ---

/**
 * Open DB and ensure ttsAudio store exists.
 * If the store is missing (upgrade was blocked), force-creates it
 * by reopening at current version + 1.
 */
async function openDBWithTTSStore(): Promise<IDBDatabase> {
  const db = await openDB();
  if (db.objectStoreNames.contains(STORE_TTS_AUDIO)) {
    return db;
  }

  // Store missing — force upgrade to create it
  const nextVersion = db.version + 1;
  db.close();
  console.log(`[TTSCache] Store missing — upgrading DB to v${nextVersion}`);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open("react-motion", nextVersion);
    req.onupgradeneeded = () => {
      const upgradedDb = req.result;
      if (!upgradedDb.objectStoreNames.contains(STORE_TTS_AUDIO)) {
        upgradedDb.createObjectStore(STORE_TTS_AUDIO);
        console.log("[TTSCache] Created ttsAudio store");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      console.warn("[TTSCache] Upgrade blocked — will retry on next call");
      reject(new Error("DB upgrade blocked"));
    };
  });
}

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
    const db = await openDBWithTTSStore();
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
    const db = await openDBWithTTSStore();
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
    const db = await openDBWithTTSStore();
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

// --- BGM Audio Persistence ---

/**
 * Save BGM audio blob to IndexedDB.
 * Key: "{prefix}:bgm" — single entry per script.
 */
export async function saveBGMAudio(
  prefix: string,
  script: VideoScript,
): Promise<boolean> {
  if (!script.bgMusicUrl) return false;

  try {
    const res = await fetch(script.bgMusicUrl);
    const blob = await res.blob();

    const db = await openDBWithTTSStore();
    const tx = db.transaction(STORE_TTS_AUDIO, "readwrite");
    tx.objectStore(STORE_TTS_AUDIO).put(
      { blob, durationMs: script.bgMusicDurationMs ?? 0 },
      `${prefix}:bgm`,
    );
    await idbTx(tx);
    db.close();
    console.log(`[BGMCache] Saved BGM audio (${prefix})`);
    return true;
  } catch (err) {
    logWarn("BGMCache", "CACHE_SAVE_FAILED", `Failed to save BGM audio (${prefix})`,
      { error: err instanceof Error ? err.message : err });
    return false;
  }
}

/**
 * Restore BGM audio from IndexedDB into a script object.
 * Creates a fresh blob URL from the stored Blob.
 */
export async function restoreBGMAudio(
  prefix: string,
  script: VideoScript,
): Promise<VideoScript> {
  try {
    const db = await openDBWithTTSStore();
    const tx = db.transaction(STORE_TTS_AUDIO, "readonly");
    const store = tx.objectStore(STORE_TTS_AUDIO);
    const req = store.get(`${prefix}:bgm`) as IDBRequest<TTSAudioEntry | undefined>;

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    const entry = req.result;
    if (!entry?.blob) return script;

    console.log(`[BGMCache] Restored BGM audio (${prefix})`);
    return {
      ...script,
      bgMusicUrl: URL.createObjectURL(entry.blob),
      bgMusicDurationMs: entry.durationMs,
    };
  } catch (err) {
    logWarn("BGMCache", "CACHE_LOAD_FAILED", `Failed to restore BGM audio (${prefix})`,
      { error: err instanceof Error ? err.message : err });
    return script;
  }
}

// --- Helpers ---

function idbTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
