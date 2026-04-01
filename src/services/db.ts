/**
 * Shared IndexedDB connection with schema migration.
 *
 * v1: "scripts" store (single last-script key)
 * v2: + "history" store (auto-increment, index on createdAt)
 *     + "exports" store (auto-increment, index on exportedAt)
 */

const DB_NAME = "react-motion";
const DB_VERSION = 4;

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

      // v1: scripts store
      if (oldVersion < 1) {
        db.createObjectStore(STORE_SCRIPTS);
      }

      // v2: history + exports
      if (oldVersion < 2) {
        const historyStore = db.createObjectStore(STORE_HISTORY, {
          keyPath: "id",
          autoIncrement: true,
        });
        historyStore.createIndex("createdAt", "createdAt", { unique: false });

        const exportsStore = db.createObjectStore(STORE_EXPORTS, {
          keyPath: "id",
          autoIncrement: true,
        });
        exportsStore.createIndex("exportedAt", "exportedAt", { unique: false });
      }

      // v3: metrics store
      if (oldVersion < 3) {
        const metricsStore = db.createObjectStore(STORE_METRICS, {
          keyPath: "id",
          autoIncrement: true,
        });
        metricsStore.createIndex("timestamp", "timestamp", { unique: false });
        metricsStore.createIndex("type", "type", { unique: false });
      }

      // v4: TTS audio blob store (key = "cache:scene-0" or "history-5:scene-0")
      if (oldVersion < 4) {
        db.createObjectStore(STORE_TTS_AUDIO);
      }
    };

    // Handle blocked upgrade — another tab/connection holds the old version.
    // Close stale connections so the version upgrade can proceed.
    req.onblocked = () => {
      console.warn("[DB] Upgrade blocked — closing stale connections");
    };

    req.onsuccess = () => {
      const db = req.result;
      // If another openDB() call triggers an upgrade later, close this connection
      // so it doesn't block the upgrade.
      db.onversionchange = () => {
        db.close();
        console.log("[DB] Closed connection due to version change");
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
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
