import type { VideoScript } from "../types";

const DB_NAME = "react-motion";
const DB_VERSION = 1;
const STORE_NAME = "scripts";
const LAST_SCRIPT_KEY = "last-script";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveScript(script: VideoScript, prompt: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({ script, prompt, savedAt: Date.now() }, LAST_SCRIPT_KEY);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log("[Cache] Script saved to IndexedDB");
    db.close();
  } catch (err) {
    console.warn("[Cache] Failed to save:", err);
  }
}

type CachedEntry = {
  script: VideoScript;
  prompt: string;
  savedAt: number;
};

export async function loadScript(): Promise<CachedEntry | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const result = await new Promise<CachedEntry | null>((resolve, reject) => {
      const req = store.get(LAST_SCRIPT_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });

    db.close();

    if (result) {
      const age = ((Date.now() - result.savedAt) / 1000 / 60).toFixed(0);
      console.log(`[Cache] Loaded script from IndexedDB (${age} min ago)`);
    }

    return result;
  } catch (err) {
    console.warn("[Cache] Failed to load:", err);
    return null;
  }
}
