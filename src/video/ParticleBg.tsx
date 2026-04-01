/**
 * Canvas 2D particle background layer.
 *
 * Renders behind DOM content when "Canvas Effects" setting is ON.
 * Deterministic: driven by useCurrentFrame(), no Math.random().
 * Lightweight: ~50 particles, simple lines, minimal GPU load.
 *
 * html-to-image captures <canvas> via canvas.toDataURL() internally,
 * so this works with the existing export pipeline unchanged.
 */

import { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "./VideoContext";

const PARTICLE_COUNT = 50;
const CONNECTION_DIST = 220;
const PARTICLE_RADIUS = 4;
const BASE_SPEED = 0.5;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // 0.6–1.4 multiplier for varied sizes
};

/** Seed-based deterministic particle init (no Math.random). */
function initParticles(width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const phi = (i * 0.618033988749895) % 1;
    const theta = i / PARTICLE_COUNT;
    particles.push({
      x: phi * width,
      y: theta * height,
      vx: Math.cos(i * 2.399) * BASE_SPEED,
      vy: Math.sin(i * 2.399) * BASE_SPEED,
      size: 0.6 + ((i * 7) % 10) / 12.5, // 0.6–1.4
    });
  }
  return particles;
}

/** Advance particles to exact frame position (deterministic). */
function getParticlesAtFrame(
  base: Particle[],
  frame: number,
  width: number,
  height: number,
): { x: number; y: number; size: number }[] {
  return base.map((p) => {
    let x = (p.x + p.vx * frame) % width;
    let y = (p.y + p.vy * frame) % height;
    if (x < 0) x += width;
    if (y < 0) y += height;
    return { x, y, size: p.size };
  });
}

/**
 * Ensure particle color contrasts with background.
 * On dark backgrounds, force light particles; on light, force muted particles.
 */
function resolveColor(color: string | undefined, bgColor: string | undefined): string {
  // If no bgColor or it's light, use the provided color or default blue
  if (!bgColor) return color ?? "#60a5fa";

  const c = bgColor.replace("#", "");
  if (c.length < 6) return color ?? "#60a5fa";
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Dark background → use bright particle color
  if (lum < 0.4) return "#93c5fd"; // light blue, high contrast on dark
  // Light background → use muted color
  return color ?? "#3b82f6";
}

type Props = {
  color?: string;
  bgColor?: string;
  opacity?: number;
};

export const ParticleBg: React.FC<Props> = ({
  color,
  bgColor,
  opacity = 0.7,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const baseRef = useRef<Particle[]>(initParticles(width, height));

  const resolvedColor = resolveColor(color, bgColor);

  // Fade-in over first 0.8s
  const fadeIn = Math.min(1, frame / (fps * 0.8));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const positions = getParticlesAtFrame(baseRef.current, frame, width, height);
    const alpha = opacity * fadeIn;

    // Draw connections
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const lineAlpha = alpha * (1 - dist / CONNECTION_DIST) * 0.6;
          ctx.globalAlpha = lineAlpha;
          ctx.beginPath();
          ctx.moveTo(positions[i].x, positions[i].y);
          ctx.lineTo(positions[j].x, positions[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw particles with glow
    for (const p of positions) {
      const r = PARTICLE_RADIUS * p.size;

      // Outer glow
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = resolvedColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.globalAlpha = alpha;
      ctx.fillStyle = resolvedColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [frame, width, height, resolvedColor, opacity, fadeIn]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
};
