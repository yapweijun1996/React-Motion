import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";

type Props = { el: SceneElement; index: number; dark?: boolean };

/** Characters revealed per frame at 30 fps (~60 chars/sec). */
const CHARS_PER_FRAME = 2;
/** Cursor blink cycle in frames (on for half, off for half). */
const CURSOR_BLINK_FRAMES = 15;

export const TextElement: React.FC<Props> = ({ el, index, dark }) => {
  const animation = parseAnimation(el);

  const { progress, delay } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "text",
  });

  const content = (el.content as string) ?? "";
  const isTypewriter = animation === "typewriter" && content.length > 0;

  // --- Typewriter mode ---
  if (isTypewriter) {
    return (
      <TypewriterText
        content={content}
        delay={delay}
        fontSize={(el.fontSize as number) ?? 80}
        color={(el.color as string) ?? (dark ? "#f1f5f9" : "#1e293b")}
        fontWeight={(el.fontWeight as number) ?? 400}
        align={(el.align as "left" | "center" | "right") ?? "left"}
        letterSpacing={(el.letterSpacing as number) ?? 0}
        textTransform={(el.textTransform as string) as React.CSSProperties["textTransform"]}
      />
    );
  }

  // --- Standard entrance mode ---
  const { opacity, transform } = computeEntranceStyle(progress, animation);

  return (
    <div
      style={{
        fontSize: (el.fontSize as number) ?? 80,
        color: (el.color as string) ?? (dark ? "#f1f5f9" : "#1e293b"),
        fontWeight: (el.fontWeight as number) ?? 400,
        textAlign: (el.align as "left" | "center" | "right") ?? "left",
        letterSpacing: (el.letterSpacing as number) ?? 0,
        textTransform: (el.textTransform as string) as React.CSSProperties["textTransform"],
        lineHeight: 1.3,
        opacity,
        transform,
      }}
    >
      {content}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Typewriter sub-component
// ---------------------------------------------------------------------------

type TypewriterProps = {
  content: string;
  delay: number;
  fontSize: number;
  color: string;
  fontWeight: number;
  align: "left" | "center" | "right";
  letterSpacing: number;
  textTransform: React.CSSProperties["textTransform"];
};

/**
 * Tokenize text for typewriter reveal.
 * - ≤40 chars → per-character (titles, short phrases)
 * - >40 chars → per-word (body text, sentences)
 */
function tokenize(text: string): string[] {
  if (text.length <= 40) {
    // Per-character: each char is a token
    return text.split("");
  }
  // Per-word: split on spaces, keep the space as part of the preceding token
  const words = text.split(/(\s+)/);
  return words.filter((w) => w.length > 0);
}

const TypewriterText: React.FC<TypewriterProps> = ({
  content,
  delay,
  fontSize,
  color,
  fontWeight,
  align,
  letterSpacing,
  textTransform,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tokens = tokenize(content);
  const totalTokens = tokens.length;

  // Scale speed by fps (CHARS_PER_FRAME is tuned for 30fps)
  const speed = CHARS_PER_FRAME * (fps / 30);
  const elapsed = Math.max(0, frame - delay);
  const visibleCount = Math.min(totalTokens, Math.floor(elapsed * speed));

  // Typing finished?
  const done = visibleCount >= totalTokens;

  // Cursor blink: visible half the cycle, hidden the other half
  const cursorVisible = !done && elapsed % CURSOR_BLINK_FRAMES < CURSOR_BLINK_FRAMES / 2;

  return (
    <div
      style={{
        fontSize,
        color,
        fontWeight,
        textAlign: align,
        letterSpacing,
        textTransform,
        lineHeight: 1.3,
        whiteSpace: "pre-wrap",
      }}
    >
      {tokens.map((token, i) => (
        <span
          key={i}
          style={{
            opacity: i < visibleCount ? 1 : 0,
            transition: "none",
          }}
        >
          {token}
        </span>
      ))}
      {/* Blinking cursor */}
      <span
        style={{
          opacity: cursorVisible ? 1 : 0,
          color,
          fontWeight: 300,
          marginLeft: 1,
        }}
      >
        |
      </span>
    </div>
  );
};
