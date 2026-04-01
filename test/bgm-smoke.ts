/**
 * BGM Smoke Test — verify Lyria 3 Clip API connectivity.
 *
 * Usage:  npx vite-node test/bgm-smoke.ts
 *
 * What it does:
 *   1. Reads API key from .env.local
 *   2. Sends a music prompt to lyria-3-clip-preview
 *   3. Validates response shape (base64 audio + mimeType)
 *   4. Writes test/bgm-output.* (extension from mimeType)
 *   5. Logs duration and file size
 */

import { loadEnv } from "vite";
import { writeFileSync } from "fs";
import { resolve } from "path";

const env = loadEnv("development", resolve(__dirname, ".."), [
  "DEVELOPMENT_",
  "VITE_",
]);

const API_KEY =
  env.DEVELOPMENT_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";
const BGM_MODEL =
  env.DEVELOPMENT_BGM_MODEL || env.VITE_BGM_MODEL || "lyria-3-clip-preview";

if (!API_KEY) {
  console.error("No API key found. Set DEVELOPMENT_GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const TEST_PROMPT =
  "Calm relaxing background music, gentle and soothing, suitable for data storytelling presentation";

async function main() {
  console.log("=== BGM Smoke Test ===");
  console.log("Model:", BGM_MODEL);
  console.log("Prompt:", TEST_PROMPT);
  console.log();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${BGM_MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: TEST_PROMPT }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
    },
  };

  console.log("Calling Lyria API...");
  const t0 = performance.now();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

  if (!res.ok) {
    const err = await res.text();
    console.error(`API error (${res.status}):`, err);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`Response received in ${elapsed}s`);

  // Validate response shape — Lyria may return multiple parts (text caption + audio)
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const audioPart = parts.find((p: Record<string, unknown>) => p.inlineData);
  const textParts = parts.filter((p: Record<string, unknown>) => p.text);

  if (textParts.length > 0) {
    console.log("Caption:", (textParts[0].text as string).slice(0, 200), "...");
  }

  if (!audioPart?.inlineData) {
    console.error("No audio inlineData found in response parts:");
    console.error(JSON.stringify(data, null, 2).slice(0, 1000));
    process.exit(1);
  }

  const { data: audioBase64, mimeType } = audioPart.inlineData;
  console.log("mimeType:", mimeType);
  console.log("base64 length:", audioBase64.length, "chars");

  // Decode base64
  const audioBuffer = Buffer.from(audioBase64, "base64");
  console.log("Audio bytes:", audioBuffer.length);
  console.log("File size:", (audioBuffer.length / 1024).toFixed(1), "KB");

  // Determine file extension from mimeType
  const extMap: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "audio/mp4": "m4a",
    "audio/L16": "wav",
  };
  // Handle mimeType with params like "audio/L16;rate=24000"
  const baseMime = (mimeType || "").split(";")[0].trim();
  const ext = extMap[baseMime] || "bin";

  // If it's raw PCM (audio/L16), wrap in WAV header
  let outputBuffer = audioBuffer;
  if (baseMime === "audio/L16") {
    const rateMatch = (mimeType || "").match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    outputBuffer = pcmToWav(audioBuffer, sampleRate, 1, 16);
    console.log("Wrapped raw PCM in WAV header (sample rate:", sampleRate, ")");
  }

  // Write output
  const outPath = resolve(__dirname, `bgm-output.${ext === "bin" ? "wav" : ext}`);
  writeFileSync(outPath, outputBuffer);
  console.log();
  console.log("Audio written to:", outPath);
  console.log("Output size:", (outputBuffer.length / 1024).toFixed(1), "KB");
  console.log();
  console.log("=== SMOKE TEST PASSED ===");
  console.log("Open the file to listen and verify quality.");
}

function pcmToWav(
  pcm: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + 36, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
