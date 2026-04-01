/**
 * Drop-in replacement for Remotion's AbsoluteFill.
 * A full-viewport container with absolute positioning and flex centering.
 */

import type { CSSProperties, ReactNode } from "react";

const baseStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  overflow: "hidden",
};

type Props = {
  style?: CSSProperties;
  children?: ReactNode;
};

export const AbsoluteFill: React.FC<Props> = ({ style, children }) => (
  <div style={style ? { ...baseStyle, ...style } : baseStyle}>
    {children}
  </div>
);
