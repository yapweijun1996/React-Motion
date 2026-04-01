import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring } from "../animation";
import { pie, arc } from "d3-shape";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatPercent, extractValue, extractLabel } from "../../services/chartHelpers";
import { usePaletteColors } from "../PaletteContext";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  PIE_SIZE, PIE_MAX_LEGEND, PIE_DONUT_RATIO, PIE_PADDING,
  PIE_HL_BONUS, PIE_STROKE_COLOR, PIE_STROKE_W, PIE_CORNER_R,
  PIE_BASE_OPACITY, PIE_SWATCH, PIE_SWATCH_R, PIE_LEGEND_GAP, PIE_PCT_ML,
  SPRING_PIE_REVEAL, pieLegendFont,
} from "../elementDefaults";

type SliceItem = { label: string; value: number; color?: string };

function normalizeSlices(el: SceneElement): SliceItem[] {
  const raw = (el.slices as Record<string, unknown>[]) ?? [];
  return raw.map((d) => ({
    label: extractLabel(d),
    value: extractValue(d),
    color: typeof d.color === "string" ? d.color : undefined,
  }));
}

const MAX_LEGEND = PIE_MAX_LEGEND;

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors; fontScale?: number };

export const PieChartElement: React.FC<Props> = ({ el, index, dark, colors, fontScale = 1 }) => {
  const c = resolveColors(colors, dark);
  const palette = usePaletteColors();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stable memo — depend on raw el.slices, not normalized array
  const slices = useMemo(() => normalizeSlices(el), [el.slices]);
  if (slices.length === 0) return null;

  const donut = (el.donut as boolean) ?? false;
  const highlightIndex = (el.highlightIndex as number) ?? -1;
  const showPercentage = (el.showPercentage as boolean) ?? true;

  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "zoom");

  const { delay, springConfig, progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "pie-chart",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  const size = PIE_SIZE;
  const outerR = size / 2;
  const innerR = donut ? outerR * PIE_DONUT_RATIO : 0;

  const totalValue = slices.reduce((s, d) => s + d.value, 0);

  const arcs = useMemo(() => {
    const pieGen = pie<SliceItem>().value((d) => d.value).sort(null);
    return pieGen(slices);
  }, [slices]);

  const progress = spring({ frame: frame - delay, fps, config: springConfig });
  const labelOpacity = spring({ frame: frame - delay - 20, fps, config: SPRING_PIE_REVEAL });

  const vb = `-${size / 2 + PIE_PADDING} -${size / 2 + PIE_PADDING} ${size + PIE_PADDING * 2} ${size + PIE_PADDING * 2}`;

  // Legend: cap at MAX_LEGEND items to prevent overflow
  const legendSlices = slices.length > MAX_LEGEND ? slices.slice(0, MAX_LEGEND) : slices;
  const legendFontSize = Math.round(pieLegendFont(slices.length) * fontScale);
  const truncated = slices.length - MAX_LEGEND;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: PIE_LEGEND_GAP, width: "100%", height: "100%", opacity: entrance.opacity, transform: entrance.transform }}>
      <svg viewBox={vb} style={{ flex: 1, maxWidth: "50%", maxHeight: "60vh", height: "auto", overflow: "visible" }}>
        {arcs.map((a, i) => {
          const color = slices[i].color ?? chartColor(i, palette);
          const isHl = i === highlightIndex;

          const animatedEnd = a.startAngle + (a.endAngle - a.startAngle) * progress;

          const pathGen = arc<typeof a>()
            .innerRadius(innerR)
            .outerRadius(isHl ? outerR + PIE_HL_BONUS : outerR)
            .cornerRadius(PIE_CORNER_R);

          const d = pathGen({ ...a, endAngle: animatedEnd }) ?? "";

          return (
            <path
              key={i}
              d={d}
              fill={color}
              stroke={PIE_STROKE_COLOR}
              strokeWidth={PIE_STROKE_W}
              opacity={isHl ? 1 : PIE_BASE_OPACITY}
            />
          );
        })}
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: labelOpacity }}>
        {legendSlices.map((s, i) => {
          const color = s.color ?? chartColor(i, palette);
          const pct = totalValue > 0 ? formatPercent((s.value / totalValue) * 100) : "0%";
          const isHl = i === highlightIndex;

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: PIE_SWATCH, height: PIE_SWATCH, borderRadius: PIE_SWATCH_R,
                backgroundColor: color, flexShrink: 0,
              }} />
              <span style={{
                fontSize: legendFontSize, color: c.text,
                fontWeight: isHl ? 700 : 400,
              }}>
                {s.label}
                {showPercentage && (
                  <span style={{ color: c.muted, marginLeft: PIE_PCT_ML, fontSize: legendFontSize - 6 }}>
                    {pct}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {truncated > 0 && (
          <div style={{ fontSize: legendFontSize - 4, color: c.label, paddingLeft: 48 }}>
            +{truncated} more
          </div>
        )}
      </div>
    </div>
  );
};
