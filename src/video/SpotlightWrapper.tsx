/**
 * SpotlightWrapper — cinematic focus effect for scene elements.
 *
 * When an element has spotlight:{at, duration}, it scales up slightly while
 * all other elements in the scene dim + blur. Spring physics ensure smooth
 * fade in/out transitions.
 *
 * Usage: wrap each element in GenericScene's render loop.
 */

import { spring, interpolate } from "./animation";
import type { SceneElement } from "../types";

// ---------------------------------------------------------------------------
// Spotlight config parsing
// ---------------------------------------------------------------------------

type SpotlightConfig = { at: number; duration: number };

/** Parse spotlight prop from element: { at: frame, duration: frames } */
function parseSpotlight(el: SceneElement): SpotlightConfig | null {
  const raw = el.spotlight as { at?: number; duration?: number } | undefined;
  if (!raw || typeof raw !== "object") return null;
  const at = typeof raw.at === "number" ? raw.at : 0;
  const duration = typeof raw.duration === "number" ? raw.duration : 45;
  return { at, duration };
}

/** Find the index of the element that is currently spotlit (or -1) */
function getSpotlitIndex(elements: readonly SceneElement[], frame: number): number {
  for (let i = 0; i < elements.length; i++) {
    const cfg = parseSpotlight(elements[i]);
    if (cfg && frame >= cfg.at && frame < cfg.at + cfg.duration) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPOT_DIM_OPACITY = 0.15;
const SPOT_DIM_BLUR = 4; // px
const SPOT_SCALE = 1.04;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type SpotlightWrapperProps = {
  elements: readonly SceneElement[];
  elementIndex: number;
  frame: number;
  fps: number;
  children: React.ReactNode;
};

export const SpotlightWrapper: React.FC<SpotlightWrapperProps> = ({
  elements,
  elementIndex,
  frame,
  fps,
  children,
}) => {
  const spotlitIdx = getSpotlitIndex(elements, frame);

  // No spotlight active — render children as-is (zero overhead)
  if (spotlitIdx === -1) return <>{children}</>;

  const isSpotlit = elementIndex === spotlitIdx;

  // Compute smooth transition progress toward spotlight state
  const cfg = parseSpotlight(elements[spotlitIdx])!;
  const fadeInProgress = spring({
    frame: frame - cfg.at,
    fps,
    config: { damping: 16, mass: 0.6 },
  });
  const fadeOutProgress = spring({
    frame: frame - (cfg.at + cfg.duration),
    fps,
    config: { damping: 14, mass: 0.5 },
  });

  // After spotlight ends, everything returns to normal
  const isEnding = frame >= cfg.at + cfg.duration;
  const activeStrength = isEnding
    ? interpolate(fadeOutProgress, [0, 1], [1, 0])
    : fadeInProgress;

  if (isSpotlit) {
    // Spotlit element: slight scale-up
    const scale = interpolate(activeStrength, [0, 1], [1, SPOT_SCALE]);
    return (
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        position: "relative",
        zIndex: 10,
        transition: "none",
      }}>
        {children}
      </div>
    );
  }

  // Non-spotlit: dim + blur
  const opacity = interpolate(activeStrength, [0, 1], [1, SPOT_DIM_OPACITY]);
  const blur = interpolate(activeStrength, [0, 1], [0, SPOT_DIM_BLUR]);

  return (
    <div style={{
      opacity,
      filter: blur > 0.1 ? `blur(${blur}px)` : "none",
      transition: "none",
    }}>
      {children}
    </div>
  );
};
