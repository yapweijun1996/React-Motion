import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring } from "../animation";
import { pie, arc } from "d3-shape";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatPercent, extractValue, extractLabel } from "../../services/chartHelpers";
import { usePaletteColors } from "../PaletteContext";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";

type SliceItem = { label: string; value: number; color?: string };

function normalizeSlices(el: SceneElement): SliceItem[] {
  const raw = (el.slices as Record<string, unknown>[]) ?? [];
  return raw.map((d) => ({
    label: extractLabel(d),
    value: extractValue(d),
    color: typeof d.color === "string" ? d.color : undefined,
  }));
}

const MAX_LEGEND = 8;

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors; fontScale?: number };

export const PieChartElement: React.FC<Props> = ({ el, index, dark, colors, fontScale = 1 }) => {
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

  const size = 480;
  const outerR = size / 2;
  const innerR = donut ? outerR * 0.55 : 0;

  const totalValue = slices.reduce((s, d) => s + d.value, 0);

  const arcs = useMemo(() => {
    const pieGen = pie<SliceItem>().value((d) => d.value).sort(null);
    return pieGen(slices);
  }, [slices]);

  const progress = spring({ frame: frame - delay, fps, config: springConfig });
  const labelOpacity = spring({ frame: frame - delay - 20, fps, config: { damping: 18 } });

  const vb = `-${size / 2 + 10} -${size / 2 + 10} ${size + 20} ${size + 20}`;

  // Legend: cap at MAX_LEGEND items to prevent overflow
  const legendSlices = slices.length > MAX_LEGEND ? slices.slice(0, MAX_LEGEND) : slices;
  const legendFontSize = Math.round((slices.length > 6 ? 36 : 42) * fontScale);
  const truncated = slices.length - MAX_LEGEND;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 48, width: "100%", height: "100%", opacity: entrance.opacity, transform: entrance.transform }}>
      <svg viewBox={vb} style={{ flex: 1, maxWidth: "50%", maxHeight: "60vh", height: "auto", overflow: "visible" }}>
        {arcs.map((a, i) => {
          const color = slices[i].color ?? chartColor(i, palette);
          const isHl = i === highlightIndex;

          const animatedEnd = a.startAngle + (a.endAngle - a.startAngle) * progress;

          const pathGen = arc<typeof a>()
            .innerRadius(innerR)
            .outerRadius(isHl ? outerR + 10 : outerR)
            .cornerRadius(2);

          const d = pathGen({ ...a, endAngle: animatedEnd }) ?? "";

          return (
            <path
              key={i}
              d={d}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
              opacity={isHl ? 1 : 0.9}
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
                width: 32, height: 32, borderRadius: 6,
                backgroundColor: color, flexShrink: 0,
              }} />
              <span style={{
                fontSize: legendFontSize, color: colors?.text ?? (dark ? "#e2e8f0" : "#1e293b"),
                fontWeight: isHl ? 700 : 400,
              }}>
                {s.label}
                {showPercentage && (
                  <span style={{ color: colors?.muted ?? (dark ? "#94a3b8" : "#6b7280"), marginLeft: 12, fontSize: legendFontSize - 6 }}>
                    {pct}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {truncated > 0 && (
          <div style={{ fontSize: legendFontSize - 4, color: colors?.label ?? (dark ? "#cbd5e1" : "#6b7280"), paddingLeft: 48 }}>
            +{truncated} more
          </div>
        )}
      </div>
    </div>
  );
};
