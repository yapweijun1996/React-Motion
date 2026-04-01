/**
 * Lottie animated icon element.
 *
 * AI picks a preset name (checkmark, arrow-up, etc.) or provides custom animationData.
 * Uses lottie-web directly with frame sync via useCurrentFrame().
 * Replaces @remotion/lottie dependency.
 */

import { useEffect, useRef } from "react";
import lottie from "lottie-web";
import type { AnimationItem } from "lottie-web";
import { useCurrentFrame } from "../VideoContext";
import { useStagger, parseStagger } from "../useStagger";
import { getPreset, type LottieAnimationData } from "../lottiePresets";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; dark?: boolean };

export const LottieElement: React.FC<Props> = ({ el, index }) => {
  const preset = (el.preset as string) ?? "checkmark";
  const size = (el.size as number) ?? 120;
  const loop = (el.loop as boolean) ?? true;

  const frame = useCurrentFrame();
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  const { opacity } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "text", // hero-grade spring
  });

  // Resolve animation data: preset name or custom JSON
  const animationData: LottieAnimationData | null =
    (el.animationData as LottieAnimationData) ?? getPreset(preset);

  // Load lottie animation once
  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      autoplay: false,
      animationData,
      renderer: "svg",
    });

    return () => {
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [animationData]);

  // Sync frame with video playback
  useEffect(() => {
    if (!animRef.current) return;

    const totalFrames = animRef.current.totalFrames;
    const lottieFrame = loop
      ? frame % totalFrames
      : Math.min(frame, totalFrames - 1);

    animRef.current.goToAndStop(lottieFrame, true);
  }, [frame, loop]);

  if (!animationData) return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div ref={containerRef} style={{ width: size, height: size }} />
    </div>
  );
};
