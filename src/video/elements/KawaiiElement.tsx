/**
 * Kawaii character element — cute SVG mascots that guide the presentation.
 *
 * AI picks: character type, mood, color, optional caption.
 * Harness renders with spring bounce-in animation.
 */

import { type FunctionComponent } from "react";
import { interpolate } from "../animation";
import {
  Astronaut, Backpack, Browser, Cat, Chocolate, CreditCard, Cyborg,
  File, Folder, Ghost, HumanCat, HumanDinosaur, IceCream, Mug, Planet,
  SpeechBubble, type KawaiiProps,
} from "react-kawaii";
import { useStagger, parseStagger } from "../useStagger";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  COLOR_KAWAII, KAWAII_DEFAULT_CHAR, KAWAII_DEFAULT_MOOD,
  KAWAII_SIZE, KAWAII_CAPTION_SIZE, KAWAII_CAPTION_MAX_W, KAWAII_GAP,
} from "../elementDefaults";

// Character registry
const CHARACTERS: Record<string, FunctionComponent<KawaiiProps>> = {
  astronaut: Astronaut,
  backpack: Backpack,
  browser: Browser,
  cat: Cat,
  chocolate: Chocolate,
  "credit-card": CreditCard,
  cyborg: Cyborg,
  file: File,
  folder: Folder,
  ghost: Ghost,
  "human-cat": HumanCat,
  "human-dinosaur": HumanDinosaur,
  "ice-cream": IceCream,
  mug: Mug,
  planet: Planet,
  "speech-bubble": SpeechBubble,
};

type Props = { el: SceneElement; index: number; primaryColor?: string; dark?: boolean; colors?: SceneColors };

export const KawaiiElement: React.FC<Props> = ({ el, index, primaryColor, dark, colors }) => {
  const c = resolveColors(colors, dark);
  const character = (el.character as string) ?? KAWAII_DEFAULT_CHAR;
  const mood = (el.mood as KawaiiProps["mood"]) ?? KAWAII_DEFAULT_MOOD;
  const size = (el.size as number) ?? KAWAII_SIZE;
  const color = (el.color as string) ?? primaryColor ?? COLOR_KAWAII;
  const caption = el.caption as string | undefined;
  const captionColor = (el.captionColor as string) ?? c.text;

  const { progress, opacity } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "text", // hero-grade spring for character entrance
  });

  // Bounce-in: overshoot scale then settle
  const bounceScale = interpolate(progress, [0, 0.6, 1], [0.3, 1.1, 1]);
  // Gentle float after entrance
  const rotate = interpolate(progress, [0, 0.5, 1], [-8, 3, 0]);

  const CharComponent = CHARACTERS[character] ?? Ghost;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: KAWAII_GAP,
        opacity,
        transform: `scale(${bounceScale}) rotate(${rotate}deg)`,
        transformOrigin: "center bottom",
      }}
    >
      <CharComponent size={size} mood={mood} color={color} />
      {caption && (
        <div
          style={{
            fontSize: (el.captionSize as number) ?? KAWAII_CAPTION_SIZE,
            color: captionColor,
            fontWeight: 600,
            textAlign: "center",
            maxWidth: KAWAII_CAPTION_MAX_W,
            lineHeight: 1.4,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
};
