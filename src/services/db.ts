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
    // Open without version first — avoids VersionError when ttsCache
    // self-healing has bumped the DB version beyond DB_VERSION.
    const probe = indexedDB.open(DB_NAME);

    probe.onsuccess = () => {
      const db = probe.result;
      const currentVersion = db.version;

      // DB already at or above our schema version — use as-is if all stores exist
      if (currentVersion >= DB_VERSION && hasAllStores(db)) {
        db.onversionchange = () => { db.close(); };
        resolve(db);
        return;
      }

      // Need upgrade — close probe and reopen with target version
      db.close();
      const targetVersion = Math.max(DB_VERSION, currentVersion + 1);
      const req = indexedDB.open(DB_NAME, targetVersion);

      req.onupgradeneeded = (event) => {
        const udb = req.result;
        const oldVersion = event.oldVersion;

        if (oldVersion < 1 && !udb.objectStoreNames.contains(STORE_SCRIPTS)) {
          udb.createObjectStore(STORE_SCRIPTS);
        }
        if (oldVersion < 2) {
          if (!udb.objectStoreNames.contains(STORE_HISTORY)) {
            const hs = udb.createObjectStore(STORE_HISTORY, { keyPath: "id", autoIncrement: true });
            hs.createIndex("createdAt", "createdAt", { unique: false });
          }
          if (!udb.objectStoreNames.contains(STORE_EXPORTS)) {
            const es = udb.createObjectStore(STORE_EXPORTS, { keyPath: "id", autoIncrement: true });
            es.createIndex("exportedAt", "exportedAt", { unique: false });
          }
        }
        if (oldVersion < 3 && !udb.objectStoreNames.contains(STORE_METRICS)) {
          const ms = udb.createObjectStore(STORE_METRICS, { keyPath: "id", autoIncrement: true });
          ms.createIndex("timestamp", "timestamp", { unique: false });
          ms.createIndex("type", "type", { unique: false });
        }
        if (!udb.objectStoreNames.contains(STORE_TTS_AUDIO)) {
          udb.createObjectStore(STORE_TTS_AUDIO);
        }
      };

      req.onblocked = () => console.warn("[DB] Upgrade blocked");
      req.onsuccess = () => {
        const udb = req.result;
        udb.onversionchange = () => { udb.close(); };
        resolve(udb);
      };
      req.onerror = () => reject(req.error);
    };

    probe.onerror = () => reject(probe.error);
  });
}

const ALL_STORES = [STORE_SCRIPTS, STORE_HISTORY, STORE_EXPORTS, STORE_METRICS, STORE_TTS_AUDIO];
function hasAllStores(db: IDBDatabase): boolean {
  return ALL_STORES.every((s) => db.objectStoreNames.contains(s));
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
