import { AbsoluteFill } from "./AbsoluteFill";
import { useCurrentFrame, useVideoConfig } from "./VideoContext";
import { getCameraTransform, parseCameraType } from "./cameraMotion";
import { SpotlightWrapper } from "./SpotlightWrapper";
import { ELEMENT_REGISTRY, type ElementProps } from "./elementRegistry";
import { ParticleBg } from "./ParticleBg";
import { ErrorBoundary } from "./ErrorBoundary";
import { getLayoutTokens, type LayoutTokens } from "./sceneLayout";
import { getSceneColors, type SceneColors } from "./sceneColors";
import { loadSettings } from "../services/settingsStore";
import type { VideoScene, SceneElement } from "../types";

/**
 * Parse any CSS color string to [r, g, b] (0-255).
 * Handles: #hex (3/4/6/8 digit), rgb(), rgba().
 */
function parseColor(color: string): [number, number, number] | null {
  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const hexMatch = color.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let c = hexMatch[1];
    if (c.length === 3 || c.length === 4) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; // expand shorthand
    }
    return [
      parseInt(c.slice(0, 2), 16),
      parseInt(c.slice(2, 4), 16),
      parseInt(c.slice(4, 6), 16),
    ];
  }
  // rgb()/rgba()
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  return null;
}

/** Detect if a CSS color is dark (luminance < 0.4). */
export function isDarkBg(color: string | undefined): boolean {
  if (!color) return false;
  const rgb = parseColor(color.trim());
  if (!rgb) return false;
  const lum = 0.2126 * (rgb[0] / 255) + 0.7152 * (rgb[1] / 255) + 0.0722 * (rgb[2] / 255);
  return lum < 0.4;
}

/** Extract the first color from a CSS gradient string. */
function extractFirstColor(gradient: string): string | undefined {
  // Try hex first
  const hexMatch = gradient.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  // Try rgb()/rgba()
  const rgbMatch = gradient.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/);
  if (rgbMatch) return rgbMatch[0] + ")";
  return undefined;
}

/** Determine if scene background is dark — works with bgColor or bgGradient. */
function isSceneDark(scene: { bgColor?: string; bgGradient?: string }): boolean {
  let result = false;

  if (scene.bgGradient) {
    const extracted = extractFirstColor(scene.bgGradient);
    result = isDarkBg(extracted);
    // Gradient set but color extraction failed → try bgColor as fallback
    if (!extracted && scene.bgColor) result = isDarkBg(scene.bgColor);
  } else if (scene.bgColor) {
    result = isDarkBg(scene.bgColor);
  }
  // else: no bgColor, no bgGradient → default white (#fff) → dark=false

  // Only log on first render (avoid 60fps spam)
  const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  if (w && !w.__sceneDarkLogged) {
    w.__sceneDarkLogged = true;
    setTimeout(() => { if (w) w.__sceneDarkLogged = false; }, 2000);
    console.warn(`[Scene] dark=${result} | bg=${scene.bgColor ?? "NONE"} | grad=${scene.bgGradient?.slice(0, 80) ?? "NONE"}`);
  }
  return result;
}

// Camera motion is now in cameraMotion.ts — AI can set scene.camera

type GenericSceneProps = {
  scene: VideoScene;
  primaryColor?: string;
};

export const GenericScene: React.FC<GenericSceneProps> = ({
  scene,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const layout = scene.layout ?? "column";
  const dark = isSceneDark(scene);
  const colors = getSceneColors(dark);
  const canvasEffects = loadSettings().canvasEffects;
  const tokens = getLayoutTokens(scene.elements);

  // Camera motion — AI-controllable via scene.camera, defaults to "drift" (Ken Burns)
  const cameraType = parseCameraType((scene as Record<string, unknown>).camera);
  const normalT = Math.min(frame / Math.max(durationInFrames - 1, 1), 1);
  const cam = getCameraTransform(cameraType, normalT, scene.id);

  const rowGap = Math.round(40 * tokens.fontScale);
  const flexProps: React.CSSProperties =
    layout === "center"
      ? { justifyContent: "center", alignItems: "center" }
      : layout === "row"
        ? { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: rowGap }
        : { flexDirection: "column", justifyContent: "center", alignItems: "stretch" };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.bgGradient ? undefined : (scene.bgColor ?? "#ffffff"),
        background: scene.bgGradient ?? undefined,
      }}
    >
      <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`,
        transformOrigin: "center center",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: scene.padding ?? tokens.padding,
        fontFamily: "Arial, sans-serif",
        ...flexProps,
        gap: layout === "row" ? rowGap : tokens.gap,
        minHeight: 0,
      }}
    >
      {/* AI-generated background image layer */}
      {scene.imageUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${scene.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: scene.imageOpacity ?? 0.35,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}
      {canvasEffects && scene.bgEffect && (
        <ParticleBg
          color={primaryColor}
          bgColor={scene.bgColor}
          bgGradient={scene.bgGradient}
          effect={scene.bgEffect}
        />
      )}
      {scene.elements.map((el, i) => (
        <ErrorBoundary key={i} level="element" label={el.type}>
          <SpotlightWrapper
            elements={scene.elements}
            elementIndex={i}
            frame={frame}
            fps={fps}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <ElementRenderer
                el={el}
                index={i}
                primaryColor={primaryColor}
                dark={dark}
                tokens={tokens}
                colors={colors}
              />
            </div>
          </SpotlightWrapper>
        </ErrorBoundary>
      ))}
    </div>
    </AbsoluteFill>
  );
};

type ElementRendererProps = {
  el: SceneElement;
  index: number;
  primaryColor?: string;
  dark?: boolean;
  tokens: LayoutTokens;
  colors: SceneColors;
};

const chartWrapStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flex: 1,
  minHeight: 0,
  overflow: "visible",
};

const ElementRenderer: React.FC<ElementRendererProps> = ({
  el,
  index,
  primaryColor,
  dark,
  tokens,
  colors,
}) => {
  const entry = ELEMENT_REGISTRY[el.type];
  if (!entry) {
    console.warn(`[GenericScene] Unknown element type: "${el.type}"`);
    return null;
  }

  const Component = entry.component;
  const props: ElementProps = {
    el, index, primaryColor, dark, colors,
    fontScale: tokens.fontScale,
  };
  const inner = <Component {...props} />;

  if (entry.category === "chart") {
    return <div style={chartWrapStyle}>{inner}</div>;
  }
  if (entry.category === "decor") {
    const halfGap = Math.round(tokens.gap / 2);
    return (
      <div style={{ marginTop: -halfGap, marginBottom: -halfGap, alignSelf: "center" }}>
        {inner}
      </div>
    );
  }
  return inner;
};
