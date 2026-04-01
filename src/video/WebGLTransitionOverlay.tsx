/**
 * WebGL transition overlay — captures two DOM scenes, blends via shader.
 *
 * Lifecycle:
 * 1. Mount → capture sceneA + sceneB DOM elements via toPng (async, ~100ms)
 * 2. Ready → create WebGL renderer, render shader each frame
 * 3. Unmount → dispose WebGL resources
 *
 * Fallback: transparent until textures ready → CSS transition shows through.
 * If WebGL fails or canvasEffects is OFF → stays transparent (pure CSS fallback).
 */

import { useRef, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { createWebGLTransition, type WebGLTransitionRenderer } from "./webglTransition";
import { useVideoConfig } from "./VideoContext";
import type { WebGLTransitionType } from "./transitionShaders";

/** Module-level screenshot cache — avoids redundant toPng for the same DOM element. */
const snapshotCache = new WeakMap<HTMLElement, string>();

type Props = {
  /** Ref to exiting scene DOM element */
  sceneAEl: HTMLElement | null;
  /** Ref to entering scene DOM element */
  sceneBEl: HTMLElement | null;
  /** Transition progress 0→1 */
  progress: number;
  /** Which WebGL effect */
  type: WebGLTransitionType;
};

export const WebGLTransitionOverlay: React.FC<Props> = ({
  sceneAEl,
  sceneBEl,
  progress,
  type,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLTransitionRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const { width, height } = useVideoConfig();

  // Capture both scenes on mount, create WebGL renderer (with unmount guard)
  useEffect(() => {
    let aborted = false;

    async function init() {
      if (!canvasRef.current || !sceneAEl || !sceneBEl) return;

      try {
        const captureOpts = {
          width, height, canvasWidth: width, canvasHeight: height, skipFonts: true,
          filter: (node: HTMLElement) => node.tagName !== "AUDIO" && node.tagName !== "VIDEO",
        };

        // Use cached snapshots when available, capture otherwise
        const [dataA, dataB] = await Promise.all([
          getCachedSnapshot(sceneAEl, captureOpts),
          getCachedSnapshot(sceneBEl, captureOpts),
        ]);

        if (aborted) return; // unmounted during capture — bail out

        const [imgA, imgB] = await Promise.all([
          loadImage(dataA),
          loadImage(dataB),
        ]);

        if (aborted) return; // unmounted during image load — bail out

        const renderer = createWebGLTransition(canvasRef.current, imgA, imgB, type);
        if (renderer) {
          if (aborted) {
            // Mounted → unmounted → async finished: dispose immediately
            renderer.dispose();
            return;
          }
          rendererRef.current = renderer;
          setReady(true);
        }
      } catch (err) {
        if (aborted) return;
        console.warn("[WebGL Transition] Capture failed, falling back to CSS:", err);
      }
    }

    init();

    return () => {
      aborted = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [sceneAEl, sceneBEl, width, height, type]);

  // Render shader each frame
  useEffect(() => {
    if (ready && rendererRef.current) {
      rendererRef.current.render(progress);
    }
  }, [progress, ready]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 10,
        pointerEvents: "none",
        // Transparent until ready → CSS transition shows through as fallback
        opacity: ready ? 1 : 0,
      }}
    />
  );
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Return cached toPng data URL if available, otherwise capture + cache. */
async function getCachedSnapshot(
  el: HTMLElement,
  opts: Parameters<typeof toPng>[1],
): Promise<string> {
  const cached = snapshotCache.get(el);
  if (cached) return cached;
  const dataUrl = await toPng(el, opts);
  snapshotCache.set(el, dataUrl);
  return dataUrl;
}
