import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { pie, arc } from "d3-shape";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatPercent } from "../../services/chartHelpers";
import type { SceneElement } from "../../types";

type SliceItem = { label: string; value: number; color?: string };

type Props = { el: SceneElement; index: number };

export const PieChartElement: React.FC<Props> = ({ el, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slices = (el.slices as SliceItem[]) ?? [];
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

  // Memoize D3 pie layout — only recompute when data changes
  const arcs = useMemo(() => {
    const pieGen = pie<SliceItem>().value((d) => d.value).sort(null);
    return pieGen(slices);
  }, [slices]);

  const progress = spring({ frame: frame - delay, fps, config: springConfig });
  const labelOpacity = spring({ frame: frame - delay - 20, fps, config: { damping: 18 } });

  const vb = `-${size / 2 + 10} -${size / 2 + 10} ${size + 20} ${size + 20}`;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 48, width: "100%", height: "100%", opacity: entrance.opacity, transform: entrance.transform }}>
      <svg viewBox={vb} style={{ flex: 1, maxHeight: "100%", overflow: "visible" }}>
        {arcs.map((a, i) => {
          const color = slices[i].color ?? chartColor(i);
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
        {slices.map((s, i) => {
          const color = s.color ?? chartColor(i);
          const pct = totalValue > 0 ? formatPercent((s.value / totalValue) * 100) : "0%";
          const isHl = i === highlightIndex;

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                backgroundColor: color, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 42, color: "#374151",
                fontWeight: isHl ? 700 : 400,
              }}>
                {s.label}
                {showPercentage && (
                  <span style={{ color: "#9ca3af", marginLeft: 12, fontSize: 36 }}>
                    {pct}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
