import { describe, it, expect, beforeEach } from "vitest";
import {
  getLastScript,
  setLastScript,
  resetScriptState,
  setLastPalette,
  resetPaletteState,
  getToolExecutor,
} from "../src/services/agentToolRegistry";

// Side-effect: register refine_scene tool
import "../src/services/agentToolRefine";

const MOCK_CONTEXT = { userPrompt: "Test prompt" };

/** Helper: build a 3-scene stored script */
function threeSceneScript(): Record<string, unknown> {
  return {
    id: "test-1",
    title: "Test Script",
    fps: 30,
    width: 1920,
    height: 1080,
    scenes: [
      { id: "s1", durationInFrames: 150, narration: "Scene one", elements: [{ type: "text", content: "Hello" }], transition: "fade" },
      { id: "s2", durationInFrames: 180, narration: "Scene two", elements: [{ type: "bar-chart", bars: [{ label: "A", value: 10 }] }], transition: "slide" },
      { id: "s3", durationInFrames: 150, narration: "Scene three", elements: [{ type: "metric", items: [{ value: "42", label: "KPI" }] }], transition: "wipe" },
    ],
    theme: {},
  };
}

describe("refine_scene", () => {
  const executor = getToolExecutor("refine_scene")!;

  beforeEach(() => {
    resetScriptState();
    resetPaletteState();
  });

  it("executor is registered", () => {
    expect(executor).toBeDefined();
  });

  it("returns error when no stored script", async () => {
    const res = await executor(
      { scene_index: 0, updated_scene: "{}", reason: "test" },
      MOCK_CONTEXT,
    );
    expect(res.result.error).toContain("produce_script first");
    expect(res.result.is_error).toBe(true);
  });

  it("returns error on out-of-bounds index", async () => {
    setLastScript(threeSceneScript());
    const res = await executor(
      { scene_index: 5, updated_scene: "{}", reason: "test" },
      MOCK_CONTEXT,
    );
    expect(res.result.error).toContain("Invalid scene_index 5");
    expect(res.result.is_error).toBe(true);
  });

  it("returns error on negative index", async () => {
    setLastScript(threeSceneScript());
    const res = await executor(
      { scene_index: -1, updated_scene: "{}", reason: "test" },
      MOCK_CONTEXT,
    );
    expect(res.result.error).toContain("Invalid scene_index -1");
  });

  it("returns error on invalid JSON string", async () => {
    setLastScript(threeSceneScript());
    const res = await executor(
      { scene_index: 0, updated_scene: "not-json{", reason: "test" },
      MOCK_CONTEXT,
    );
    expect(res.result.error).toContain("not valid JSON");
  });

  it("patches scene (non-terminal)", async () => {
    setLastScript(threeSceneScript());
    const newScene = { id: "s2-fixed", durationInFrames: 200, narration: "Fixed", elements: [], transition: "zoom-out" };

    const res = await executor(
      { scene_index: 1, updated_scene: JSON.stringify(newScene), reason: "fix bar-chart" },
      MOCK_CONTEXT,
    );

    expect(res.result.terminal).toBeUndefined();
    expect(res.result.patched_scene_index).toBe(1);
    expect(res.result.scene_count).toBe(3);

    // Verify stored script is updated
    const stored = getLastScript()!;
    const scenes = stored.scenes as Record<string, unknown>[];
    expect(scenes[1].id).toBe("s2-fixed");
    expect(scenes[1].narration).toBe("Fixed");
    // Other scenes untouched
    expect(scenes[0].id).toBe("s1");
    expect(scenes[2].id).toBe("s3");
  });

  it("accepts object instead of JSON string (Gemini fallback)", async () => {
    setLastScript(threeSceneScript());
    const newScene = { id: "s1-obj", durationInFrames: 120, narration: "Object", elements: [], transition: "fade" };

    const res = await executor(
      { scene_index: 0, updated_scene: newScene as unknown as string, reason: "object fallback" },
      MOCK_CONTEXT,
    );

    expect(res.result.patched_scene_index).toBe(0);
    const stored = getLastScript()!;
    expect((stored.scenes as Record<string, unknown>[])[0].id).toBe("s1-obj");
  });

  it("returns terminal with full script when is_final=true", async () => {
    setLastScript(threeSceneScript());
    const newScene = { id: "s3-final", durationInFrames: 200, narration: "Final", elements: [], transition: "dissolve" };

    const res = await executor(
      { scene_index: 2, updated_scene: JSON.stringify(newScene), reason: "CTA fix", is_final: true },
      MOCK_CONTEXT,
    );

    expect(res.result.terminal).toBe(true);
    const script = res.result.script as Record<string, unknown>;
    expect(script).toBeDefined();
    const scenes = script.scenes as Record<string, unknown>[];
    expect(scenes[2].id).toBe("s3-final");
    expect(scenes.length).toBe(3);
  });

  it("auto-injects palette chartColors on terminal", async () => {
    const mockPalette = {
      primary: "#2563eb",
      secondary: "#7c3aed",
      accent: "#f59e0b",
      chart: ["#c1", "#c2", "#c3", "#c4", "#c5", "#c6", "#c7", "#c8"],
      bg: { light: "#fff", dark: "#000" },
      text: { primary: "#111", secondary: "#666" },
    };
    setLastPalette(mockPalette);
    setLastScript(threeSceneScript());

    const newScene = { id: "s1-pal", durationInFrames: 150, narration: "Palette", elements: [], transition: "fade" };
    const res = await executor(
      { scene_index: 0, updated_scene: JSON.stringify(newScene), reason: "palette test", is_final: true },
      MOCK_CONTEXT,
    );

    const script = res.result.script as Record<string, unknown>;
    const theme = script.theme as Record<string, unknown>;
    expect(theme.chartColors).toEqual(mockPalette.chart);
  });

  it("sequential refinements compose correctly", async () => {
    setLastScript(threeSceneScript());

    // Refine scene 0
    await executor(
      { scene_index: 0, updated_scene: JSON.stringify({ id: "s1-v2", durationInFrames: 100, narration: "V2", elements: [], transition: "fade" }), reason: "fix hook" },
      MOCK_CONTEXT,
    );

    // Refine scene 2
    await executor(
      { scene_index: 2, updated_scene: JSON.stringify({ id: "s3-v2", durationInFrames: 100, narration: "V2", elements: [], transition: "wipe" }), reason: "fix CTA" },
      MOCK_CONTEXT,
    );

    // Refine scene 1 with is_final
    const res = await executor(
      { scene_index: 1, updated_scene: JSON.stringify({ id: "s2-v2", durationInFrames: 100, narration: "V2", elements: [], transition: "slide" }), reason: "fix chart", is_final: true },
      MOCK_CONTEXT,
    );

    expect(res.result.terminal).toBe(true);
    const scenes = (res.result.script as Record<string, unknown>).scenes as Record<string, unknown>[];
    expect(scenes[0].id).toBe("s1-v2");
    expect(scenes[1].id).toBe("s2-v2");
    expect(scenes[2].id).toBe("s3-v2");
  });

  it("resetScriptState clears stored script", () => {
    setLastScript(threeSceneScript());
    expect(getLastScript()).not.toBeNull();
    resetScriptState();
    expect(getLastScript()).toBeNull();
  });
});
