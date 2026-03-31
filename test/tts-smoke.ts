/**
 * TTS Smoke Test — verify Gemini TTS API connectivity before integration.
 *
 * Usage:  npx vite-node test/tts-smoke.ts
 *
 * What it does:
 *   1. Reads API key from .env.local
 *   2. Sends a short text to gemini-2.5-flash-preview-tts
 *   3. Validates response shape (base64 PCM + mimeType)
 *   4. Converts PCM → WAV and writes test/tts-output.wav
 *   5. Logs duration so you can verify
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
const TTS_MODEL =
  env.DEVELOPMENT_GEMINI_TTS_MODEL ||
  env.VITE_GEMINI_TTS_MODEL ||
  "gemini-2.5-flash-preview-tts";

if (!API_KEY) {
  console.error("No API key found. Set DEVELOPMENT_GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const TEST_TEXT = "你好，这是一段测试语音。欢迎使用 React Motion 数据汇报视频生成器。";
const VOICE = "Kore";

async function main() {
  console.log("=== TTS Smoke Test ===");
  console.log("Model:", TTS_MODEL);
  console.log("Voice:", VOICE);
  console.log("Text:", TEST_TEXT);
  console.log();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: TEST_TEXT }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: VOICE },
        },
      },
    },
  };

  console.log("Calling Gemini TTS API...");
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

  // Validate response shape
  const part = data?.candidates?.[0]?.content?.parts?.[0];

  if (!part?.inlineData) {
    console.error("Unexpected response shape — no inlineData found:");
    console.error(JSON.stringify(data, null, 2).slice(0, 500));
    process.exit(1);
  }

  const { data: pcmBase64, mimeType } = part.inlineData;
  console.log("mimeType:", mimeType);
  console.log("base64 length:", pcmBase64.length, "chars");

  // Decode base64 → raw PCM bytes
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  console.log("PCM bytes:", pcmBuffer.length);

  // Extract sample rate from mimeType (e.g. "audio/L16;rate=24000")
  const rateMatch = mimeType?.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  console.log("Sample rate:", sampleRate);

  // Calculate duration
  const bytesPerSample = 2; // 16-bit
  const channels = 1; // mono
  const durationSec = pcmBuffer.length / (sampleRate * bytesPerSample * channels);
  console.log("Duration:", durationSec.toFixed(2), "seconds");

  // Convert PCM → WAV (44-byte RIFF header + raw PCM)
  const wavBuffer = pcmToWav(pcmBuffer, sampleRate, channels, bytesPerSample * 8);

  // Write output
  const outPath = resolve(__dirname, "tts-output.wav");
  writeFileSync(outPath, wavBuffer);
  console.log();
  console.log("WAV written to:", outPath);
  console.log("File size:", (wavBuffer.length / 1024).toFixed(1), "KB");
  console.log();
  console.log("=== SMOKE TEST PASSED ===");
  console.log("Open tts-output.wav to listen and verify quality.");
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
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);

  // RIFF chunk
  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write("WAVE", 8);

  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // sub-chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
