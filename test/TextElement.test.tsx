// @vitest-environment jsdom
/**
 * TextElement unit tests — covers typewriter animation + standard entrance.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock VideoContext ---
let mockFrame = 0;
const mockFps = 30;
const mockConfig = { width: 1920, height: 1080, fps: mockFps, durationInFrames: 300 };

vi.mock("../src/video/VideoContext", () => ({
  useCurrentFrame: () => mockFrame,
  useVideoConfig: () => mockConfig,
}));

// --- Import after mocks ---
import { render } from "@testing-library/react";
import { TextElement } from "../src/video/elements/TextElement";
import type { SceneElement } from "../src/types";

function makeEl(overrides: Partial<SceneElement> = {}): SceneElement {
  return {
    type: "text",
    content: "Hello World",
    fontSize: 80,
    animation: "fade",
    ...overrides,
  } as SceneElement;
}

describe("TextElement", () => {
  beforeEach(() => {
    mockFrame = 0;
  });

  describe("standard entrance", () => {
    it("renders content with fade animation", () => {
      mockFrame = 60; // well past any delay
      const { container } = render(<TextElement el={makeEl()} index={0} />);
      expect(container.textContent).toContain("Hello World");
    });

    it("applies fontSize and fontWeight", () => {
      mockFrame = 60;
      const el = makeEl({ fontSize: 96, fontWeight: 700 });
      const { container } = render(<TextElement el={el} index={0} />);
      const div = container.firstElementChild as HTMLElement;
      expect(div.style.fontSize).toBe("96px");
      expect(div.style.fontWeight).toBe("700");
    });

    it("uses dark text on light bg, light text on dark bg", () => {
      mockFrame = 60;
      const { container: lightBg } = render(
        <TextElement el={makeEl({ color: undefined })} index={0} dark={false} />,
      );
      // jsdom normalizes hex to rgb() — readableColor returns #1C1917 (stone-950) for light bg
      expect((lightBg.firstElementChild as HTMLElement).style.color).toBe("rgb(28, 25, 23)");

      const { container: darkBg } = render(
        <TextElement el={makeEl({ color: undefined })} index={0} dark={true} />,
      );
      // readableColor returns #F5F5F4 (stone-100) for dark bg
      expect((darkBg.firstElementChild as HTMLElement).style.color).toBe("rgb(245, 245, 244)");
    });
  });

  describe("typewriter animation", () => {
    it("renders per-character spans for short text", () => {
      mockFrame = 60;
      const el = makeEl({ animation: "typewriter", content: "Hi!" });
      const { container } = render(<TextElement el={el} index={0} />);
      // "Hi!" = 3 chars → 3 content spans + 1 cursor span
      const spans = container.querySelectorAll("span");
      expect(spans.length).toBe(4); // 3 chars + cursor
    });

    it("renders per-word spans for long text", () => {
      mockFrame = 60;
      const longText = "This is a longer sentence that exceeds forty characters easily";
      const el = makeEl({ animation: "typewriter", content: longText });
      const { container } = render(<TextElement el={el} index={0} />);
      // Per-word mode: split on whitespace, includes space tokens
      const spans = container.querySelectorAll("span");
      // At least more spans than char count (word tokens + spaces + cursor)
      expect(spans.length).toBeGreaterThan(5);
      expect(spans.length).toBeLessThan(longText.length + 2); // fewer than per-char would give
    });

    it("hides characters before their reveal frame", () => {
      mockFrame = 0; // no stagger delay elapsed
      const el = makeEl({ animation: "typewriter", content: "ABCDE", delay: 0 });
      const { container } = render(<TextElement el={el} index={0} />);
      const spans = container.querySelectorAll("span");
      // First 5 spans are chars, all should be opacity 0 at frame 0
      for (let i = 0; i < 5; i++) {
        expect((spans[i] as HTMLElement).style.opacity).toBe("0");
      }
    });

    it("reveals characters progressively", () => {
      // delay for index 0 = 0*8+6 = 6 frames
      // At frame 10, elapsed = 4, speed = 2 chars/frame → 8 chars visible
      mockFrame = 10;
      const el = makeEl({ animation: "typewriter", content: "ABCDEFGHIJ" }); // 10 chars
      const { container } = render(<TextElement el={el} index={0} />);
      const spans = container.querySelectorAll("span");

      // First 8 should be visible, last 2 hidden
      let visibleCount = 0;
      for (let i = 0; i < 10; i++) {
        if ((spans[i] as HTMLElement).style.opacity === "1") visibleCount++;
      }
      expect(visibleCount).toBeGreaterThan(0);
      expect(visibleCount).toBeLessThan(10);
    });

    it("shows all characters after enough frames", () => {
      mockFrame = 120; // way past typing completion
      const el = makeEl({ animation: "typewriter", content: "Done!" });
      const { container } = render(<TextElement el={el} index={0} />);
      const spans = container.querySelectorAll("span");
      // All 5 char spans should be opacity 1
      for (let i = 0; i < 5; i++) {
        expect((spans[i] as HTMLElement).style.opacity).toBe("1");
      }
    });

    it("has a cursor element", () => {
      mockFrame = 8; // mid-typing
      const el = makeEl({ animation: "typewriter", content: "Test" });
      const { container } = render(<TextElement el={el} index={0} />);
      // Last span should be the cursor "|"
      const spans = container.querySelectorAll("span");
      const cursor = spans[spans.length - 1];
      expect(cursor.textContent).toBe("|");
    });

    it("hides cursor after typing completes", () => {
      mockFrame = 200; // well past completion
      const el = makeEl({ animation: "typewriter", content: "Hi" });
      const { container } = render(<TextElement el={el} index={0} />);
      const spans = container.querySelectorAll("span");
      const cursor = spans[spans.length - 1] as HTMLElement;
      // After completion, cursor should be hidden (opacity 0)
      expect(cursor.style.opacity).toBe("0");
    });
  });

  describe("glow and shadow", () => {
    it("applies glow textShadow on dark bg", () => {
      mockFrame = 60;
      const el = makeEl({ glow: true, color: "#60a5fa" });
      const { container } = render(<TextElement el={el} index={0} dark={true} />);
      const div = container.firstElementChild as HTMLElement;
      expect(div.style.textShadow).toContain("0 0 24px");
      expect(div.style.textShadow).toContain("0 0 48px");
    });

    it("applies shadow textShadow", () => {
      mockFrame = 60;
      const el = makeEl({ shadow: true });
      const { container } = render(<TextElement el={el} index={0} />);
      const div = container.firstElementChild as HTMLElement;
      expect(div.style.textShadow).toContain("2px 4px 8px");
    });

    it("combines glow + shadow", () => {
      mockFrame = 60;
      const el = makeEl({ glow: true, shadow: true });
      const { container } = render(<TextElement el={el} index={0} dark={true} />);
      const div = container.firstElementChild as HTMLElement;
      expect(div.style.textShadow).toContain("0 0 24px");
      expect(div.style.textShadow).toContain("2px 4px 8px");
    });

    it("no textShadow when neither glow nor shadow set", () => {
      mockFrame = 60;
      const { container } = render(<TextElement el={makeEl()} index={0} />);
      const div = container.firstElementChild as HTMLElement;
      expect(div.style.textShadow).toBe("");
    });

    it("glow works with typewriter animation", () => {
      mockFrame = 60;
      const el = makeEl({ animation: "typewriter", content: "Hi!", glow: true, color: "#60a5fa" });
      const { container } = render(<TextElement el={el} index={0} dark={true} />);
      const div = container.firstElementChild as HTMLElement;
      expect(div.style.textShadow).toContain("0 0 24px");
    });
  });
});
