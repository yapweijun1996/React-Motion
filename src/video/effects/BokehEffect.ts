/**
 * BokehEffect — soft, out-of-focus light orbs.
 *
 * Large blurry circles with radial gradients, 3-layer parallax depth,
 * breathing pulse on size and opacity. Dreamy, cinematic feel.
 */

const ORB_COUNT = 20;
const BASE_SPEED = 0.15;

type Orb = {
  x: number; y: number;
  vx: number; vy: number;
  radius: number; opacity: number;
  pulseSpeed: number; pulsePhase: number;
  layer: number;
};

export type OrbFrame = {
  x: number; y: number;
  radius: number; opacity: number;
};

export function initBokeh(w: number, h: number): Orb[] {
  const orbs: Orb[] = [];
  for (let i = 0; i < ORB_COUNT; i++) {
    const phi = (i * 0.618033988749895) % 1;
    const theta = i / ORB_COUNT;
    const layer = i % 3;
    const speedMul = 0.4 + layer * 0.4;
    orbs.push({
      x: phi * w, y: theta * h,
      vx: Math.cos(i * 2.399) * BASE_SPEED * speedMul,
      vy: Math.sin(i * 2.399) * BASE_SPEED * speedMul,
      radius: layer === 0 ? 80 + (i % 5) * 12
            : layer === 1 ? 40 + (i % 7) * 8
            :               20 + (i % 6) * 5,
      opacity: layer === 0 ? 0.05 + (i % 4) * 0.01
             : layer === 1 ? 0.08 + (i % 3) * 0.02
             :               0.12 + (i % 5) * 0.015,
      pulseSpeed: 0.008 + (i % 5) * 0.003,
      pulsePhase: (i * 1.7) % (Math.PI * 2),
      layer,
    });
  }
  return orbs;
}

export function frameBokeh(base: Orb[], frame: number, w: number, h: number): OrbFrame[] {
  return base.map((o) => {
    let x = (o.x + o.vx * frame) % w;
    let y = (o.y + o.vy * frame) % h;
    if (x < 0) x += w;
    if (y < 0) y += h;
    const pulse = Math.sin(frame * o.pulseSpeed + o.pulsePhase);
    return {
      x, y,
      radius: o.radius * (1 + pulse * 0.15),
      opacity: o.opacity * (1 + pulse * 0.3),
    };
  });
}

export function drawBokeh(
  ctx: CanvasRenderingContext2D,
  orbs: OrbFrame[],
  rgb: string,
  alpha: number,
): void {
  const sorted = [...orbs].sort((a, b) => a.opacity - b.opacity);
  for (const orb of sorted) {
    const a = orb.opacity * alpha;
    if (a <= 0.005) continue;
    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
    grad.addColorStop(0, `rgba(${rgb},${a})`);
    grad.addColorStop(0.4, `rgba(${rgb},${a * 0.5})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
