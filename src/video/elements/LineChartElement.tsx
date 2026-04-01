import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring } from "../animation";
import { line, curveMonotoneX } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, formatValue, extractValue, extractLabel } from "../../services/chartHelpers";
import { usePaletteColors } from "../PaletteContext";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  LINE_W, LINE_H, LINE_MARGIN, LINE_Y_TICKS, LINE_X_PAD, LINE_Y_PAD,
  LINE_AXIS_FONT, LINE_GRID_W, LINE_STROKE_W, LINE_DOT_R, LINE_DOT_STROKE, LINE_DOT_STROKE_W,
  SPRING_CHART_REVEAL,
} from "../elementDefaults";

type DataPoint = { label: string; value: number };
type LineSeries = { name: string; data: DataPoint[]; color?: string };

const CHART_W = LINE_W;
const CHART_H = LINE_H;
const MARGIN = LINE_MARGIN;
const INNER_W = CHART_W - MARGIN.left - MARGIN.right;
const INNER_H = CHART_H - MARGIN.top - MARGIN.bottom;

function normalizeSeries(el: SceneElement): LineSeries[] {
  const coerce = (pts: DataPoint[]): DataPoint[] =>
    pts.map((d) => {
      const raw = d as unknown as Record<string, unknown>;
      return { label: extractLabel(raw), value: extractValue(raw) };
    });

  if (Array.isArray(el.series)) {
    return (el.series as LineSeries[]).map((s) => ({ ...s, data: coerce(s.data) }));
  }
  if (Array.isArray(el.data)) {
    return [{ name: "default", data: coerce(el.data as DataPoint[]), color: el.color as string | undefined }];
  }
  return [];
}

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors };

export const LineChartElement: React.FC<Props> = ({ el, index, dark, colors }) => {
  const c = resolveColors(colors, dark);
  const palette = usePaletteColors();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stable memo — depend on raw el.series/el.data, not normalized array
  const series = useMemo(() => normalizeSeries(el), [el.series, el.data]);
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

  const { allLabels, xScale, yScale, yTicks } = useMemo(() => {
    const labels = series[0].data.map((d) => d.label);
    const values = series.flatMap((s) => s.data.map((d) => d.value));
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 1);
    if (min === max) { min = 0; max = max || 1; }
    const pad = (max - min) * LINE_Y_PAD || 1;

    const x = scalePoint<string>().domain(labels).range([0, INNER_W]).padding(LINE_X_PAD);
    const y = scaleLinear().domain([min - pad, max + pad]).range([INNER_H, 0]);

    return { allLabels: labels, xScale: x, yScale: y, yTicks: y.ticks(LINE_Y_TICKS) };
  }, [series]);

  const drawProgress = spring({ frame: frame - delay, fps, config: springConfig });
  const dotOpacity = spring({ frame: frame - delay - 20, fps, config: SPRING_CHART_REVEAL });

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: "100%", height: "auto", overflow: "visible", opacity: entrance.opacity, transform: entrance.transform }}>
      <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={0} x2={INNER_W}
            y1={yScale(tick)} y2={yScale(tick)}
            stroke={c.gridLine} strokeWidth={LINE_GRID_W}
          />
        ))}

        {yTicks.map((tick) => (
          <text
            key={`yl-${tick}`}
            x={-10} y={yScale(tick)}
            textAnchor="end" dominantBaseline="middle"
            fontSize={LINE_AXIS_FONT} fill={c.label}
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
            fontSize={LINE_AXIS_FONT} fill={c.label}
          >
            {label}
          </text>
        ))}

        {series.map((s, si) => {
          const color = s.color ?? chartColor(si, palette);

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
                  r={LINE_DOT_R}
                  fill={color}
                  stroke={LINE_DOT_STROKE}
                  strokeWidth={LINE_DOT_STROKE_W}
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
  // Large enough for any reasonable line chart path
  const totalLen = Math.max(3000, INNER_W * 2);
  const offset = totalLen * (1 - progress);

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={LINE_STROKE_W}
      strokeLinecap="round"
      strokeDasharray={totalLen}
      strokeDashoffset={offset}
    />
  );
};
