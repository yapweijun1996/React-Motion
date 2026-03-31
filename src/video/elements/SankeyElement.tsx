import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { sankey, sankeyLinkHorizontal, sankeyCenter } from "d3-sankey";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor } from "../../services/chartHelpers";
import type { SceneElement } from "../../types";

type NodeInput = { name: string; color?: string };
type LinkInput = { source: number; target: number; value: number };

const CHART_W = 1100;
const CHART_H = 500;
const NODE_W = 22;
const NODE_PAD = 20;

type Props = { el: SceneElement; index: number; dark?: boolean };

export const SankeyElement: React.FC<Props> = ({ el, index, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inputNodes = (el.nodes as NodeInput[]) ?? [];
  const inputLinks = (el.links as LinkInput[]) ?? [];

  if (inputNodes.length === 0 || inputLinks.length === 0) return null;

  const stagger = parseStagger(el);
  const animation = parseAnimation(el, "zoom");

  const { delay: baseDelay, springConfig, progress: containerProgress } = useStagger({
    elementIndex: index,
    stagger,
    delayOverride: el.delay,
    elementType: "sankey",
  });
  const entrance = computeEntranceStyle(containerProgress, animation);

  // Memoize D3 layout — O(n²), only recompute when data changes
  const { nodes, links } = useMemo(() => {
    const sNodes = inputNodes.map((n, i) => ({ ...n, index: i }));
    const sLinks = inputLinks.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    }));

    const generator = sankey<typeof sNodes[0], typeof sLinks[0]>()
      .nodeId((d) => d.index)
      .nodeWidth(NODE_W)
      .nodePadding(NODE_PAD)
      .nodeAlign(sankeyCenter)
      .extent([[1, 1], [CHART_W - 1, CHART_H - 5]]);

    return generator({
      nodes: sNodes.map((d) => ({ ...d })),
      links: sLinks.map((d) => ({ ...d })),
    });
  }, [inputNodes, inputLinks]);

  const nodeOpacity = spring({ frame: frame - baseDelay, fps, config: springConfig });
  const linkPath = sankeyLinkHorizontal();

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 24}`} style={{ width: "100%", height: "auto", overflow: "visible", opacity: entrance.opacity, transform: entrance.transform }}>
      {links.map((link, i) => {
        const linkDelay = baseDelay + 12 + i * 4;
        const linkProgress = spring({ frame: frame - linkDelay, fps, config: { damping: 16, mass: 0.6 } });
        const linkOpacity = interpolate(linkProgress, [0, 1], [0, 0.4]);

        const sourceNode = link.source as typeof nodes[0];
        const color = sourceNode.color ?? chartColor(sourceNode.index!);

        return (
          <path
            key={`link-${i}`}
            d={linkPath(link as Parameters<typeof linkPath>[0]) ?? ""}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(1, Number(link.width) || 1)}
            strokeOpacity={linkOpacity}
          />
        );
      })}

      {nodes.map((node, i) => {
        const color = node.color ?? chartColor(node.index!);
        const x0 = node.x0 ?? 0;
        const y0 = node.y0 ?? 0;
        const x1 = node.x1 ?? 0;
        const y1 = node.y1 ?? 0;
        const h = y1 - y0;

        return (
          <g key={`node-${i}`} opacity={nodeOpacity}>
            <rect
              x={x0} y={y0}
              width={x1 - x0} height={h}
              fill={color}
              rx={3}
            />
            <text
              x={x0 < CHART_W / 2 ? x1 + 8 : x0 - 8}
              y={y0 + h / 2}
              textAnchor={x0 < CHART_W / 2 ? "start" : "end"}
              dominantBaseline="middle"
              fontSize={38}
              fill={dark ? "#e2e8f0" : "#374151"}
              fontWeight={500}
            >
              {node.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
