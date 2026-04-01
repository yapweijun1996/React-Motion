/**
 * RisingEffect — firefly / bubble-like particles rising upward.
 *
 * Particles slowly float up with gentle horizontal sway.
 * Varied sizes create depth. Breathing flicker on opacity.
 * New particles spawn at bottom as old ones exit top.
 */

const PARTICLE_COUNT = 30;

type RisingParticle = {
  x: number;          // initial x position
  speed: number;       // rise speed (px/frame)
  sway: number;        // horizontal sway amplitude
  swayFreq: number;    // sway oscillation frequency
  size: number;        // 2–8px
  opacity: number;     // 0.1–0.45
  flickerSpeed: number;
  flickerPhase: number;
  yOffset: number;     // stagger start so not all start at bottom
};

export type RisingFrame = {
  x: number; y: number;
  size: number; opacity: number;
};

export function initRising(w: number, h: number): RisingParticle[] {
  const particles: RisingParticle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const phi = (i * 0.618033988749895) % 1;
    particles.push({
      x: phi * w,
      speed: 0.3 + (i % 6) * 0.15,    // 0.3–1.05 px/frame
      sway: 15 + (i % 5) * 8,          // 15–47px amplitude
      swayFreq: 0.01 + (i % 4) * 0.005,
      size: 2 + (i % 7),               // 2–8px
      opacity: 0.1 + (i % 8) * 0.05,   // 0.1–0.45
      flickerSpeed: 0.04 + (i % 5) * 0.02,
      flickerPhase: (i * 2.3) % (Math.PI * 2),
      yOffset: (i / PARTICLE_COUNT) * h, // stagger across full height
    });
  }
  return particles;
}

export function frameRising(
  base: RisingParticle[],
  frame: number,
  w: number,
  h: number,
): RisingFrame[] {
  return base.map((p) => {
    // Rising: start from yOffset, move up, wrap around
    let y = p.yOffset - p.speed * frame;
    // Wrap: when particle goes above top, reappear at bottom
    y = ((y % h) + h) % h;

    // Horizontal sway
    const x = p.x + Math.sin(frame * p.swayFreq + p.x * 0.01) * p.sway;

    // Flicker / breathe
    const flicker = Math.sin(frame * p.flickerSpeed + p.flickerPhase);
    const opacity = p.opacity * (0.6 + flicker * 0.4); // 60%–100% of base opacity
    const size = p.size * (0.85 + flicker * 0.15);

    // Fade near top and bottom edges
    const edgeFade = Math.min(y / (h * 0.1), (h - y) / (h * 0.1), 1);

    return {
      x: ((x % w) + w) % w,
      y,
      size,
      opacity: opacity * Math.max(0, edgeFade),
    };
  });
}

export function drawRising(
  ctx: CanvasRenderingContext2D,
  particles: RisingFrame[],
  rgb: string,
  alpha: number,
): void {
  for (const p of particles) {
    const a = p.opacity * alpha;
    if (a <= 0.005) continue;

    // Soft glow halo
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    grad.addColorStop(0, `rgba(${rgb},${a * 0.7})`);
    grad.addColorStop(0.3, `rgba(${rgb},${a * 0.2})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    ctx.fillStyle = `rgba(${rgb},${Math.min(a * 1.5, 1)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
