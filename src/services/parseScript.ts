import type { VideoScript, VideoScene, SceneElement } from "../types";

const VALID_ELEMENT_TYPES = ["text", "metric", "bar-chart", "list", "divider", "callout"];

export function parseVideoScript(raw: string): VideoScript {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  const obj = json as Record<string, unknown>;

  if (!obj.scenes || !Array.isArray(obj.scenes)) {
    throw new Error("AI response missing 'scenes' array");
  }

  if (!obj.title || typeof obj.title !== "string") {
    throw new Error("AI response missing 'title'");
  }

  const scenes: VideoScene[] = (obj.scenes as Record<string, unknown>[]).map(
    (s, i) => {
      if (!s.elements || !Array.isArray(s.elements)) {
        throw new Error(`Scene ${i}: missing 'elements' array`);
      }

      const elements: SceneElement[] = (s.elements as Record<string, unknown>[]).map(
        (el, j) => {
          const type = el.type as string;
          if (!VALID_ELEMENT_TYPES.includes(type)) {
            throw new Error(`Scene ${i}, element ${j}: invalid type "${type}"`);
          }
          return el as SceneElement;
        },
      );

      return {
        id: (s.id as string) ?? `scene-${i}`,
        startFrame: Number(s.startFrame) || 0,
        durationInFrames: Number(s.durationInFrames) || 150,
        bgColor: s.bgColor as string | undefined,
        layout: s.layout as "column" | "center" | "row" | undefined,
        padding: s.padding as string | undefined,
        elements,
        narration: s.narration as string | undefined,
      };
    },
  );

  return {
    id: (obj.id as string) ?? "ai-script",
    title: obj.title as string,
    fps: Number(obj.fps) || 30,
    width: Number(obj.width) || 1280,
    height: Number(obj.height) || 720,
    durationInFrames: Number(obj.durationInFrames) || 300,
    scenes,
    narrative: (obj.narrative as string) ?? "",
    theme: obj.theme
      ? {
          primaryColor: (obj.theme as Record<string, unknown>).primaryColor as string,
          secondaryColor: (obj.theme as Record<string, unknown>).secondaryColor as string | undefined,
          fontFamily: (obj.theme as Record<string, unknown>).fontFamily as string | undefined,
          style: (obj.theme as Record<string, unknown>).style as "corporate" | "modern" | "minimal" | undefined,
        }
      : undefined,
  };
}
