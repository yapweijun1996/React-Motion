import { useState, useCallback } from "react";
import { Player } from "@remotion/player";
import { ReportComposition } from "./video/ReportComposition";
import { generateScript } from "./services/generateScript";
import type { MountConfig, VideoScript } from "./types";

type AppProps = {
  config: MountConfig;
};

export const App: React.FC<AppProps> = ({ config }) => {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Prompt is the primary input; structured data is optional context
      const result = await generateScript(prompt, config.data);
      setScript(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, config.data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      {/* Prompt input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"Paste your data and describe what video to generate.\nE.g.: 以下是供应商数据：Hin Kang 27155, Adbery 3150, Abbery 280。帮我做汇报视频，重点分析数量差异。"}
          disabled={loading}
          rows={4}
          style={{
            flex: 1,
            padding: "10px 14px",
            fontSize: 15,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            padding: "10px 24px",
            fontSize: 16,
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: loading ? "#9ca3af" : "#2563eb",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            alignSelf: "flex-end",
          }}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 16,
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Video player */}
      {script && (
        <Player
          component={ReportComposition}
          inputProps={{ script }}
          durationInFrames={script.durationInFrames}
          fps={script.fps}
          compositionWidth={script.width}
          compositionHeight={script.height}
          style={{ width: "100%" }}
          controls
        />
      )}

      {/* Empty state */}
      {!script && !loading && (
        <div
          style={{
            padding: "60px 40px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 16,
            border: "2px dashed #e5e7eb",
            borderRadius: 12,
            lineHeight: 1.6,
          }}
        >
          Paste your data + describe the video you want.
          <br />
          AI will extract, analyze, and generate the presentation.
        </div>
      )}
    </div>
  );
};
