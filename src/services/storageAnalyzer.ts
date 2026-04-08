/**
 * Storage analyzer — calculates per-store and per-history-entry sizes.
 *
 * Iterates IndexedDB stores via cursor to measure actual Blob sizes.
 * Groups blob entries by prefix (cache / history-{id}) so the UI can
 * show per-video storage and allow per-entry deletion.
 */

import { openDB, STORE_HISTORY, STORE_TTS_AUDIO, STORE_IMAGE_CACHE, STORE_METRICS, STORE_EXPORTS, STORE_SCRIPTS } from "./db";

// --- Types ---

export type StorageCategory = "tts" | "bgm" | "images" | "json" | "metrics";

export type HistoryStorageEntry = {
  id: number;
  prompt: string;
  createdAt: number;
  ttsBytes: number;
  bgmBytes: number;
  imageBytes: number;
  jsonBytes: number;
  totalBytes: number;
};

export type StorageSummary = {
  /** Per-history-entry breakdown */
  entries: HistoryStorageEntry[];
  /** Quick-restore cache size */
  cacheBytes: number;
  /** Metrics store size */
  metricsBytes: number;
  /** Export records size */
  exportsBytes: number;
  /** Total across all stores */
  totalBytes: number;
  /** Browser quota (if available) */
  quotaBytes: number | null;
  /** Browser usage reported by storage API */
  usageBytes: number | null;
  /** Category totals for the color bar */
  byCategory: Record<StorageCategory, number>;
};

// --- Public API ---

/** Analyze all IndexedDB stores and return a full storage summary. */
export async function analyzeStorage(): Promise<StorageSummary> {
  // Each scan opens its own DB connection to avoid transaction conflicts
  const [historyEntries, ttsSizes, imageSizes, metricsBytes, exportsBytes, cacheJsonBytes] =
    await Promise.all([
      scanHistoryEntries(),
      scanBlobStore(STORE_TTS_AUDIO),
      scanBlobStore(STORE_IMAGE_CACHE),
      scanStoreSize(STORE_METRICS),
      scanStoreSize(STORE_EXPORTS),
      scanStoreSize(STORE_SCRIPTS),
    ]);

  // Group blob sizes by prefix → history entry
  const entries: HistoryStorageEntry[] = historyEntries.map((h) => {
    const prefix = `history-${h.id}`;
    const ttsBytes = sumByPrefix(ttsSizes, prefix, false);
    const bgmBytes = sumByPrefix(ttsSizes, prefix, true);
    const imageBytes = sumByPrefix(imageSizes, prefix, false);
    return {
      ...h,
      ttsBytes,
      bgmBytes,
      imageBytes,
      totalBytes: h.jsonBytes + ttsBytes + bgmBytes + imageBytes,
    };
  });

  // Sort newest first
  entries.sort((a, b) => b.createdAt - a.createdAt);

  // Cache prefix sizes
  const cacheTts = sumByPrefix(ttsSizes, "cache", false);
  const cacheBgm = sumByPrefix(ttsSizes, "cache", true);
  const cacheImg = sumByPrefix(imageSizes, "cache", false);
  const cacheBytes = cacheJsonBytes + cacheTts + cacheBgm + cacheImg;

  // Category totals
  const totalTts = entries.reduce((s, e) => s + e.ttsBytes, 0) + cacheTts;
  const totalBgm = entries.reduce((s, e) => s + e.bgmBytes, 0) + cacheBgm;
  const totalImg = entries.reduce((s, e) => s + e.imageBytes, 0) + cacheImg;
  const totalJson = entries.reduce((s, e) => s + e.jsonBytes, 0) + cacheJsonBytes;

  const totalBytes = totalTts + totalBgm + totalImg + totalJson + metricsBytes + exportsBytes;

  // Browser quota
  const quota = await getBrowserQuota();

  return {
    entries,
    cacheBytes,
    metricsBytes,
    exportsBytes,
    totalBytes,
    quotaBytes: quota.quota,
    usageBytes: quota.usage,
    byCategory: {
      tts: totalTts,
      bgm: totalBgm,
      images: totalImg,
      json: totalJson,
      metrics: metricsBytes + exportsBytes,
    },
  };
}

// --- Internal scanners ---

type HistoryMeta = { id: number; prompt: string; createdAt: number; jsonBytes: number };

/** Read history entries — extract id, prompt, createdAt, and estimate JSON size. */
async function scanHistoryEntries(): Promise<HistoryMeta[]> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(STORE_HISTORY)) { db.close(); return []; }

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, "readonly");
      const req = tx.objectStore(STORE_HISTORY).getAll();

      req.onsuccess = () => {
        db.close();
        const results: HistoryMeta[] = (req.result || []).map((entry: Record<string, unknown>) => {
          const jsonStr = JSON.stringify(entry);
          return {
            id: entry.id as number,
            prompt: (entry.prompt as string) || "",
            createdAt: (entry.createdAt as number) || 0,
            jsonBytes: new Blob([jsonStr]).size,
          };
        });
        resolve(results);
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch { return []; }
}

type BlobSizeMap = Map<string, number>;

/** Scan a blob store (ttsAudio or imageCache) — returns key → byte size map. */
async function scanBlobStore(storeName: string): Promise<BlobSizeMap> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) { db.close(); return new Map(); }

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const cursor = tx.objectStore(storeName).openCursor();
      const sizes: BlobSizeMap = new Map();

      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) { db.close(); resolve(sizes); return; }
        const key = c.key as string;
        const value = c.value as Record<string, unknown>;
        const blob = value?.blob;
        sizes.set(key, blob instanceof Blob ? blob.size : estimateSize(value));
        c.continue();
      };
      cursor.onerror = () => { db.close(); reject(cursor.error); };
    });
  } catch { return new Map(); }
}

/** Scan any store for total serialized size. */
async function scanStoreSize(storeName: string): Promise<number> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) { db.close(); return 0; }

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const cursor = tx.objectStore(storeName).openCursor();
      let total = 0;

      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) { db.close(); resolve(total); return; }
        total += estimateSize(c.value);
        c.continue();
      };
      cursor.onerror = () => { db.close(); reject(cursor.error); };
    });
  } catch { return 0; }
}

// --- Helpers ---

/** Sum blob sizes matching a prefix. bgmOnly filters for ":bgm" keys. */
function sumByPrefix(sizes: BlobSizeMap, prefix: string, bgmOnly: boolean): number {
  let total = 0;
  for (const [key, size] of sizes) {
    if (!key.startsWith(`${prefix}:`)) continue;
    const isBgm = key.endsWith(":bgm");
    if (bgmOnly && isBgm) total += size;
    if (!bgmOnly && !isBgm) total += size;
  }
  return total;
}

/** Rough byte estimate for non-Blob values. */
function estimateSize(value: unknown): number {
  if (value instanceof Blob) return value.size;
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

/** Get browser storage quota via StorageManager API. */
async function getBrowserQuota(): Promise<{ quota: number | null; usage: number | null }> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return { quota: est.quota ?? null, usage: est.usage ?? null };
    }
  } catch { /* unsupported */ }
  return { quota: null, usage: null };
}

// --- Formatting utilities (used by UI) ---

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
