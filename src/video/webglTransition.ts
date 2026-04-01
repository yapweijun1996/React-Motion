/**
 * Pure WebGL transition renderer — no React dependency.
 *
 * Usage:
 *   const renderer = createWebGLTransition(canvas, imageA, imageB, "dissolve");
 *   renderer.render(0.5); // progress 0→1
 *   renderer.dispose();
 *
 * Falls back gracefully: returns null if WebGL is unavailable.
 */

import { getVertexShader, getFragmentShader, type WebGLTransitionType } from "./transitionShaders";

export type WebGLTransitionRenderer = {
  render: (progress: number) => void;
  dispose: () => void;
};

export function createWebGLTransition(
  canvas: HTMLCanvasElement,
  imageA: HTMLImageElement,
  imageB: HTMLImageElement,
  type: WebGLTransitionType,
): WebGLTransitionRenderer | null {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.warn("[WebGL] WebGL not available, falling back to CSS");
    return null;
  }

  // --- Compile shaders ---
  const vertSrc = getVertexShader();
  const fragSrc = getFragmentShader(type);

  const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vertShader || !fragShader) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[WebGL] Program link failed:", gl.getProgramInfoLog(program));
    return null;
  }

  gl.useProgram(program);

  // --- Full-screen quad ---
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const posBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // --- Upload textures ---
  const texA = createTexture(gl, imageA, 0);
  const texB = createTexture(gl, imageB, 1);

  gl.uniform1i(gl.getUniformLocation(program, "u_texA"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "u_texB"), 1);

  const uProgress = gl.getUniformLocation(program, "u_progress");
  const uResolution = gl.getUniformLocation(program, "u_resolution");

  if (uResolution) {
    gl.uniform2f(uResolution, canvas.width, canvas.height);
  }

  return {
    render(progress: number) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uProgress, Math.max(0, Math.min(1, progress)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },

    dispose() {
      gl.deleteTexture(texA);
      gl.deleteTexture(texB);
      gl.deleteBuffer(posBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
    },
  };
}

// --- Helpers ---

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[WebGL] Shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createTexture(
  gl: WebGLRenderingContext,
  image: HTMLImageElement,
  unit: number,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return tex;
}
