/**
 * Custom animation utilities — drop-in replacements for Remotion's
 * spring(), interpolate(), and @remotion/noise noise2D/noise3D.
 *
 * API is intentionally identical to Remotion so existing element code
 * only needs an import-path change.
 */

// ---------------------------------------------------------------------------
// spring()
// ---------------------------------------------------------------------------

type SpringConfig = {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
};

type SpringOptions = {
  frame: number;
  fps: number;
  config?: SpringConfig;
  durationInFrames?: number;
  durationRestThreshold?: number;
  from?: number;
  to?: number;
};

/**
 * Physics-based spring animation. Returns a value that settles from
 * `from` (default 0) to `to` (default 1).
 *
 * Uses the exact damped harmonic oscillator equation so the feel
 * matches Remotion's spring().
 */
export function spring(options: SpringOptions): number {
  const {
    frame,
    fps,
    config = {},
    from = 0,
    to = 1,
  } = options;

  const {
    damping = 10,
    mass = 1,
    stiffness = 100,
    overshootClamping = false,
  } = config;

  // Before animation starts, return initial value
  if (frame <= 0) return from;

  const t = frame / fps; // seconds

  // Damped harmonic oscillator
  const omega0 = Math.sqrt(stiffness / mass); // natural frequency
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // damping ratio

  let displacement: number;

  if (zeta < 1) {
    // Under-damped (most common — oscillates)
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    displacement = Math.exp(-zeta * omega0 * t) * Math.cos(omegaD * t);
  } else if (zeta === 1) {
    // Critically damped
    displacement = (1 + omega0 * t) * Math.exp(-omega0 * t);
  } else {
    // Over-damped
    const s1 = -omega0 * (zeta + Math.sqrt(zeta * zeta - 1));
    const s2 = -omega0 * (zeta - Math.sqrt(zeta * zeta - 1));
    displacement = 0.5 * (Math.exp(s1 * t) + Math.exp(s2 * t));
  }

  let value = from + (to - from) * (1 - displacement);

  if (overshootClamping) {
    value = from < to
      ? Math.min(Math.max(value, from), to)
      : Math.min(Math.max(value, to), from);
  }

  return value;
}

// ---------------------------------------------------------------------------
// interpolate()
// ---------------------------------------------------------------------------

type ExtrapolateType = "clamp" | "extend" | "identity";

type InterpolateOptions = {
  extrapolateLeft?: ExtrapolateType;
  extrapolateRight?: ExtrapolateType;
  easing?: (t: number) => number;
};

/**
 * Maps a value from an input range to an output range.
 * Supports multi-keyframe ranges (e.g. [0, 0.55, 0.8, 1]).
 *
 * Default: clamps at both ends (same as Remotion).
 */
export function interpolate(
  value: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: InterpolateOptions,
): number {
  if (inputRange.length !== outputRange.length) {
    throw new Error("interpolate: inputRange and outputRange must have the same length");
  }
  if (inputRange.length < 2) {
    throw new Error("interpolate: ranges must have at least 2 values");
  }

  const extrapolateLeft = options?.extrapolateLeft ?? "clamp";
  const extrapolateRight = options?.extrapolateRight ?? "clamp";

  // Find the segment this value falls in
  let segIdx = 0;
  for (let i = 1; i < inputRange.length - 1; i++) {
    if (value >= inputRange[i]) segIdx = i;
  }

  const inMin = inputRange[segIdx];
  const inMax = inputRange[segIdx + 1];
  const outMin = outputRange[segIdx];
  const outMax = outputRange[segIdx + 1];

  // Normalized position within this segment
  let t = inMax === inMin ? 1 : (value - inMin) / (inMax - inMin);

  // Apply easing if provided
  if (options?.easing) {
    t = options.easing(Math.max(0, Math.min(1, t)));
  }

  // Extrapolation at left edge
  if (value < inputRange[0]) {
    if (extrapolateLeft === "clamp") return outputRange[0];
    if (extrapolateLeft === "identity") return value;
    // "extend" — fall through to linear extrapolation
  }

  // Extrapolation at right edge
  if (value > inputRange[inputRange.length - 1]) {
    if (extrapolateRight === "clamp") return outputRange[outputRange.length - 1];
    if (extrapolateRight === "identity") return value;
    // "extend" — fall through to linear extrapolation
  }

  return outMin + (outMax - outMin) * t;
}

// ---------------------------------------------------------------------------
// noise2D / noise3D — simple gradient noise
// ---------------------------------------------------------------------------

// Permutation table (seeded by string hash)
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return h;
}

function buildPerm(seed: string): Uint8Array {
  const h = hashSeed(seed);
  const perm = new Uint8Array(512);
  // Fisher-Yates with deterministic seed
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  let s = Math.abs(h);
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 256; i++) {
    perm[i] = base[i];
    perm[i + 256] = base[i];
  }
  return perm;
}

// 2D gradient vectors
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function dot2(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

// Cache permutation tables per seed
const permCache = new Map<string, Uint8Array>();

function getPerm(seed: string): Uint8Array {
  let p = permCache.get(seed);
  if (!p) {
    p = buildPerm(seed);
    permCache.set(seed, p);
  }
  return p;
}

/**
 * 2D Perlin noise. Returns value in [-1, 1].
 * API matches @remotion/noise noise2D(seed, x, y).
 */
export function noise2D(seed: string, x: number, y: number): number {
  const perm = getPerm(seed);

  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = perm[perm[X] + Y] % 8;
  const ab = perm[perm[X] + Y + 1] % 8;
  const ba = perm[perm[X + 1] + Y] % 8;
  const bb = perm[perm[X + 1] + Y + 1] % 8;

  return lerp(
    lerp(dot2(GRAD2[aa], xf, yf), dot2(GRAD2[ba], xf - 1, yf), u),
    lerp(dot2(GRAD2[ab], xf, yf - 1), dot2(GRAD2[bb], xf - 1, yf - 1), u),
    v,
  );
}

/**
 * 3D Perlin noise. Returns value in [-1, 1].
 * API matches @remotion/noise noise3D(seed, x, y, z).
 */
const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];

function dot3(g: number[], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z;
}

export function noise3D(seed: string, x: number, y: number, z: number): number {
  const perm = getPerm(seed);

  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);

  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const aaa = perm[perm[perm[X] + Y] + Z] % 12;
  const aab = perm[perm[perm[X] + Y] + Z + 1] % 12;
  const aba = perm[perm[perm[X] + Y + 1] + Z] % 12;
  const abb = perm[perm[perm[X] + Y + 1] + Z + 1] % 12;
  const baa = perm[perm[perm[X + 1] + Y] + Z] % 12;
  const bab = perm[perm[perm[X + 1] + Y] + Z + 1] % 12;
  const bba = perm[perm[perm[X + 1] + Y + 1] + Z] % 12;
  const bbb = perm[perm[perm[X + 1] + Y + 1] + Z + 1] % 12;

  return lerp(
    lerp(
      lerp(dot3(GRAD3[aaa], xf, yf, zf), dot3(GRAD3[baa], xf-1, yf, zf), u),
      lerp(dot3(GRAD3[aba], xf, yf-1, zf), dot3(GRAD3[bba], xf-1, yf-1, zf), u),
      v,
    ),
    lerp(
      lerp(dot3(GRAD3[aab], xf, yf, zf-1), dot3(GRAD3[bab], xf-1, yf, zf-1), u),
      lerp(dot3(GRAD3[abb], xf, yf-1, zf-1), dot3(GRAD3[bbb], xf-1, yf-1, zf-1), u),
      v,
    ),
    w,
  );
}
