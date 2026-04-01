/**
 * WebCodecs feature detection and codec configuration.
 *
 * Probes browser for H.264 hardware encoding support.
 * Falls back to FFmpeg.wasm when WebCodecs is unavailable (Firefox, older Safari).
 */

import type { ExportQuality } from "./settingsStore";

// H.264 Main Profile, Level 4.0 — good balance of compression + compatibility
const TARGET_CODEC = "avc1.4D0028";

// Cache probe result so we only check once per session
let cached: boolean | null = null;

/**
 * Check whether the browser supports WebCodecs H.264 hardware encoding.
 * Result is cached after first call.
 */
export async function canUseWebCodecs(): Promise<boolean> {
  if (cached !== null) return cached;

  try {
    if (typeof globalThis.VideoEncoder === "undefined") {
      console.log("[WebCodecs] VideoEncoder not available");
      cached = false;
      return false;
    }
    if (typeof globalThis.VideoFrame === "undefined") {
      console.log("[WebCodecs] VideoFrame not available");
      cached = false;
      return false;
    }

    const result = await VideoEncoder.isConfigSupported({
      codec: TARGET_CODEC,
      width: 1920,
      height: 1080,
      bitrate: 5_000_000,
      hardwareAcceleration: "prefer-hardware",
    });

    cached = result.supported === true;
    console.log(`[WebCodecs] H.264 HW encoding supported: ${cached}`);
    return cached;
  } catch (err) {
    console.log("[WebCodecs] Feature detection failed:", err);
    cached = false;
    return false;
  }
}

/** Reset cache — for testing only. */
export function _resetWebCodecsCacheForTest(): void {
  cached = null;
}

/** Codec string for VideoEncoder.configure(). */
export const WEBCODECS_CODEC = TARGET_CODEC;

/**
 * Quality profile mapping: ExportQuality → WebCodecs bitrate (VBR).
 * Approximates the visual quality of the FFmpeg CRF profiles.
 */
export const WEBCODECS_QUALITY: Record<ExportQuality, { bitrate: number }> = {
  draft:    { bitrate: 2_000_000 },   // ~CRF 28
  standard: { bitrate: 5_000_000 },   // ~CRF 24
  high:     { bitrate: 10_000_000 },  // ~CRF 20
};
