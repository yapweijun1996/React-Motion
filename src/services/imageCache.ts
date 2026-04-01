/**
 * Image blob cache — persists AI-generated scene images in IndexedDB.
 *
 * Blob URLs (blob:http://...) are memory-only and lost on page reload.
 * This module stores the actual Blob binary so images survive
 * page refreshes and cache/history restores.
 *
 * Key format: "{prefix}:{sceneId}"
 * Prefix is:
 *   - "cache"        — for quick-restore cache (single last script)
 *   - "history-{id}" — for history entries
 */

import { openDB, STORE_IMAGE_CACHE } from "./db";
import { logWarn } from "./errors";
import type { VideoScene } from "../types";

// --- Types ---

type ImageEntry = {
  blob: Blob;
};

// --- Self-healing store creation ---

async function openDBWithImageStore(): Promise<IDBDatabase> {
  const db = await openDB();
  if (db.objectStoreNames.contains(STORE_IMAGE_CACHE)) {
    return db;
  }

  const nextVersion = db.version + 1;
  db.close();
  console.log(`[ImageCache] Store missing — upgrading DB to v${nextVersion}`);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open("react-motion", nextVersion);
    req.onupgradeneeded = () => {
      const upgradedDb = req.result;
      if (!upgradedDb.objectStoreNames.contains(STORE_IMAGE_CACHE)) {
        upgradedDb.createObjectStore(STORE_IMAGE_CACHE);
        console.log("[ImageCache] Created imageCache store");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      console.warn("[ImageCache] Upgrade blocked — will retry on next call");
      reject(new Error("DB upgrade blocked"));
    };
  });
}

// --- Public API ---

/**
 * Save scene image blobs to IndexedDB.
 * Fetches each scene's blob URL, stores the raw Blob.
 */
export async function saveImageBlobs(
  prefix: string,
  scenes: readonly VideoScene[],
): Promise<boolean> {
  const imageScenes = scenes.filter((s) => s.imageUrl);
  if (imageScenes.length === 0) return false;

  // Step 1: Fetch all blobs from blob URLs (outside IDB transaction)
  const entries: { key: string; blob: Blob }[] = [];
  for (const scene of imageScenes) {
    try {
      const res = await fetch(scene.imageUrl!);
      const blob = await res.blob();
      entries.push({ key: `${prefix}:${scene.id}`, blob });
    } catch {
      // Blob URL already revoked — skip
    }
  }

  if (entries.length === 0) return false;

  // Step 2: Write all in one IDB transaction
  try {
    const db = await openDBWithImageStore();
    const tx = db.transaction(STORE_IMAGE_CACHE, "readwrite");
    const store = tx.objectStore(STORE_IMAGE_CACHE);
    for (const e of entries) {
      store.put({ blob: e.blob }, e.key);
    }
    await idbTx(tx);
    db.close();
    console.log(`[ImageCache] Saved ${entries.length} images (${prefix})`);
    return true;
  } catch (err) {
    logWarn("ImageCache", "CACHE_SAVE_FAILED", `Failed to save images (${prefix})`,
      { error: err instanceof Error ? err.message : err });
    return false;
  }
}

/**
 * Restore scene images from IndexedDB into scene objects.
 * Creates new blob URLs for each restored image.
 */
export async function restoreImageBlobs(
  prefix: string,
  scenes: VideoScene[],
): Promise<VideoScene[]> {
  try {
    const db = await openDBWithImageStore();
    const tx = db.transaction(STORE_IMAGE_CACHE, "readonly");
    const store = tx.objectStore(STORE_IMAGE_CACHE);

    const lookups = scenes.map((scene) => ({
      sceneId: scene.id,
      req: store.get(`${prefix}:${scene.id}`) as IDBRequest<ImageEntry | undefined>,
    }));

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();

    let count = 0;
    const result = scenes.map((scene, i) => {
      const entry = lookups[i].req.result;
      if (!entry?.blob) return scene;
      count++;
      return {
        ...scene,
        imageUrl: URL.createObjectURL(entry.blob),
      };
    });

    if (count > 0) {
      console.log(`[ImageCache] Restored ${count} images (${prefix})`);
    }
    return result;
  } catch (err) {
    logWarn("ImageCache", "CACHE_LOAD_FAILED", `Failed to restore images (${prefix})`,
      { error: err instanceof Error ? err.message : err });
    return scenes;
  }
}

/**
 * Delete all image entries matching a prefix.
 */
export async function clearImageBlobs(prefix: string): Promise<void> {
  try {
    const db = await openDBWithImageStore();
    const tx = db.transaction(STORE_IMAGE_CACHE, "readwrite");
    const store = tx.objectStore(STORE_IMAGE_CACHE);

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
    logWarn("ImageCache", "UNKNOWN", `Failed to clear images (${prefix})`, { error: err });
  }
}

// --- Helpers ---

function idbTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
