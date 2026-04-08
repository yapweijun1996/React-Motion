/**
 * History store — persists generated scripts with TTS metadata.
 *
 * Each entry stores:
 * - prompt + script (without blob URLs)
 * - TTS metadata per scene (narration text + duration, NOT audio blobs)
 * - timestamp
 *
 * On restore, TTS can be regenerated from the saved narration text.
 * Max 50 entries, FIFO eviction.
 */

import { openDB, STORE_HISTORY, STORE_TTS_AUDIO, STORE_IMAGE_CACHE } from "./db";
import { logWarn } from "./errors";
import { saveTTSAudio, restoreTTSAudio, clearTTSAudio, saveBGMAudio, restoreBGMAudio } from "./ttsCache";
import { saveImageBlobs, restoreImageBlobs, clearImageBlobs } from "./imageCache";
import type { VideoScript, VideoScene } from "../types";

const MAX_ENTRIES = 50;

// --- Types ---

export type TTSMetadata = {
  sceneId: string;
  narration: string;
  durationMs: number;
};

export type HistoryEntry = {
  id?: number;               // auto-increment key
  prompt: string;
  script: VideoScript;       // stripped of runtime blob URLs
  ttsMetadata: TTSMetadata[];
  createdAt: number;
  costUsd?: number;          // total generation cost in USD (legacy, kept for compat)
  costBreakdown?: Record<string, number>; // per-category breakdown (legacy)
  costSummary?: import("./costTracker").CostSummary; // full v2 cost summary
};

// --- Public API ---

/** Save a generated script + TTS metadata to history. */
export async function saveToHistory(
  prompt: string,
  script: VideoScript,
  cost?: { totalUsd: number; breakdown: Record<string, number> },
  costSummary?: import("./costTracker").CostSummary,
): Promise<number | undefined> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    const store = tx.objectStore(STORE_HISTORY);

    const entry: HistoryEntry = {
      prompt,
      script: stripBlobUrls(script),
      ttsMetadata: extractTTSMetadata(script.scenes),
      createdAt: Date.now(),
      ...(cost ? { costUsd: cost.totalUsd, costBreakdown: cost.breakdown } : {}),
      ...(costSummary ? { costSummary } : {}),
    };

    const id = await idbRequest<IDBValidKey>(store.add(entry)) as number;

    await idbTx(tx);
    db.close();

    // Persist blobs
    const audioSaved = await saveTTSAudio(`history-${id}`, script.scenes);
    const bgmSaved = await saveBGMAudio(`history-${id}`, script);
    const imgSaved = await saveImageBlobs(`history-${id}`, script.scenes);

    // Evict oldest if over limit
    await evictOldest();

    console.log(`[History] Saved entry #${id}${audioSaved ? " + TTS" : ""}${bgmSaved ? " + BGM" : ""}${imgSaved ? " + IMG" : ""}`);
    return id;
  } catch (err) {
    logWarn("History", "CACHE_SAVE_FAILED", "Failed to save history entry", { error: err });
    return undefined;
  }
}

/** Load all history entries, newest first. */
export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, "readonly");
    const store = tx.objectStore(STORE_HISTORY);

    const entries = await idbRequest<HistoryEntry[]>(store.getAll());
    db.close();

    // Sort newest first
    entries.sort((a, b) => b.createdAt - a.createdAt);
    return entries;
  } catch (err) {
    logWarn("History", "CACHE_LOAD_FAILED", "Failed to load history", { error: err });
    return [];
  }
}

/** Load a single history entry by ID. */
export async function loadHistoryEntry(id: number): Promise<HistoryEntry | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, "readonly");
    const store = tx.objectStore(STORE_HISTORY);

    const entry = await idbRequest<HistoryEntry | undefined>(store.get(id));
    db.close();
    if (!entry) return null;

    // Restore blobs from IndexedDB
    entry.script.scenes = await restoreTTSAudio(`history-${id}`, entry.script.scenes);
    entry.script = await restoreBGMAudio(`history-${id}`, entry.script);
    entry.script.scenes = await restoreImageBlobs(`history-${id}`, entry.script.scenes);
    return entry;
  } catch (err) {
    logWarn("History", "CACHE_LOAD_FAILED", `Failed to load history #${id}`, { error: err });
    return null;
  }
}

/** Delete a history entry by ID. */
export async function deleteHistoryEntry(id: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    tx.objectStore(STORE_HISTORY).delete(id);
    await idbTx(tx);
    db.close();
    await clearTTSAudio(`history-${id}`);
    await clearImageBlobs(`history-${id}`);
    console.log(`[History] Deleted entry #${id} + TTS audio + images`);
  } catch (err) {
    logWarn("History", "UNKNOWN", `Failed to delete history #${id}`, { error: err });
  }
}

/** Clear all history entries AND all associated TTS/BGM/image blobs. */
export async function clearHistory(): Promise<void> {
  try {
    const db = await openDB();
    const stores = [STORE_HISTORY, STORE_TTS_AUDIO, STORE_IMAGE_CACHE];
    const tx = db.transaction(stores, "readwrite");
    for (const name of stores) {
      tx.objectStore(name).clear();
    }
    await idbTx(tx);
    db.close();
    console.log("[History] Cleared all entries + TTS audio + images");
  } catch (err) {
    logWarn("History", "UNKNOWN", "Failed to clear history", { error: err });
  }
}

// --- Helpers ---

/** Strip blob URLs (not serializable), but KEEP durationMs (timing metadata). */
function stripBlobUrls(script: VideoScript): VideoScript {
  return {
    ...script,
    bgMusicUrl: undefined, // blob URLs can't be serialized; persisted separately
    scenes: script.scenes.map((s) => ({
      ...s,
      ttsAudioUrl: undefined,
      imageUrl: undefined,
      // Keep ttsAudioDurationMs + bgMusicDurationMs — used for timing on restore
    })),
  };
}

function extractTTSMetadata(scenes: VideoScene[]): TTSMetadata[] {
  return scenes
    .filter((s) => s.narration?.trim() && s.ttsAudioDurationMs)
    .map((s) => ({
      sceneId: s.id,
      narration: s.narration!,
      durationMs: s.ttsAudioDurationMs!,
    }));
}

async function evictOldest(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    const store = tx.objectStore(STORE_HISTORY);
    const index = store.index("createdAt");

    const count = await idbRequest<number>(store.count());
    if (count <= MAX_ENTRIES) {
      db.close();
      return;
    }

    const toDelete = count - MAX_ENTRIES;
    const cursor = index.openCursor(); // oldest first (ascending)
    let deleted = 0;

    await new Promise<void>((resolve, reject) => {
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c || deleted >= toDelete) {
          resolve();
          return;
        }
        c.delete();
        deleted++;
        c.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });

    await idbTx(tx);
    db.close();
    if (deleted > 0) console.log(`[History] Evicted ${deleted} oldest entries`);
  } catch (err) {
    logWarn("History", "UNKNOWN", "Eviction failed", { error: err });
  }
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
