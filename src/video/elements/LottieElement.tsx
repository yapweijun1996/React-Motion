/**
 * Lottie animated icon element.
 *
 * AI picks a preset name (checkmark, arrow-up, etc.) or provides custom animationData.
 * Remotion's @remotion/lottie syncs the Lottie animation to video frames.
 */

import { Lottie } from "@remotion/lottie";
import { useStagger, parseStagger } from "../useStagger";
import { getPreset } from "../lottiePresets";
import type { SceneElement } from "../../types";
import type { LottieAnimationData } from "@remotion/lottie";

type Props = { el: SceneElement; index: number };

export const LottieElement: React.FC<Props> = ({ el, index }) => {
  const preset = (el.preset as string) ?? "checkmark";
  const size = (el.size as number) ?? 120;
  const loop = (el.loop as boolean) ?? true;

  const { opacity } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "text", // hero-grade spring
  });

  // Resolve animation data: preset name or custom JSON
  const animationData: LottieAnimationData | null =
    (el.animationData as LottieAnimationData) ?? getPreset(preset);

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
      <Lottie
        animationData={animationData}
        style={{ width: size, height: size }}
        loop={loop}
        playbackRate={1}
      />
    </div>
  );
};
