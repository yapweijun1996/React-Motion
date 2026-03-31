import { useCurrentFrame, interpolate } from "remotion";
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
  const items = (el.items as MetricItem[]) ?? [];
  const baseDelay = (el.delay as number) ?? index * 8;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: items.length <= 2 ? 100 : 48,
        flexWrap: "wrap",
      }}
    >
      {items.map((item, i) => {
        const delay = baseDelay + i * 10;

        const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateY = interpolate(frame, [delay, delay + 15], [24, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const countProgress = interpolate(frame, [delay + 5, delay + 30], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const numericValue = parseFloat(item.value.replace(/[^0-9.]/g, ""));
        const hasNumeric = !isNaN(numericValue);
        const suffix = hasNumeric ? item.value.replace(/[0-9.,]/g, "").trim() : "";
        const displayNum = hasNumeric ? (numericValue * countProgress) : 0;

        const formatted = hasNumeric
          ? item.value.includes(".")
            ? displayNum.toFixed(1)
            : Math.round(displayNum).toLocaleString()
          : item.value;

        const color = item.color ?? primaryColor ?? "#2563eb";

        return (
          <div
            key={i}
            style={{
              textAlign: "center",
              minWidth: 160,
              opacity,
              transform: `translateY(${translateY}px)`,
            }}
          >
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                color,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatted}
              {suffix && <span style={{ fontSize: 26, marginLeft: 4 }}>{suffix}</span>}
            </div>
            <div style={{ fontSize: 15, color: "#94a3b8", marginTop: 8, fontWeight: 500 }}>
              {item.label}
            </div>
            {item.subtext && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                {item.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
