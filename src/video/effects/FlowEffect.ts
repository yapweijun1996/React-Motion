/**
 * FlowEffect — particles following a curl noise flow field.
 *
 * Particles drift along smooth curved paths (like smoke or water currents).
 * Uses simplex-like noise approximation for deterministic flow vectors.
 * No connection lines — just flowing dots with varied opacity.
 */

const PARTICLE_COUNT = 40;
const FLOW_SCALE = 0.0015;   // noise frequency — lower = wider curves
const FLOW_STRENGTH = 1.2;   // how much noise affects velocity
const BASE_DRIFT = 0.3;      // constant rightward drift for direction sense

type FlowParticle = {
  x: number; y: number;
  size: number;     // 2–6px
  opacity: number;  // 0.15–0.5
  speed: number;    // per-particle speed multiplier
};

export type FlowFrame = {
  x: number; y: number;
  size: number; opacity: number;
};

/** Simple 2D noise (deterministic, no library). */
function noise2(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1; // [-1, 1]
}

/** Smooth noise with bilinear interpolation. */
function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = noise2(ix, iy);
  const n10 = noise2(ix + 1, iy);
  const n01 = noise2(ix, iy + 1);
  const n11 = noise2(ix + 1, iy + 1);
  return n00 * (1 - sx) * (1 - sy) + n10 * sx * (1 - sy)
       + n01 * (1 - sx) * sy + n11 * sx * sy;
}

export function initFlow(w: number, h: number): FlowParticle[] {
  const particles: FlowParticle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const phi = (i * 0.618033988749895) % 1;
    const theta = i / PARTICLE_COUNT;
    particles.push({
      x: phi * w,
      y: theta * h,
      size: 2 + (i % 5) * 1,
      opacity: 0.15 + (i % 7) * 0.05,
      speed: 0.7 + (i % 4) * 0.2,
    });
  }
  return particles;
}

export function frameFlow(
  base: FlowParticle[],
  frame: number,
  w: number,
  h: number,
): FlowFrame[] {
  return base.map((p) => {
    // Simulate position by stepping from init — deterministic for any frame
    let x = p.x;
    let y = p.y;
    // Step in increments (larger step for performance, still smooth at 30fps)
    const steps = frame;
    for (let s = 0; s < steps; s++) {
      const nx = x * FLOW_SCALE;
      const ny = y * FLOW_SCALE + s * 0.001; // time evolution
      const angle = smoothNoise(nx, ny) * Math.PI * 2;
      x += (Math.cos(angle) * FLOW_STRENGTH + BASE_DRIFT) * p.speed;
      y += Math.sin(angle) * FLOW_STRENGTH * p.speed;
      // Wrap
      if (x > w) x -= w;
      if (x < 0) x += w;
      if (y > h) y -= h;
      if (y < 0) y += h;
    }

    // Subtle breathing
    const pulse = Math.sin(frame * 0.05 + p.x * 0.01) * 0.2 + 1;

    return { x, y, size: p.size * pulse, opacity: p.opacity };
  });
}

export function drawFlow(
  ctx: CanvasRenderingContext2D,
  particles: FlowFrame[],
  rgb: string,
  alpha: number,
): void {
  for (const p of particles) {
    const a = p.opacity * alpha;
    if (a <= 0.005) continue;

    // Soft glow
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    grad.addColorStop(0, `rgba(${rgb},${a})`);
    grad.addColorStop(0.5, `rgba(${rgb},${a * 0.3})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core dot
    ctx.fillStyle = `rgba(${rgb},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
