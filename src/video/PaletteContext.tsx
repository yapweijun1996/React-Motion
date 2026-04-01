/**
 * PaletteContext — provides AI-generated chart colors to all chart elements.
 *
 * Wrapped at the composition level (ReportComposition) so every scene
 * and element can access the palette via usePaletteColors().
 * Returns null when no palette is available (old cached scripts).
 */

import { createContext, useContext } from "react";

const PaletteContext = createContext<readonly string[] | null>(null);

type Props = { colors?: string[]; children: React.ReactNode };

export function PaletteProvider({ colors, children }: Props) {
  return (
    <PaletteContext.Provider value={colors?.length ? colors : null}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePaletteColors(): readonly string[] | null {
  return useContext(PaletteContext);
}
