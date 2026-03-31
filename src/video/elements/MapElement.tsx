/**
 * Map element — d3-geo world/region map with data overlay.
 *
 * AI specifies highlighted countries + values. Renders as SVG choropleth.
 * Uses world-atlas 110m TopoJSON (bundled, ~100KB) + d3-geo projection.
 *
 * Supports:
 * - World map (default)
 * - Country highlighting with custom colors
 * - Value labels on highlighted countries
 * - Spring entrance animation
 */

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import worldData from "world-atlas/countries-110m.json";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";

type CountryData = {
  name: string;
  value?: number | string;
  color?: string;
};

// Country name → ISO numeric ID mapping (common countries)
const NAME_TO_ID: Record<string, string> = {
  "China": "156", "USA": "840", "United States": "840",
  "India": "356", "Japan": "392", "Germany": "276",
  "UK": "826", "United Kingdom": "826", "France": "250",
  "Brazil": "076", "Canada": "124", "Australia": "036",
  "Russia": "643", "South Korea": "410", "Korea": "410",
  "Italy": "380", "Spain": "724", "Mexico": "484",
  "Indonesia": "360", "Turkey": "792", "Saudi Arabia": "682",
  "Switzerland": "756", "Netherlands": "528", "Sweden": "752",
  "Singapore": "702", "Malaysia": "458", "Thailand": "764",
  "Vietnam": "704", "Philippines": "608", "Nigeria": "566",
  "South Africa": "710", "Egypt": "818", "Argentina": "032",
  "Colombia": "170", "Chile": "152", "Peru": "604",
  "New Zealand": "554", "Ireland": "372", "Norway": "578",
  "Denmark": "208", "Finland": "246", "Poland": "616",
  "Taiwan": "158", "Hong Kong": "344", "UAE": "784",
  "Israel": "376", "Portugal": "620", "Greece": "300",
  "Belgium": "056", "Austria": "040", "Czech Republic": "203",
};

const DEFAULT_COLORS = [
  "#3b82f6", "#f97316", "#ef4444", "#10b981",
  "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4",
];

const MAP_W = 960;
const MAP_H = 500;

type Props = { el: SceneElement; index: number; dark?: boolean };

export const MapElement: React.FC<Props> = ({ el, index }) => {
  const countries = (el.countries as CountryData[]) ?? [];
  const baseColor = (el.baseColor as string) ?? "#e2e8f0";
  const strokeColor = (el.strokeColor as string) ?? "#94a3b8";
  const showLabels = (el.showLabels as boolean) ?? true;
  const animation = parseAnimation(el, "zoom");

  const { progress } = useStagger({
    elementIndex: index,
    stagger: parseStagger(el),
    delayOverride: el.delay,
    elementType: "data",
  });

  const entrance = computeEntranceStyle(progress, animation);

  // Build highlight map: ISO id → { color, value, name }
  const highlightMap = useMemo(() => {
    const map = new Map<string, CountryData & { assignedColor: string }>();
    countries.forEach((c, i) => {
      const id = NAME_TO_ID[c.name];
      if (id) {
        map.set(id, {
          ...c,
          assignedColor: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        });
      }
    });
    return map;
  }, [countries]);

  // Convert TopoJSON → GeoJSON features (memoized)
  const { features, pathGen } = useMemo(() => {
    const topo = worldData as unknown as Topology<{ countries: GeometryCollection }>;
    const geo = feature(topo, topo.objects.countries);
    const proj = geoNaturalEarth1()
      .fitSize([MAP_W, MAP_H], geo as GeoPermissibleObjects);
    const path = geoPath(proj);
    return { features: geo.features, pathGen: path };
  }, []);

  // Compute label positions for highlighted countries
  const labels = useMemo(() => {
    return features
      .filter((f) => highlightMap.has(f.id as string))
      .map((f) => {
        const data = highlightMap.get(f.id as string)!;
        const centroid = pathGen.centroid(f as GeoPermissibleObjects);
        return {
          x: centroid[0],
          y: centroid[1],
          name: data.name,
          value: data.value,
          color: data.assignedColor,
        };
      })
      .filter((l) => isFinite(l.x) && isFinite(l.y));
  }, [features, highlightMap, pathGen]);

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      style={{
        width: "100%",
        height: "auto",
        overflow: "visible",
        opacity: entrance.opacity,
        transform: entrance.transform,
      }}
    >
      {/* Country paths */}
      {features.map((f, i) => {
        const id = f.id as string;
        const hl = highlightMap.get(id);
        const fill = hl ? hl.assignedColor : baseColor;

        return (
          <path
            key={i}
            d={pathGen(f as GeoPermissibleObjects) ?? ""}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={hl ? 1.5 : 0.5}
          />
        );
      })}

      {/* Labels for highlighted countries */}
      {showLabels && labels.map((l, i) => (
        <g key={`label-${i}`}>
          {/* Background pill */}
          <rect
            x={l.x - 40}
            y={l.y - 22}
            width={80}
            height={l.value !== undefined ? 38 : 24}
            rx={6}
            fill="rgba(0,0,0,0.7)"
          />
          {/* Country name */}
          <text
            x={l.x}
            y={l.y - 6}
            textAnchor="middle"
            fontSize={11}
            fill="white"
            fontWeight={600}
          >
            {l.name}
          </text>
          {/* Value */}
          {l.value !== undefined && (
            <text
              x={l.x}
              y={l.y + 10}
              textAnchor="middle"
              fontSize={10}
              fill={l.color}
              fontWeight={700}
            >
              {l.value}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};
