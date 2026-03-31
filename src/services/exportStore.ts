/**
 * Export records store — tracks exported MP4 metadata.
 *
 * Does NOT store the MP4 blob (too large for IndexedDB).
 * Only records: filename, size, duration, timestamp, linked history ID.
 */

import { openDB, STORE_EXPORTS } from "./db";
import { logWarn } from "./errors";

// --- Types ---

export type ExportRecord = {
  id?: number;
  historyId?: number;       // link to history entry (if available)
  title: string;
  filename: string;
  sizeMB: number;
  durationSec: number;
  exportedAt: number;
};

// --- Public API ---

/** Record a successful export. */
export async function saveExportRecord(record: Omit<ExportRecord, "id">): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPORTS, "readwrite");
    tx.objectStore(STORE_EXPORTS).add(record);
    await idbTx(tx);
    db.close();
    console.log(`[Exports] Recorded: ${record.filename} (${record.sizeMB}MB)`);
  } catch (err) {
    logWarn("Exports", "CACHE_SAVE_FAILED", "Failed to save export record", { error: err });
  }
}

/** Load all export records, newest first. */
export async function loadExportRecords(): Promise<ExportRecord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPORTS, "readonly");
    const records = await idbRequest<ExportRecord[]>(tx.objectStore(STORE_EXPORTS).getAll());
    db.close();
    records.sort((a, b) => b.exportedAt - a.exportedAt);
    return records;
  } catch (err) {
    logWarn("Exports", "CACHE_LOAD_FAILED", "Failed to load export records", { error: err });
    return [];
  }
}

/** Delete an export record. */
export async function deleteExportRecord(id: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_EXPORTS, "readwrite");
    tx.objectStore(STORE_EXPORTS).delete(id);
    await idbTx(tx);
    db.close();
  } catch (err) {
    logWarn("Exports", "UNKNOWN", `Failed to delete export #${id}`, { error: err });
  }
}

// --- Helpers ---

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
