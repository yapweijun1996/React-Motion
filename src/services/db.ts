/**
 * Shared IndexedDB connection with schema migration.
 *
 * v1: "scripts" store (single last-script key)
 * v2: + "history" store (auto-increment, index on createdAt)
 *     + "exports" store (auto-increment, index on exportedAt)
 */

const DB_NAME = "react-motion";
const DB_VERSION = 6;

export const STORE_SCRIPTS = "scripts";
export const STORE_HISTORY = "history";
export const STORE_EXPORTS = "exports";
export const STORE_METRICS = "metrics";
export const STORE_TTS_AUDIO = "ttsAudio";

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        db.createObjectStore(STORE_SCRIPTS);
      }
      if (oldVersion < 2) {
        const hs = db.createObjectStore(STORE_HISTORY, { keyPath: "id", autoIncrement: true });
        hs.createIndex("createdAt", "createdAt", { unique: false });
        const es = db.createObjectStore(STORE_EXPORTS, { keyPath: "id", autoIncrement: true });
        es.createIndex("exportedAt", "exportedAt", { unique: false });
      }
      if (oldVersion < 3) {
        const ms = db.createObjectStore(STORE_METRICS, { keyPath: "id", autoIncrement: true });
        ms.createIndex("timestamp", "timestamp", { unique: false });
        ms.createIndex("type", "type", { unique: false });
      }
      // Defensive: always ensure ttsAudio exists (handles blocked upgrade edge cases)
      if (!db.objectStoreNames.contains(STORE_TTS_AUDIO)) {
        db.createObjectStore(STORE_TTS_AUDIO);
      }
    };

    req.onblocked = () => console.warn("[DB] Upgrade blocked");

    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); };
      resolve(db);
    };

    req.onerror = () => {
      const err = req.error;
      // VersionError: DB was upgraded beyond DB_VERSION by ttsCache self-healing.
      // Retry without version constraint to open at current version.
      if (err?.name === "VersionError") {
        console.log("[DB] VersionError — reopening at current version");
        const retry = indexedDB.open(DB_NAME);
        retry.onsuccess = () => {
          const db = retry.result;
          db.onversionchange = () => { db.close(); };
          resolve(db);
        };
        retry.onerror = () => reject(retry.error);
      } else {
        reject(err);
      }
    };
  });
}

/** Delete the entire IndexedDB database. */
export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => {
      console.log("[DB] Database deleted");
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}
