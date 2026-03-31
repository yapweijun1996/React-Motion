import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { line, curveMonotoneX } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatValue } from "../../services/chartHelpers";
import type { SceneElement } from "../../types";

type DataPoint = { label: string; value: number };
type LineSeries = { name: string; data: DataPoint[]; color?: string };

const CHART_W = 1100;
const CHART_H = 500;
const MARGIN = { top: 24, right: 36, bottom: 50, left: 70 };
const INNER_W = CHART_W - MARGIN.left - MARGIN.right;
const INNER_H = CHART_H - MARGIN.top - MARGIN.bottom;

type Props = { el: SceneElement; index: number; dark?: boolean };

export const LineChartElement: React.FC<Props> = ({ el, index, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const series = normalizeSeries(el);
  const showDots = (el.showDots as boolean) ?? true;

  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "zoom");

  const { delay, springConfig, progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "line-chart",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  if (series.length === 0) return null;

  // Memoize D3 scales — only recompute when data changes, not every frame
  const { allLabels, xScale, yScale, yTicks } = useMemo(() => {
    const labels = series[0].data.map((d) => d.label);
    const values = series.flatMap((s) => s.data.map((d) => d.value));
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 1);
    if (min === max) { min = 0; max = max || 1; } // guard: all-zero or identical values
    const pad = (max - min) * 0.1 || 1;

    const x = scalePoint<string>().domain(labels).range([0, INNER_W]).padding(0.1);
    const y = scaleLinear().domain([min - pad, max + pad]).range([INNER_H, 0]);

    return { allLabels: labels, xScale: x, yScale: y, yTicks: y.ticks(5) };
  }, [series]);

  const drawProgress = spring({ frame: frame - delay, fps, config: springConfig });
  const dotOpacity = spring({ frame: frame - delay - 20, fps, config: { damping: 16 } });

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: "100%", height: "auto", overflow: "visible", opacity: entrance.opacity, transform: entrance.transform }}>
      <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={0} x2={INNER_W}
            y1={yScale(tick)} y2={yScale(tick)}
            stroke={dark ? "#374151" : "#e5e7eb"} strokeWidth={1}
          />
        ))}

        {yTicks.map((tick) => (
          <text
            key={`yl-${tick}`}
            x={-10} y={yScale(tick)}
            textAnchor="end" dominantBaseline="middle"
            fontSize={36} fill={dark ? "#cbd5e1" : "#9ca3af"}
          >
            {formatValue(tick)}
          </text>
        ))}

        {allLabels.map((label) => (
          <text
            key={label}
            x={xScale(label)!}
            y={INNER_H + 30}
            textAnchor="middle"
            fontSize={36} fill={dark ? "#cbd5e1" : "#9ca3af"}
          >
            {label}
          </text>
        ))}

        {series.map((s, si) => {
          const color = s.color ?? chartColor(si);

          const lineGen = line<DataPoint>()
            .x((d) => xScale(d.label)!)
            .y((d) => yScale(d.value))
            .curve(curveMonotoneX);

          const path = lineGen(s.data) ?? "";

          return (
            <g key={si}>
              <AnimatedPath d={path} color={color} progress={drawProgress} />

              {showDots && s.data.map((d, di) => (
                <circle
                  key={di}
                  cx={xScale(d.label)!}
                  cy={yScale(d.value)}
                  r={5}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2.5}
                  opacity={dotOpacity}
                />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const AnimatedPath: React.FC<{ d: string; color: string; progress: number }> = ({
  d, color, progress,
}) => {
  const totalLen = 2000;
  const offset = totalLen * (1 - progress);

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeDasharray={totalLen}
      strokeDashoffset={offset}
    />
  );
};

function normalizeSeries(el: SceneElement): LineSeries[] {
  if (Array.isArray(el.series)) return el.series as LineSeries[];
  if (Array.isArray(el.data)) {
    return [{ name: "default", data: el.data as DataPoint[], color: el.color as string | undefined }];
  }
  return [];
}

