import { describe, it, expect } from "vitest";
import {
  validateVideoScript,
  validateSettings,
  VALID_ELEMENT_TYPES,
  VALID_LAYOUTS,
  VALID_TRANSITIONS,
  VALID_ANIMATIONS,
  VALID_STAGGER_SPEEDS,
  CONSTRAINTS,
} from "../src/services/validate";

// ============================================================
// Helper: minimal valid script
// ============================================================

function minimalScript(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Video",
    scenes: [
      {
        id: "s1",
        startFrame: 0,
        durationInFrames: 150,
        elements: [{ type: "text", content: "Hello" }],
      },
    ],
    ...overrides,
  };
}

// ============================================================
// validateVideoScript — top-level
// ============================================================

describe("validateVideoScript", () => {
  it("accepts a minimal valid script", () => {
    const r = validateVideoScript(minimalScript());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.title).toBe("Test Video");
      expect(r.data.scenes).toHaveLength(1);
      expect(r.data.fps).toBe(CONSTRAINTS.DEFAULT_FPS);
    }
  });

  // --- Rejection cases ---

  it("rejects non-object input", () => {
    expect(validateVideoScript(null).ok).toBe(false);
    expect(validateVideoScript("string").ok).toBe(false);
    expect(validateVideoScript(42).ok).toBe(false);
    expect(validateVideoScript([]).ok).toBe(false);
  });

  it("rejects missing title", () => {
    const r = validateVideoScript({ scenes: [{ elements: [{ type: "text" }] }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("title");
  });

  it("rejects empty title", () => {
    const r = validateVideoScript(minimalScript({ title: "  " }));
    expect(r.ok).toBe(false);
  });

  it("rejects missing scenes", () => {
    const r = validateVideoScript({ title: "X" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("scenes");
  });

  it("rejects empty scenes array", () => {
    const r = validateVideoScript({ title: "X", scenes: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("empty");
  });

  // --- Numeric coercion + clamping ---

  it("clamps fps to valid range", () => {
    const r = validateVideoScript(minimalScript({ fps: 5 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.fps).toBe(CONSTRAINTS.MIN_FPS);
  });

  it("clamps high fps", () => {
    const r = validateVideoScript(minimalScript({ fps: 120 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.fps).toBe(CONSTRAINTS.MAX_FPS);
  });

  it("coerces string fps to number", () => {
    const r = validateVideoScript(minimalScript({ fps: "30" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.fps).toBe(30);
  });

  it("enforces minimum width and height", () => {
    const r = validateVideoScript(minimalScript({ width: 100, height: 50 }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.width).toBe(CONSTRAINTS.MIN_VIDEO_WIDTH);
      expect(r.data.height).toBe(CONSTRAINTS.MIN_VIDEO_HEIGHT);
    }
  });

  it("defaults missing id to 'ai-script'", () => {
    const r = validateVideoScript(minimalScript());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.id).toBe("ai-script");
  });

  it("preserves provided id", () => {
    const r = validateVideoScript(minimalScript({ id: "custom-id" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.id).toBe("custom-id");
  });

  it("recalculates total duration from scenes", () => {
    const r = validateVideoScript(minimalScript({
      durationInFrames: 999,
      scenes: [
        { elements: [{ type: "text" }], durationInFrames: 100 },
        { elements: [{ type: "text" }], durationInFrames: 200 },
      ],
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.durationInFrames).toBe(300);
  });

  // --- Theme ---

  it("validates theme fields", () => {
    const r = validateVideoScript(minimalScript({
      theme: { primaryColor: "#ff0000", style: "modern" },
    }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.theme?.primaryColor).toBe("#ff0000");
      expect(r.data.theme?.style).toBe("modern");
    }
  });

  it("ignores invalid theme style", () => {
    const r = validateVideoScript(minimalScript({
      theme: { primaryColor: "#ff0000", style: "funky" },
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.theme?.style).toBeUndefined();
  });

  it("sets theme to undefined for non-object", () => {
    const r = validateVideoScript(minimalScript({ theme: "red" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.theme).toBeUndefined();
  });
});

// ============================================================
// Scene validation
// ============================================================

describe("validateVideoScript — scene validation", () => {
  it("rejects scene without elements", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ id: "s1" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("elements");
  });

  it("warns on empty elements array", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toContain("empty elements");
  });

  it("warns on too many elements", () => {
    const elements = Array.from({ length: 12 }, (_, i) => ({ type: "text", content: `item ${i}` }));
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toContain("12 elements");
  });

  it("clamps scene duration to range", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text" }], durationInFrames: 5 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.scenes[0].durationInFrames).toBe(CONSTRAINTS.MIN_SCENE_FRAMES);
  });

  it("clamps scene duration max", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text" }], durationInFrames: 99999 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.scenes[0].durationInFrames).toBe(CONSTRAINTS.MAX_SCENE_FRAMES);
  });

  it("validates layout enum", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text" }], layout: "grid" }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.scenes[0].layout).toBeUndefined();
      expect(r.warnings.join()).toContain("invalid layout");
    }
  });

  it("accepts valid layout", () => {
    for (const layout of VALID_LAYOUTS) {
      const r = validateVideoScript({
        title: "X",
        scenes: [{ elements: [{ type: "text" }], layout }],
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.scenes[0].layout).toBe(layout);
    }
  });

  it("validates transition enum", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text" }], transition: "swirl" }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.scenes[0].transition).toBeUndefined();
      expect(r.warnings.join()).toContain("invalid transition");
    }
  });

  it("accepts all valid transitions", () => {
    for (const transition of VALID_TRANSITIONS) {
      const r = validateVideoScript({
        title: "X",
        scenes: [{ elements: [{ type: "text" }], transition }],
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.scenes[0].transition).toBe(transition);
    }
  });
});

// ============================================================
// Element validation
// ============================================================

describe("validateVideoScript — element validation", () => {
  it("accepts all valid element types", () => {
    for (const type of VALID_ELEMENT_TYPES) {
      const r = validateVideoScript({
        title: "X",
        scenes: [{ elements: [{ type }] }],
      });
      expect(r.ok).toBe(true);
    }
  });

  it("rejects unknown element type", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "video" }] }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("invalid type");
  });

  it("rejects element without type", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ content: "hello" }] }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("missing \"type\"");
  });

  it("warns on invalid stagger and defaults to normal", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text", stagger: "slow" }] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.scenes[0].elements[0].stagger).toBe("normal");
      expect(r.warnings.join()).toContain("invalid stagger");
    }
  });

  it("accepts all valid stagger speeds", () => {
    for (const stagger of VALID_STAGGER_SPEEDS) {
      const r = validateVideoScript({
        title: "X",
        scenes: [{ elements: [{ type: "text", stagger }] }],
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.scenes[0].elements[0].stagger).toBe(stagger);
    }
  });

  it("warns on invalid animation and defaults to fade", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text", animation: "spin" }] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const el = r.data.scenes[0].elements[0] as Record<string, unknown>;
      expect(el.animation).toBe("fade");
      expect(r.warnings.join()).toContain("invalid animation");
    }
  });

  it("clamps negative delay to 0", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text", delay: -10 }] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.scenes[0].elements[0].delay).toBe(0);
  });

  it("preserves custom element properties", () => {
    const r = validateVideoScript({
      title: "X",
      scenes: [{ elements: [{ type: "text", content: "Hello", fontSize: 36, color: "#fff" }] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const el = r.data.scenes[0].elements[0] as Record<string, unknown>;
      expect(el.content).toBe("Hello");
      expect(el.fontSize).toBe(36);
      expect(el.color).toBe("#fff");
    }
  });
});

// ============================================================
// validateSettings
// ============================================================

describe("validateSettings", () => {
  it("accepts valid settings", () => {
    const r = validateSettings({
      geminiApiKey: "AIza_test_key",
      geminiModel: "gemini-2.0-flash",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.geminiApiKey).toBe("AIza_test_key");
      expect(r.data.geminiModel).toBe("gemini-2.0-flash");
    }
  });

  it("rejects non-object input", () => {
    expect(validateSettings(null).ok).toBe(false);
    expect(validateSettings("string").ok).toBe(false);
  });

  it("defaults missing API key to empty string", () => {
    const r = validateSettings({ geminiModel: "gemini-2.0-flash" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.geminiApiKey).toBe("");
  });

  it("defaults missing model to gemini-2.0-flash", () => {
    const r = validateSettings({ geminiApiKey: "key" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.geminiModel).toBe("gemini-2.0-flash");
  });

  it("warns and falls back on unknown model", () => {
    const r = validateSettings({ geminiApiKey: "key", geminiModel: "gpt-4o" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.geminiModel).toBe("gemini-2.0-flash");
      expect(r.warnings.join()).toContain("Unknown model");
    }
  });

  it("trims whitespace from API key and model", () => {
    const r = validateSettings({
      geminiApiKey: "  key  ",
      geminiModel: "  gemini-2.0-flash  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.geminiApiKey).toBe("key");
      expect(r.data.geminiModel).toBe("gemini-2.0-flash");
    }
  });
});

// ============================================================
// Enum constants integrity
// ============================================================

describe("Enum constants", () => {
  it("VALID_ELEMENT_TYPES has expected count", () => {
    expect(VALID_ELEMENT_TYPES.length).toBe(15);
  });

  it("VALID_ANIMATIONS has expected count", () => {
    expect(VALID_ANIMATIONS.length).toBe(10);
  });

  it("CONSTRAINTS has sane values", () => {
    expect(CONSTRAINTS.MIN_SCENE_FRAMES).toBeGreaterThan(20); // Must exceed TRANSITION_FRAMES
    expect(CONSTRAINTS.MIN_FPS).toBeLessThanOrEqual(CONSTRAINTS.MAX_FPS);
    expect(CONSTRAINTS.DEFAULT_FPS).toBeGreaterThanOrEqual(CONSTRAINTS.MIN_FPS);
    expect(CONSTRAINTS.DEFAULT_FPS).toBeLessThanOrEqual(CONSTRAINTS.MAX_FPS);
  });
});
