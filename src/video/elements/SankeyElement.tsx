import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "../VideoContext";
import { spring, interpolate } from "../animation";
import { sankey, sankeyLinkHorizontal, sankeyCenter } from "d3-sankey";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import { chartColor, extractValue } from "../../services/chartHelpers";
import { usePaletteColors } from "../PaletteContext";
import type { SceneElement } from "../../types";
import type { SceneColors } from "../sceneColors";
import {
  resolveColors,
  SANKEY_W, SANKEY_H, SANKEY_NODE_W, SANKEY_NODE_PAD,
  SANKEY_NODE_R, SANKEY_LABEL_FONT, SANKEY_LABEL_OFFSET, SANKEY_LINK_OPACITY,
  SPRING_SANKEY_LINK,
} from "../elementDefaults";

type NodeInput = { name: string; color?: string };
type LinkInput = { source: number; target: number; value: number };

function normalizeNodes(el: SceneElement): NodeInput[] {
  const raw = (el.nodes as Record<string, unknown>[]) ?? [];
  return raw.map((d) => ({
    name: String(d.name ?? d.label ?? ""),
    color: typeof d.color === "string" ? d.color : undefined,
  }));
}

function normalizeLinks(el: SceneElement): LinkInput[] {
  const raw = (el.links as Record<string, unknown>[]) ?? [];
  return raw.map((d) => ({
    source: Number(d.source) || 0,
    target: Number(d.target) || 0,
    value: extractValue(d),
  }));
}

const CHART_W = SANKEY_W;
const CHART_H = SANKEY_H;
const NODE_W = SANKEY_NODE_W;
const NODE_PAD = SANKEY_NODE_PAD;

type Props = { el: SceneElement; index: number; dark?: boolean; colors?: SceneColors };

export const SankeyElement: React.FC<Props> = ({ el, index, dark, colors }) => {
  const c = resolveColors(colors, dark);
  const palette = usePaletteColors();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stable memo — depend on raw el.nodes/el.links, not normalized arrays
  const inputNodes = useMemo(() => normalizeNodes(el), [el.nodes]);
  const inputLinks = useMemo(() => normalizeLinks(el), [el.links]);

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
        const linkProgress = spring({ frame: frame - linkDelay, fps, config: SPRING_SANKEY_LINK });
        const linkOpacity = interpolate(linkProgress, [0, 1], [0, SANKEY_LINK_OPACITY]);

        const sourceNode = link.source as typeof nodes[0];
        const color = sourceNode.color ?? chartColor(sourceNode.index!, palette);

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
        const color = node.color ?? chartColor(node.index!, palette);
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
              rx={SANKEY_NODE_R}
            />
            <text
              x={x0 < CHART_W / 2 ? x1 + SANKEY_LABEL_OFFSET : x0 - SANKEY_LABEL_OFFSET}
              y={y0 + h / 2}
              textAnchor={x0 < CHART_W / 2 ? "start" : "end"}
              dominantBaseline="middle"
              fontSize={SANKEY_LABEL_FONT}
              fill={c.text}
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
