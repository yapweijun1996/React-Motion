/**
 * Gemini API call logger — captures request/response for debugging.
 *
 * Ring buffer keeps last 50 entries. Listeners are notified on each new entry.
 */

export type GeminiLogEntry = {
  id: number;
  timestamp: number;
  model: string;
  /** System prompt (truncated for display) */
  systemPrompt: string;
  /** Number of messages in conversation */
  messageCount: number;
  /** Tool names available */
  tools: string[];
  /** Temperature used */
  temperature: number;
  /** Full request body (for copy) */
  requestBody: Record<string, unknown>;
  /** Response status */
  status: "ok" | "error";
  /** HTTP status code */
  httpStatus?: number;
  /** Response parts summary */
  responseSummary: string;
  /** Full response data (for copy) */
  responseData: unknown;
  /** Duration in ms */
  durationMs: number;
  /** Error message if failed */
  error?: string;
};

type Listener = () => void;

const MAX_ENTRIES = 50;
let nextId = 1;
const entries: GeminiLogEntry[] = [];
const listeners = new Set<Listener>();

export function addLogEntry(entry: Omit<GeminiLogEntry, "id">): void {
  entries.push({ ...entry, id: nextId++ });
  if (entries.length > MAX_ENTRIES) entries.shift();
  listeners.forEach((fn) => fn());
}

export function getLogEntries(): GeminiLogEntry[] {
  return entries;
}

export function clearLogEntries(): void {
  entries.length = 0;
  listeners.forEach((fn) => fn());
}

export function getLogEntryCount(): number {
  return entries.length;
}

export function subscribeLog(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Format all entries as copyable text. */
export function formatLogForCopy(): string {
  if (entries.length === 0) return "(No log entries)";
  return entries.map((e) => {
    const lines = [
      `=== #${e.id} | ${new Date(e.timestamp).toISOString()} | ${e.model} | ${e.durationMs}ms | ${e.status} ===`,
      `Tools: ${e.tools.length > 0 ? e.tools.join(", ") : "(none)"}`,
      `Messages: ${e.messageCount} | Temperature: ${e.temperature}`,
      `System prompt (first 200 chars): ${e.systemPrompt.slice(0, 200)}...`,
      "",
      "--- REQUEST BODY ---",
      JSON.stringify(e.requestBody, null, 2),
      "",
      "--- RESPONSE ---",
      e.status === "error" ? `ERROR: ${e.error}` : JSON.stringify(e.responseData, null, 2),
      "",
    ];
    return lines.join("\n");
  }).join("\n");
}
