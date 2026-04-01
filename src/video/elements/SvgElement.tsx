/**
 * SVG element — renders AI-generated inline SVG markup.
 *
 * Supports two animation modes:
 * - Standard entrance (fade/slide-up/zoom/etc.) — container-level opacity+transform
 * - "draw" — Apple-style path drawing via DrawingSvg component
 *
 * Security: sanitization delegated to shared svgSanitize module.
 */

import { useMemo } from "react";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { DrawingSvg } from "./DrawingSvg";
import { sanitizeSvg } from "./svgSanitize";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; dark?: boolean };

export const SvgElement: React.FC<Props> = ({ el, index }) => {
  const markup = (el.markup as string) ?? "";
  const animation = parseAnimation(el);
  const isDraw = animation === "draw";

  const { progress, delay } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "svg",
  });

  const entrance = computeEntranceStyle(progress, animation);
  const sanitizedHtml = useMemo(() => sanitizeSvg(markup, isDraw), [markup, isDraw]);

  if (!sanitizedHtml) return null;

  if (isDraw) {
    return (
      <DrawingSvg
        html={sanitizedHtml}
        delay={delay}
        drawSpeed={el.drawSpeed as number | undefined}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        minHeight: 0,
        opacity: entrance.opacity,
        transform: entrance.transform,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
