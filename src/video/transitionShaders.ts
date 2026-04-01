/**
 * GLSL shaders for WebGL scene transitions.
 *
 * Each shader takes:
 * - texA: exiting scene texture
 * - texB: entering scene texture
 * - progress: 0→1 transition progress
 * - resolution: canvas pixel dimensions
 */

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y; // flip Y for DOM coordinate system
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Dissolve — noise-based random pixel reveal.
 * Each pixel has a threshold based on hash noise.
 * When progress exceeds the threshold, that pixel switches from A to B.
 * Soft edge blending for smooth look.
 */
const DISSOLVE_FRAGMENT = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_texA;
uniform sampler2D u_texB;
uniform float u_progress;

// Hash-based noise (deterministic, no texture needed)
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 colorA = texture2D(u_texA, v_uv);
  vec4 colorB = texture2D(u_texB, v_uv);
  float noise = hash(v_uv * 800.0);
  // Soft edge: smoothstep gives a gentle blend instead of hard cut
  float edge = 0.08;
  float t = smoothstep(u_progress - edge, u_progress + edge, noise);
  gl_FragColor = mix(colorB, colorA, t);
}
`;

/**
 * Pixelate — mosaic effect that peaks at midpoint then resolves.
 * Progress 0→0.5: scene A pixelates increasingly
 * Progress 0.5→1: scene B de-pixelates from mosaic to clear
 */
const PIXELATE_FRAGMENT = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_texA;
uniform sampler2D u_texB;
uniform float u_progress;
uniform vec2 u_resolution;

void main() {
  // Pixel size: 1 at edges, peaks at ~50px at midpoint
  float peak = 1.0 - abs(2.0 * u_progress - 1.0);
  float pixelSize = 1.0 + 50.0 * peak * peak;

  // Snap UV to pixel grid
  vec2 pixelUV = floor(v_uv * u_resolution / pixelSize) * pixelSize / u_resolution;

  vec4 colorA = texture2D(u_texA, pixelUV);
  vec4 colorB = texture2D(u_texB, pixelUV);

  // Crossfade at midpoint with soft transition
  float blend = smoothstep(0.4, 0.6, u_progress);
  gl_FragColor = mix(colorA, colorB, blend);
}
`;

export type WebGLTransitionType = "dissolve" | "pixelate";

export function getVertexShader(): string {
  return VERTEX_SHADER;
}

export function getFragmentShader(type: WebGLTransitionType): string {
  switch (type) {
    case "dissolve":
      return DISSOLVE_FRAGMENT;
    case "pixelate":
      return PIXELATE_FRAGMENT;
    default:
      return DISSOLVE_FRAGMENT;
  }
}
