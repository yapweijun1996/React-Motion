import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { useStagger, parseStagger, parseAnimation, computeEntranceStyle } from "../useStagger";
import type { SceneElement } from "../../types";

type MetricItem = {
  value: string;
  label: string;
  subtext?: string;
  color?: string;
};

type Props = { el: SceneElement; index: number; primaryColor?: string };

export const MetricElement: React.FC<Props> = ({ el, index, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (el.items as MetricItem[]) ?? [];
  const stagger = parseStagger(el);
  const animation = parseAnimation(el);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: items.length <= 2 ? 120 : 56,
        flexWrap: "wrap",
      }}
    >
      {items.map((item, i) => {
        const { progress, delay } = useStagger({
          elementIndex: index,
          itemIndex: i,
          stagger,
          delayOverride: el.delay,
          elementType: "metric",
        });

        // Count-up uses its own heavier spring
        const countProgress = spring({
          frame: frame - delay - 5,
          fps,
          config: { damping: 20, mass: 0.8 },
        });

        const numericValue = parseFloat(item.value.replace(/[^0-9.]/g, ""));
        const hasNumeric = isFinite(numericValue);
        const suffix = hasNumeric ? item.value.replace(/[0-9.,]/g, "").trim() : "";
        const displayNum = hasNumeric ? numericValue * countProgress : 0;

        const formatted = hasNumeric
          ? item.value.includes(".")
            ? displayNum.toFixed(1)
            : Math.round(displayNum).toLocaleString()
          : item.value;

        const color = item.color ?? primaryColor ?? "#2563eb";
        const entrance = computeEntranceStyle(progress, animation);

        return (
          <div
            key={i}
            style={{
              textAlign: "center",
              minWidth: 180,
              opacity: entrance.opacity,
              transform: entrance.transform,
            }}
          >
            <div
              style={{
                fontSize: 160,
                fontWeight: 800,
                color,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatted}
              {suffix && <span style={{ fontSize: 72, marginLeft: 8 }}>{suffix}</span>}
            </div>
            <div style={{ fontSize: 56, color: "#94a3b8", marginTop: 16, fontWeight: 500 }}>
              {item.label}
            </div>
            {item.subtext && (
              <div style={{ fontSize: 42, color: "#64748b", marginTop: 8 }}>
                {item.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
