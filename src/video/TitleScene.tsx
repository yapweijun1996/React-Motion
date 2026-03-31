import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

type TitleSceneProps = {
  title: string;
  subtitle?: string;
  primaryColor?: string;
};

export const TitleScene: React.FC<TitleSceneProps> = ({
  title,
  subtitle,
  primaryColor = "#2563eb",
}) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 64,
          color: primaryColor,
          opacity: titleOpacity,
          margin: 0,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: 28,
            color: "#6b7280",
            opacity: subtitleOpacity,
            marginTop: 16,
          }}
        >
          {subtitle}
        </p>
      )}
    </AbsoluteFill>
  );
};
