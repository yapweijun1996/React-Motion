/**
 * Parse raw JSON string into a validated VideoScript.
 *
 * Thin wrapper: JSON.parse → validateVideoScript (from validate.ts).
 * Throws on failure — callers use try/catch (existing contract).
 */

import type { VideoScript } from "../types";
import { validateVideoScript } from "./validate";

export function parseVideoScript(raw: string): VideoScript {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  const result = validateVideoScript(json);

  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }

  if (result.warnings.length > 0) {
    console.warn("[parseScript] Warnings:", result.warnings.join("; "));
  }

  return result.data;
}
