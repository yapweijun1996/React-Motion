import { useState, useEffect, useRef } from "react";
import { IconEye, IconEyeOff, IconPlay, IconStop, IconCheck } from "./Icons";
import {
  loadSettings,
  saveSettings,
  clearSettings,
  getAvailableModels,
  type AppSettings,
  type BgmMood,
} from "../services/settingsStore";
import { BGM_MOODS } from "../services/bgMusic";
import { getAvailableTtsVoices, previewVoice } from "../services/tts";
import { DEFAULT_MODEL, DEFAULT_TTS_VOICE, DEFAULT_BGM_MOOD } from "../services/apiConfig";
import { clearCache } from "../services/cache";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "playing">("idle");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) { setSettings(loadSettings()); setSaved(false); }
    if (!open) stopPreview();
  }, [open]);

  const stopPreview = () => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setPreviewState("idle");
  };
  const handlePreview = async () => {
    if (previewState === "playing") { stopPreview(); return; }
    if (!settings.geminiApiKey) return;
    stopPreview();
    setPreviewState("loading");
    try {
      const url = await previewVoice(settings.ttsVoice);
      previewUrlRef.current = url;
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => stopPreview();
      audio.onerror = () => stopPreview();
      await audio.play();
      setPreviewState("playing");
    } catch { stopPreview(); }
  };
  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) return null;

  const models = getAvailableModels();
  const maskedKey = settings.geminiApiKey
    ? settings.geminiApiKey.slice(0, 8) + "..." + settings.geminiApiKey.slice(-4)
    : "";

  return (
    <div className="rm-settings-overlay" onClick={onClose}>
      <div className="rm-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rm-settings-header">
          <h2 className="rm-settings-title">Settings</h2>
          <button className="rm-settings-close" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>

        <div className="rm-settings-body">
        {/* API Key */}
        <div className="rm-field">
          <label className="rm-label">Gemini API Key</label>
          <div className="rm-key-row">
            <input
              type={showKey ? "text" : "password"}
              value={settings.geminiApiKey}
              onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="rm-input"
              autoComplete="off"
            />
            <button
              className="rm-btn-icon"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Hide" : "Show"}
              type="button"
            >
              {showKey ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
          {settings.geminiApiKey && !showKey && (
            <div className="rm-hint">{maskedKey}</div>
          )}
        </div>

        {/* Model Selection */}
        <div className="rm-field">
          <label className="rm-label">Model</label>
          <select
            value={settings.geminiModel}
            onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
            className="rm-select"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <div className="rm-hint">
            Flash models are faster and cheaper. Pro models produce higher quality.
          </div>
        </div>

        {/* TTS Voice */}
        <div className="rm-field">
          <label className="rm-label">TTS Voice</label>
          <div className="rm-voice-row">
            <select
              value={settings.ttsVoice}
              onChange={(e) => { setSettings({ ...settings, ttsVoice: e.target.value }); stopPreview(); }}
              className="rm-select"
              style={{ flex: 1 }}
            >
              {getAvailableTtsVoices().map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} ({v.desc}){v.id === DEFAULT_TTS_VOICE ? " — Default" : ""}
                </option>
              ))}
            </select>
            <button
              className="rm-voice-preview"
              onClick={handlePreview}
              disabled={!settings.geminiApiKey || previewState === "loading"}
              title={previewState === "playing" ? "Stop" : "Preview voice"}
              type="button"
            >
              {previewState === "loading" ? "..." : previewState === "playing" ? <IconStop size={14} /> : <IconPlay size={14} />}
              {" "}Preview
            </button>
          </div>
          <div className="rm-hint">
            {!settings.geminiApiKey
              ? "Set API key above to enable voice preview."
              : "Click Preview to hear a sample of this voice."}
          </div>
        </div>

        {/* TTS Concurrency */}
        <div className="rm-field">
          <label className="rm-label">TTS Concurrency</label>
          <select
            value={settings.ttsConcurrency}
            onChange={(e) => setSettings({ ...settings, ttsConcurrency: Number(e.target.value) })}
            className="rm-select"
          >
            <option value={1}>1 (Sequential — safest for free tier)</option>
            <option value={2}>2 (Default — balanced)</option>
            <option value={3}>3 (Fast — recommended for paid tier)</option>
            <option value={4}>4 (Faster)</option>
            <option value={5}>5 (Maximum parallel)</option>
          </select>
          <div className="rm-hint">
            Parallel TTS requests. Lower = safer for rate limits, higher = faster generation.
          </div>
        </div>

        {/* Export Quality */}
        <div className="rm-field">
          <label className="rm-label">Export Quality</label>
          <select
            value={settings.exportQuality}
            onChange={(e) => setSettings({ ...settings, exportQuality: e.target.value as "draft" | "standard" | "high" })}
            className="rm-select"
          >
            <option value="draft">Draft (fast export, smaller file)</option>
            <option value="standard">Standard (balanced)</option>
            <option value="high">High (sharp text, larger file)</option>
          </select>
          <div className="rm-hint">
            Higher quality produces sharper text and charts but increases file size and export time.
          </div>
        </div>

        {/* Canvas Effects */}
        <div className="rm-field">
          <label className="rm-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Canvas Effects
            <input
              type="checkbox"
              checked={settings.canvasEffects}
              onChange={(e) => setSettings({ ...settings, canvasEffects: e.target.checked })}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, fontWeight: 400, color: settings.canvasEffects ? "#16a34a" : "#9ca3af" }}>
              {settings.canvasEffects ? "ON" : "OFF"}
            </span>
          </label>
          <div className="rm-hint">
            Adds animated particle background to scenes using Canvas 2D. May increase GPU usage on low-end devices. Default: off.
          </div>
        </div>

        {/* Background Music */}
        <div className="rm-field">
          <label className="rm-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Background Music
            <input
              type="checkbox"
              checked={settings.bgMusicEnabled}
              onChange={(e) => setSettings({ ...settings, bgMusicEnabled: e.target.checked })}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, fontWeight: 400, color: settings.bgMusicEnabled ? "#16a34a" : "#9ca3af" }}>
              {settings.bgMusicEnabled ? "ON" : "OFF"}
            </span>
          </label>
          {settings.bgMusicEnabled && (
            <select
              value={settings.bgMusicMood}
              onChange={(e) => setSettings({ ...settings, bgMusicMood: e.target.value as BgmMood })}
              className="rm-select"
              style={{ marginTop: 6 }}
            >
              {BGM_MOODS.map((mood) => (
                <option key={mood} value={mood}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </option>
              ))}
            </select>
          )}
          <div className="rm-hint">
            AI-generated background music via Lyria. Adds ~10s to generation time. Default: off to save API cost.
          </div>
        </div>

        {/* Agent Mode */}
        <div className="rm-field">
          <label className="rm-label">
            Agent Mode
            <span style={{ fontSize: 11, fontWeight: 500, color: "#f59e0b", marginLeft: 6, padding: "1px 6px", background: "#fef3c7", borderRadius: 4 }}>Beta</span>
          </label>
          <select
            value={settings.agentMode}
            onChange={(e) => setSettings({ ...settings, agentMode: e.target.value as "single" | "multi" })}
            className="rm-select"
          >
            <option value="single">Single Agent (stable)</option>
            <option value="multi">Multi Agent — 3-role collaboration (beta)</option>
          </select>
          <div className="rm-hint">
            Multi mode splits AI into Storyboard (narrative) + Visual Director (design) + Quality Reviewer (evaluation). May produce higher quality but uses more API calls.
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="rm-field">
          <label className="rm-label">Data & Privacy</label>
          <div className="rm-hint" style={{ marginBottom: 8 }}>Cached scripts expire after 7 days. API key is stored obfuscated.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="rm-btn rm-btn-secondary" style={{ fontSize: 13, padding: "6px 14px", minHeight: 36 }}
              onClick={async () => { await clearCache(); alert("Cached scripts cleared."); }}>Clear Cached Scripts</button>
            <button className="rm-btn rm-btn-secondary" style={{ fontSize: 13, padding: "6px 14px", minHeight: 36, color: "#dc2626" }}
              onClick={() => {
                if (!confirm("This will remove your API key and all cached data. Continue?")) return;
                clearSettings(); clearCache();
                setSettings({ geminiApiKey: "", geminiModel: DEFAULT_MODEL, ttsVoice: DEFAULT_TTS_VOICE, ttsConcurrency: 2, exportQuality: "standard", canvasEffects: false, bgMusicEnabled: false, bgMusicMood: DEFAULT_BGM_MOOD, agentMode: "single" });
                alert("All local data cleared.");
              }}>Clear All Data</button>
          </div>
        </div>
        </div>

        {/* Save */}
        <div className="rm-settings-footer">
          <button className="rm-btn rm-btn-primary" onClick={handleSave}>
            {saved ? <><IconCheck size={14} /> Saved</> : "Save"}
          </button>
          <button className="rm-btn rm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
