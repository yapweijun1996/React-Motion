import { useState, useEffect } from "react";
import {
  loadSettings,
  saveSettings,
  clearSettings,
  getAvailableModels,
  type AppSettings,
} from "../services/settingsStore";
import { clearCache } from "../services/cache";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync when panel opens
  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setSaved(false);
    }
  }, [open]);

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
              {showKey ? "🙈" : "👁"}
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

        {/* Data & Privacy */}
        <div className="rm-field">
          <label className="rm-label">Data & Privacy</label>
          <div className="rm-hint" style={{ marginBottom: 8 }}>
            Cached scripts expire after 7 days. API key is stored obfuscated (not plaintext).
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="rm-btn rm-btn-secondary"
              style={{ fontSize: 13, padding: "6px 14px", minHeight: 36 }}
              onClick={async () => {
                await clearCache();
                alert("Cached scripts cleared.");
              }}
            >
              Clear Cached Scripts
            </button>
            <button
              className="rm-btn rm-btn-secondary"
              style={{ fontSize: 13, padding: "6px 14px", minHeight: 36, color: "#dc2626" }}
              onClick={() => {
                if (!confirm("This will remove your API key and all cached data. Continue?")) return;
                clearSettings();
                clearCache();
                setSettings({ geminiApiKey: "", geminiModel: "gemini-2.0-flash", ttsConcurrency: 2 });
                alert("All local data cleared.");
              }}
            >
              Clear All Data
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="rm-settings-footer">
          <button className="rm-btn rm-btn-primary" onClick={handleSave}>
            {saved ? "Saved ✓" : "Save"}
          </button>
          <button className="rm-btn rm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
