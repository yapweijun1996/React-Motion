import { describe, it, expect } from "vitest";
import { spring, interpolate, noise2D, noise3D } from "../src/video/animation";

describe("spring()", () => {
  it("returns 0 (from) when frame <= 0", () => {
    expect(spring({ frame: 0, fps: 30 })).toBe(0);
    expect(spring({ frame: -5, fps: 30 })).toBe(0);
  });

  it("converges toward 1 (to) over time", () => {
    const val30 = spring({ frame: 30, fps: 30 });
    const val120 = spring({ frame: 120, fps: 30 });

    expect(val30).toBeGreaterThan(0.5);
    // Under-damped spring may overshoot, but eventually settles near 1
    expect(val120).toBeCloseTo(1, 1);
  });

  it("respects from/to parameters", () => {
    const val = spring({ frame: 120, fps: 30, from: 10, to: 20 });
    expect(val).toBeCloseTo(20, 0);
  });

  it("higher damping settles closer to target at later frames", () => {
    // At frame 60, high damping should be closer to 1.0 with less residual oscillation
    const lowDamp = spring({ frame: 60, fps: 30, config: { damping: 5 } });
    const highDamp = spring({ frame: 60, fps: 30, config: { damping: 20 } });
    expect(Math.abs(1 - highDamp)).toBeLessThan(Math.abs(1 - lowDamp));
  });

  it("overshootClamping prevents overshoot", () => {
    // Low damping can overshoot
    for (let f = 0; f <= 60; f++) {
      const val = spring({
        frame: f,
        fps: 30,
        config: { damping: 5, stiffness: 200, overshootClamping: true },
      });
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("works with typical element configs from the codebase", () => {
    // hero: { damping: 16, mass: 0.7 }
    const hero = spring({ frame: 20, fps: 30, config: { damping: 16, mass: 0.7 } });
    expect(hero).toBeGreaterThan(0.8);

    // data: { damping: 14, mass: 0.6 }
    const data = spring({ frame: 20, fps: 30, config: { damping: 14, mass: 0.6 } });
    expect(data).toBeGreaterThan(0.8);

    // support: { damping: 12, mass: 0.5 }
    const support = spring({ frame: 20, fps: 30, config: { damping: 12, mass: 0.5 } });
    expect(support).toBeGreaterThan(0.7);
  });
});

describe("interpolate()", () => {
  it("maps value linearly between two points", () => {
    expect(interpolate(0.5, [0, 1], [0, 100])).toBe(50);
    expect(interpolate(0, [0, 1], [0, 100])).toBe(0);
    expect(interpolate(1, [0, 1], [0, 100])).toBe(100);
  });

  it("clamps by default", () => {
    expect(interpolate(-1, [0, 1], [0, 100])).toBe(0);
    expect(interpolate(2, [0, 1], [0, 100])).toBe(100);
  });

  it("extends when extrapolate is set to extend", () => {
    const val = interpolate(2, [0, 1], [0, 100], {
      extrapolateRight: "extend",
    });
    expect(val).toBe(200);
  });

  it("supports multi-keyframe ranges", () => {
    // bounce-like: [0, 0.55, 0.8, 1] → [0.3, 1.12, 0.95, 1]
    const mid = interpolate(0.55, [0, 0.55, 0.8, 1], [0.3, 1.12, 0.95, 1]);
    expect(mid).toBeCloseTo(1.12, 2);

    const end = interpolate(1, [0, 0.55, 0.8, 1], [0.3, 1.12, 0.95, 1]);
    expect(end).toBeCloseTo(1, 2);
  });

  it("handles rubber-band 5-keyframe range", () => {
    // scaleX: [0, 0.4, 0.65, 0.85, 1] → [0.3, 1.25, 0.9, 1.05, 1]
    const at04 = interpolate(0.4, [0, 0.4, 0.65, 0.85, 1], [0.3, 1.25, 0.9, 1.05, 1]);
    expect(at04).toBeCloseTo(1.25, 2);

    const at1 = interpolate(1, [0, 0.4, 0.65, 0.85, 1], [0.3, 1.25, 0.9, 1.05, 1]);
    expect(at1).toBeCloseTo(1, 2);
  });

  it("throws if ranges have different lengths", () => {
    expect(() => interpolate(0.5, [0, 1], [0, 50, 100])).toThrow();
  });
});

describe("noise2D()", () => {
  it("returns value in [-1, 1] range", () => {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const val = noise2D("test", x * 0.5, y * 0.5);
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is deterministic for the same seed", () => {
    const a = noise2D("seed1", 3.7, 2.3);
    const b = noise2D("seed1", 3.7, 2.3);
    expect(a).toBe(b);
  });

  it("different seeds produce different values", () => {
    // Use non-integer coords (integer coords return 0 in Perlin noise)
    const a = noise2D("seed1", 1.5, 2.3);
    const b = noise2D("seed2", 1.5, 2.3);
    expect(a).not.toBe(b);
  });

  it("returns 0 at integer coordinates (Perlin property)", () => {
    // Perlin noise at integer grid points has zero gradient contribution
    // so the value should be 0 or very close
    const val = noise2D("test", 0, 0);
    expect(Math.abs(val)).toBeLessThan(0.01);
  });
});

describe("noise3D()", () => {
  it("returns value in [-1, 1] range", () => {
    for (let i = 0; i < 20; i++) {
      const val = noise3D("test3d", i * 0.3, i * 0.7, i * 0.5);
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic", () => {
    const a = noise3D("s", 1.5, 2.5, 3.5);
    const b = noise3D("s", 1.5, 2.5, 3.5);
    expect(a).toBe(b);
  });
});
