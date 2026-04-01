/**
 * Lightweight observability — IndexedDB-backed event log.
 *
 * Captures structured events for generation, export, TTS, and errors.
 * All data stays local (fully frontend). Users can export JSON for debugging.
 *
 * Write is fire-and-forget (never blocks the caller).
 */

import { openDB, STORE_METRICS } from "./db";
import type { ErrorCode } from "./errors";

// ============================================================
// Event types
// ============================================================

export type MetricEventType = "generation" | "export" | "tts" | "bgm" | "imageGen" | "error";

export type MetricEvent = {
  id?: number;                       // auto-increment by IndexedDB
  timestamp: number;                 // Date.now()
  type: MetricEventType;
  success: boolean;
  durationMs?: number;
  code?: ErrorCode;                  // only for errors
  metadata?: Record<string, unknown>;
};

// ============================================================
// Write (fire-and-forget)
// ============================================================

export function trackEvent(
  type: MetricEventType,
  success: boolean,
  durationMs?: number,
  metadata?: Record<string, unknown>,
): void {
  const event: MetricEvent = {
    timestamp: Date.now(),
    type,
    success,
    durationMs,
    metadata,
  };

  // Fire-and-forget — never block the caller
  writeEvent(event).catch(() => {
    // Silently ignore storage failures
  });
}

export function trackError(
  code: ErrorCode,
  message: string,
  extra?: Record<string, unknown>,
): void {
  trackEvent("error", false, undefined, { code, message, ...extra });
}

async function writeEvent(event: MetricEvent): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_METRICS, "readwrite");
  tx.objectStore(STORE_METRICS).add(event);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// ============================================================
// Read
// ============================================================

export async function getEvents(
  options: { type?: MetricEventType; limit?: number } = {},
): Promise<MetricEvent[]> {
  const { type, limit = 200 } = options;
  const db = await openDB();
  const tx = db.transaction(STORE_METRICS, "readonly");
  const store = tx.objectStore(STORE_METRICS);

  const events: MetricEvent[] = [];

  const index = type ? store.index("type") : store.index("timestamp");
  const range = type ? IDBKeyRange.only(type) : undefined;
  const req = index.openCursor(range, "prev"); // newest first

  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor || events.length >= limit) {
        resolve();
        return;
      }
      events.push(cursor.value as MetricEvent);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });

  db.close();
  return events;
}

// ============================================================
// Aggregate stats
// ============================================================

export type MetricStats = {
  total: number;
  successes: number;
  failures: number;
  successRate: number;       // 0-1
  avgDurationMs: number | null;
  p95DurationMs: number | null;
  recentErrors: { code: string; message: string; timestamp: number }[];
};

export async function getStats(type?: MetricEventType): Promise<MetricStats> {
  const events = await getEvents({ type, limit: 500 });

  const successes = events.filter((e) => e.success);
  const failures = events.filter((e) => !e.success);

  const durations = events
    .filter((e) => e.durationMs !== undefined)
    .map((e) => e.durationMs!);
  durations.sort((a, b) => a - b);

  const avg = durations.length > 0
    ? durations.reduce((s, d) => s + d, 0) / durations.length
    : null;

  const p95 = durations.length > 0
    ? durations[Math.floor(durations.length * 0.95)]
    : null;

  const recentErrors = failures.slice(0, 10).map((e) => ({
    code: (e.metadata?.code as string) ?? e.code ?? "UNKNOWN",
    message: (e.metadata?.message as string) ?? "",
    timestamp: e.timestamp,
  }));

  return {
    total: events.length,
    successes: successes.length,
    failures: failures.length,
    successRate: events.length > 0 ? successes.length / events.length : 1,
    avgDurationMs: avg,
    p95DurationMs: p95,
    recentErrors,
  };
}

// ============================================================
// Export for debugging
// ============================================================

export async function exportEventsAsJSON(): Promise<string> {
  const events = await getEvents({ limit: 1000 });
  return JSON.stringify(events, null, 2);
}

// ============================================================
// Cleanup
// ============================================================

const MAX_EVENTS = 1000;

/** Prune old events if over MAX_EVENTS. Called periodically. */
export async function pruneOldEvents(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_METRICS, "readwrite");
  const store = tx.objectStore(STORE_METRICS);
  const countReq = store.count();

  await new Promise<void>((resolve, reject) => {
    countReq.onsuccess = () => {
      const count = countReq.result;
      if (count <= MAX_EVENTS) {
        resolve();
        return;
      }

      // Delete oldest entries
      const deleteCount = count - MAX_EVENTS;
      const cursorReq = store.index("timestamp").openCursor(null, "next");
      let deleted = 0;

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor || deleted >= deleteCount) {
          resolve();
          return;
        }
        cursor.delete();
        deleted++;
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    };
    countReq.onerror = () => reject(countReq.error);
  });

  db.close();
}
