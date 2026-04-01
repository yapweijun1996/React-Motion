// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  TRANSITION_FRAMES,
  getTransitionProgress,
  computeEffectiveStarts,
  computeTotalDuration,
  getVisibleScenes,
  getTransitionStyle,
  clockWipePolygon,
  diamondPolygon,
  splitPolygon,
} from "../src/video/SceneRenderer";
import type { VideoScene } from "../src/types";

// ---------------------------------------------------------------------------
// Helper: minimal VideoScene factory
// ---------------------------------------------------------------------------

function scene(
  id: string,
  durationInFrames: number,
  transition?: VideoScene["transition"],
): VideoScene {
  return {
    id,
    startFrame: 0, // not used by SceneRenderer — effective starts are computed
    durationInFrames,
    elements: [],
    transition,
  };
}

// ---------------------------------------------------------------------------
// getTransitionProgress
// ---------------------------------------------------------------------------

describe("getTransitionProgress", () => {
  it("returns 0 at frame 0", () => {
    expect(getTransitionProgress(0)).toBe(0);
  });

  it("returns 1 at TRANSITION_FRAMES", () => {
    expect(getTransitionProgress(TRANSITION_FRAMES)).toBe(1);
  });

  it("returns monotonically increasing values", () => {
    let prev = 0;
    for (let f = 1; f <= TRANSITION_FRAMES; f++) {
      const p = getTransitionProgress(f);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });

  it("clamps negative frames to 0", () => {
    expect(getTransitionProgress(-5)).toBe(0);
  });

  it("clamps frames beyond TRANSITION_FRAMES to 1", () => {
    expect(getTransitionProgress(TRANSITION_FRAMES + 10)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeEffectiveStarts
// ---------------------------------------------------------------------------

describe("computeEffectiveStarts", () => {
  it("returns [0] for a single scene", () => {
    const scenes = [scene("s0", 150)];
    expect(computeEffectiveStarts(scenes)).toEqual([0]);
  });

  it("returns correct starts for 2 scenes", () => {
    const scenes = [scene("s0", 150), scene("s1", 180)];
    // s0 starts at 0, s1 starts at 150 - 20 = 130
    expect(computeEffectiveStarts(scenes)).toEqual([0, 130]);
  });

  it("returns correct starts for 3 scenes", () => {
    const scenes = [scene("s0", 150), scene("s1", 180), scene("s2", 120)];
    // s0: 0, s1: 150-20=130, s2: 130+180-20=290
    expect(computeEffectiveStarts(scenes)).toEqual([0, 130, 290]);
  });

  it("returns empty array for no scenes", () => {
    expect(computeEffectiveStarts([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeTotalDuration
// ---------------------------------------------------------------------------

describe("computeTotalDuration", () => {
  it("returns 0 for no scenes", () => {
    expect(computeTotalDuration([])).toBe(0);
  });

  it("returns scene duration for single scene (no transition)", () => {
    expect(computeTotalDuration([scene("s0", 150)])).toBe(150);
  });

  it("subtracts overlap for 2 scenes", () => {
    const scenes = [scene("s0", 150), scene("s1", 180)];
    // 150 + 180 - 20 = 310
    expect(computeTotalDuration(scenes)).toBe(310);
  });

  it("subtracts overlap for 3 scenes", () => {
    const scenes = [scene("s0", 150), scene("s1", 180), scene("s2", 120)];
    // 150 + 180 + 120 - 2*20 = 410
    expect(computeTotalDuration(scenes)).toBe(410);
  });
});

// ---------------------------------------------------------------------------
// getVisibleScenes
// ---------------------------------------------------------------------------

describe("getVisibleScenes", () => {
  it("returns empty for no scenes", () => {
    expect(getVisibleScenes(0, [])).toEqual([]);
  });

  it("returns single static scene in middle of playback", () => {
    const scenes = [scene("s0", 150)];
    const visible = getVisibleScenes(60, scenes);
    expect(visible).toHaveLength(1);
    expect(visible[0].direction).toBe("static");
    expect(visible[0].localFrame).toBe(60);
    expect(visible[0].sceneIndex).toBe(0);
  });

  it("returns static for first scene before exit zone", () => {
    const scenes = [scene("s0", 150), scene("s1", 180)];
    const visible = getVisibleScenes(60, scenes);
    expect(visible).toHaveLength(1);
    expect(visible[0].direction).toBe("static");
    expect(visible[0].scene.id).toBe("s0");
  });

  it("returns 2 scenes during transition", () => {
    const scenes = [scene("s0", 150), scene("s1", 180, "slide")];
    // Effective starts: [0, 130]. Transition zone: frames 130-149.
    // At frame 135: s0 is exiting (localFrame=135, exitStart=130), s1 is entering (localFrame=5)
    const visible = getVisibleScenes(135, scenes);
    expect(visible).toHaveLength(2);

    // First: exiting scene
    expect(visible[0].scene.id).toBe("s0");
    expect(visible[0].direction).toBe("exiting");
    expect(visible[0].localFrame).toBe(135);

    // Second: entering scene
    expect(visible[1].scene.id).toBe("s1");
    expect(visible[1].direction).toBe("entering");
    expect(visible[1].localFrame).toBe(5); // 135 - 130
  });

  it("exiting scene uses entering scene's transition type", () => {
    const scenes = [scene("s0", 150, "fade"), scene("s1", 180, "slide")];
    const visible = getVisibleScenes(135, scenes);
    // Exiting scene should use s1's transition type ("slide")
    expect(visible[0].transitionType).toBe("slide");
    // Entering scene uses its own
    expect(visible[1].transitionType).toBe("slide");
  });

  it("returns static for second scene after entering zone", () => {
    const scenes = [scene("s0", 150), scene("s1", 180)];
    // Effective starts: [0, 130]. After entering zone: frame >= 130+20 = 150
    const visible = getVisibleScenes(155, scenes);
    expect(visible).toHaveLength(1);
    expect(visible[0].scene.id).toBe("s1");
    expect(visible[0].direction).toBe("static");
    expect(visible[0].localFrame).toBe(25); // 155 - 130
  });

  it("returns nothing beyond total duration", () => {
    const scenes = [scene("s0", 150)];
    const visible = getVisibleScenes(150, scenes);
    expect(visible).toHaveLength(0);
  });

  it("progress is 0 for static scenes", () => {
    const scenes = [scene("s0", 150)];
    const visible = getVisibleScenes(60, scenes);
    expect(visible[0].progress).toBe(0);
  });

  it("entering progress increases over transition zone", () => {
    const scenes = [scene("s0", 150), scene("s1", 180)];
    // Effective starts: [0, 130]
    const p1 = getVisibleScenes(131, scenes)[1].progress; // entering frame 1
    const p10 = getVisibleScenes(140, scenes)[1].progress; // entering frame 10
    expect(p10).toBeGreaterThan(p1);
  });
});

// ---------------------------------------------------------------------------
// getTransitionStyle
// ---------------------------------------------------------------------------

describe("getTransitionStyle", () => {
  describe("fade", () => {
    it("entering: opacity = progress", () => {
      const style = getTransitionStyle("fade", 0.5, "entering");
      expect(style.opacity).toBe(0.5);
    });

    it("exiting: opacity = 1 - progress", () => {
      const style = getTransitionStyle("fade", 0.3, "exiting");
      expect(style.opacity).toBeCloseTo(0.7);
    });
  });

  describe("slide", () => {
    it("entering: translateX from -100% to 0%", () => {
      const style = getTransitionStyle("slide", 0, "entering");
      expect(style.transform).toBe("translateX(-100%)");
    });

    it("entering at progress=1: translateX(0%)", () => {
      const style = getTransitionStyle("slide", 1, "entering");
      expect(style.transform).toBe("translateX(0%)");
      // Actually (1-1)*-100 = -0 which is "translateX(-0%)"
      // Let's check
    });

    it("exiting: translateX from 0% to 100%", () => {
      const style = getTransitionStyle("slide", 0.5, "exiting");
      expect(style.transform).toBe("translateX(50%)");
    });
  });

  describe("wipe", () => {
    it("entering: clip-path inset shrinks from right", () => {
      const style = getTransitionStyle("wipe", 0, "entering");
      expect(style.clipPath).toBe("inset(0 100% 0 0)");
    });

    it("entering at progress=1: fully revealed", () => {
      const style = getTransitionStyle("wipe", 1, "entering");
      expect(style.clipPath).toBe("inset(0 0% 0 0)");
    });

    it("exiting: no clip (sits behind entering)", () => {
      const style = getTransitionStyle("wipe", 0.5, "exiting");
      expect(style.clipPath).toBeUndefined();
    });
  });

  describe("clock-wipe", () => {
    it("entering: returns polygon clip-path", () => {
      const style = getTransitionStyle("clock-wipe", 0.5, "entering");
      expect(style.clipPath).toMatch(/^polygon\(/);
    });

    it("exiting: no clip", () => {
      const style = getTransitionStyle("clock-wipe", 0.5, "exiting");
      expect(style.clipPath).toBeUndefined();
    });
  });

  describe("default (undefined)", () => {
    it("falls back to fade behavior", () => {
      const style = getTransitionStyle(undefined, 0.6, "entering");
      expect(style.opacity).toBe(0.6);
    });
  });
});

// ---------------------------------------------------------------------------
// clockWipePolygon
// ---------------------------------------------------------------------------

describe("clockWipePolygon", () => {
  it("returns degenerate polygon at progress=0", () => {
    expect(clockWipePolygon(0)).toBe("polygon(50% 50%, 50% 50%)");
  });

  it("returns 'none' at progress=1 (fully visible)", () => {
    expect(clockWipePolygon(1)).toBe("none");
  });

  it("starts from center + top (12 o'clock)", () => {
    const poly = clockWipePolygon(0.1);
    // Should contain center point and top point
    expect(poly).toContain("50% 50%");
    expect(poly).toContain("50% -25%"); // 50 - 75 = -25
  });

  it("generates more points for larger angles", () => {
    const small = clockWipePolygon(0.1); // 36°
    const large = clockWipePolygon(0.8); // 288°
    // More angle = more polygon points
    const smallPoints = small.split(",").length;
    const largePoints = large.split(",").length;
    expect(largePoints).toBeGreaterThan(smallPoints);
  });
});

// ---------------------------------------------------------------------------
// New transitions (Phase 3.1)
// ---------------------------------------------------------------------------

describe("new transitions — getTransitionStyle", () => {
  describe("radial-wipe", () => {
    it("entering: circle clip-path expands", () => {
      const s = getTransitionStyle("radial-wipe", 0.5, "entering");
      expect(s.clipPath).toMatch(/^circle\(/);
    });
    it("exiting: no style (sits behind)", () => {
      const s = getTransitionStyle("radial-wipe", 0.5, "exiting");
      expect(Object.keys(s)).toHaveLength(0);
    });
  });

  describe("diamond-wipe", () => {
    it("entering: polygon clip-path", () => {
      const s = getTransitionStyle("diamond-wipe", 0.5, "entering");
      expect(s.clipPath).toMatch(/^polygon\(/);
    });
  });

  describe("iris", () => {
    it("entering at 0: fully clipped (all 50%)", () => {
      const s = getTransitionStyle("iris", 0, "entering");
      expect(s.clipPath).toBe("inset(50% 50% 50% 50%)");
    });
    it("entering at 1: fully revealed (all 0%)", () => {
      const s = getTransitionStyle("iris", 1, "entering");
      expect(s.clipPath).toBe("inset(0% 0% 0% 0%)");
    });
  });

  describe("zoom-out", () => {
    it("exiting: scale down + fade", () => {
      const s = getTransitionStyle("zoom-out", 0.5, "exiting");
      expect(s.transform).toContain("scale(");
      expect(s.opacity).toBe(0.5);
    });
    it("entering: opacity fade in", () => {
      const s = getTransitionStyle("zoom-out", 0.5, "entering");
      expect(s.opacity).toBe(0.5);
    });
  });

  describe("zoom-blur", () => {
    it("exiting: scale + blur + fade", () => {
      const s = getTransitionStyle("zoom-blur", 0.5, "exiting");
      expect(s.transform).toContain("scale(");
      expect(s.filter).toContain("blur(");
      expect(s.opacity).toBe(0.5);
    });
  });

  describe("slide-up", () => {
    it("entering: translateY from 100% to 0%", () => {
      const at0 = getTransitionStyle("slide-up", 0, "entering");
      expect(at0.transform).toBe("translateY(100%)");
      const at1 = getTransitionStyle("slide-up", 1, "entering");
      expect(at1.transform).toBe("translateY(0%)");
    });
    it("exiting: translateY from 0% to -100%", () => {
      const s = getTransitionStyle("slide-up", 1, "exiting");
      expect(s.transform).toBe("translateY(-100%)");
    });
  });

  describe("split", () => {
    it("entering: polygon clip-path opens from center", () => {
      const s = getTransitionStyle("split", 0.5, "entering");
      expect(s.clipPath).toMatch(/^polygon\(/);
    });
  });

  describe("rotate", () => {
    it("exiting: rotate + scale + fade", () => {
      const s = getTransitionStyle("rotate", 0.5, "exiting");
      expect(s.transform).toContain("rotate(");
      expect(s.transform).toContain("scale(");
      expect(s.opacity).toBe(0.5);
    });
    it("entering: opacity fade in", () => {
      const s = getTransitionStyle("rotate", 0.5, "entering");
      expect(s.opacity).toBe(0.5);
    });
  });
});

describe("diamondPolygon", () => {
  it("returns degenerate at progress=0", () => {
    expect(diamondPolygon(0)).toContain("50% 50%");
  });
  it("returns 'none' at progress=1", () => {
    expect(diamondPolygon(1)).toBe("none");
  });
  it("returns 4-point polygon at 0.5", () => {
    const poly = diamondPolygon(0.5);
    expect(poly).toMatch(/^polygon\(/);
    expect(poly.split(",")).toHaveLength(4);
  });
});

describe("splitPolygon", () => {
  it("returns closed polygon at progress=0", () => {
    expect(splitPolygon(0)).toContain("50%");
  });
  it("returns 'none' at progress=1", () => {
    expect(splitPolygon(1)).toBe("none");
  });
  it("opens wider as progress increases", () => {
    const narrow = splitPolygon(0.2);
    const wide = splitPolygon(0.8);
    // Extract first x coordinate — wider progress = smaller left x
    const getLeftX = (p: string) => parseFloat(p.match(/polygon\((\d+\.?\d*)%/)?.[1] ?? "50");
    expect(getLeftX(wide)).toBeLessThan(getLeftX(narrow));
  });
});
