/**
 * Production-grade error utilities.
 *
 * - Error classification for logging/monitoring
 * - User-friendly message mapping
 * - Normalize any thrown value into Error
 */

// --- Error codes ---

export type ErrorCode =
  | "API_KEY_MISSING"
  | "API_RATE_LIMIT"
  | "API_SERVER_ERROR"
  | "API_AUTH_ERROR"
  | "API_NETWORK_ERROR"
  | "API_EMPTY_RESPONSE"
  | "PARSE_INVALID_JSON"
  | "PARSE_MISSING_FIELD"
  | "PARSE_INVALID_TYPE"
  | "AGENT_NO_OUTPUT"
  | "AGENT_MAX_ITERATIONS"
  | "EXPORT_NO_FRAMES"
  | "EXPORT_TOO_MANY_FAILED"
  | "EXPORT_FFMPEG_LOAD"
  | "EXPORT_FFMPEG_ENCODE"
  | "EXPORT_SURFACE_NOT_READY"
  | "TTS_PARTIAL_FAILURE"
  | "TTS_EMPTY_AUDIO"
  | "CACHE_LOAD_FAILED"
  | "CACHE_SAVE_FAILED"
  | "EVAL_PARSE_FAILED"
  | "PPTX_EXPORT_FAILED"
  | "UNKNOWN";

// --- User-friendly messages ---

const USER_MESSAGES: Partial<Record<ErrorCode, string>> = {
  API_KEY_MISSING: "API key not configured — open Settings to add your key.",
  API_RATE_LIMIT: "API rate limit reached — please wait a moment and try again.",
  API_SERVER_ERROR: "AI service temporarily unavailable — please try again.",
  API_AUTH_ERROR: "API key is invalid — check your key in Settings.",
  API_NETWORK_ERROR: "Network error — check your internet connection.",
  API_EMPTY_RESPONSE: "AI returned an empty response — please try again.",
  EXPORT_NO_FRAMES: "No frames captured — export cannot proceed.",
  EXPORT_TOO_MANY_FAILED: "Too many frames failed to capture — try again with the tab in focus.",
  EXPORT_FFMPEG_LOAD: "Video encoder failed to load — try refreshing the page.",
  EXPORT_FFMPEG_ENCODE: "Video encoding failed — try again.",
  EXPORT_SURFACE_NOT_READY: "Export surface not ready — try again.",
  AGENT_NO_OUTPUT: "AI did not produce a video script — please try a different prompt.",
  AGENT_MAX_ITERATIONS: "AI took too long to generate — please simplify your prompt.",
};

// --- Classified error ---

export class ClassifiedError extends Error {
  code: ErrorCode;
  userMessage: string;

  constructor(code: ErrorCode, technicalMessage: string, userMessage?: string) {
    super(technicalMessage);
    this.name = "ClassifiedError";
    this.code = code;
    this.userMessage = userMessage ?? USER_MESSAGES[code] ?? technicalMessage;
  }
}

// --- Helpers ---

/** Normalize any thrown value into a proper Error instance. */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error(JSON.stringify(error));
}

/** Get user-friendly message from any error. */
export function getUserMessage(error: unknown): string {
  if (error instanceof ClassifiedError) return error.userMessage;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

/** Classify an HTTP status code into an ErrorCode. */
export function classifyHttpStatus(status: number): ErrorCode {
  if (status === 401 || status === 403) return "API_AUTH_ERROR";
  if (status === 429) return "API_RATE_LIMIT";
  if (status >= 500) return "API_SERVER_ERROR";
  return "UNKNOWN";
}

/** Log classified error with consistent format. Also persists to metrics. */
export function logError(
  tag: string,
  code: ErrorCode,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[${tag}] ${code}: ${msg}`, extra ?? "");

  // Lazy import to avoid circular dependency (metrics imports errors for ErrorCode type)
  import("./metrics").then(({ trackError }) => {
    trackError(code, msg, { tag, ...extra });
  }).catch(() => {});
}

/** Log non-fatal warning with consistent format. */
export function logWarn(
  tag: string,
  code: ErrorCode,
  message: string,
  extra?: Record<string, unknown>,
): void {
  console.warn(`[${tag}] ${code}: ${message}`, extra ?? "");
}
