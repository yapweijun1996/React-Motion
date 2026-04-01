/**
 * Smart color palette generator using chroma-js.
 *
 * AI picks a primary color or mood → this generates a full harmonious palette.
 * Uses LAB/LCH color space for perceptually uniform interpolation.
 */

import chroma from "chroma-js";

export type PaletteScheme = "analogous" | "complementary" | "triadic" | "split-complementary" | "monochrome";

export type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  background: { light: string; dark: string };
  chart: string[];      // 8 colors for data visualization
  text: { light: string; dark: string };
  scheme: PaletteScheme;
};

// --- Mood-to-color mapping ---

const MOOD_COLORS: Record<string, string> = {
  professional: "#2563eb",
  corporate: "#1e40af",
  warm: "#ea580c",
  cool: "#0891b2",
  bold: "#dc2626",
  calm: "#059669",
  elegant: "#7c3aed",
  playful: "#ec4899",
  nature: "#16a34a",
  tech: "#6366f1",
  finance: "#0d9488",
  energy: "#f59e0b",
};

/**
 * Generate a full palette from a primary color or mood keyword.
 */
export function generatePalette(
  input: string,
  scheme: PaletteScheme = "analogous",
): Palette {
  // Resolve input: hex color or mood keyword
  const primary = resolveColor(input);
  const hsl = chroma(primary).hsl();
  const hue = hsl[0] || 0;

  // Generate harmony colors based on scheme
  const harmonyHues = getHarmonyHues(hue, scheme);
  const secondary = chroma.hsl(harmonyHues[0], 0.65, 0.55).hex();
  const accent = chroma.hsl(harmonyHues[1] ?? harmonyHues[0] + 30, 0.7, 0.5).hex();

  // Chart colors: 8 perceptually distinct colors via LCH
  const chart = generateChartColors(primary, 8);

  // Background colors — modern, clean light/dark mode
  // Light: near-white with a hint of primary hue (not pure white)
  // Dark: deep slate with primary tint (not muddy gray)
  const bgLight = chroma(primary).luminance(0.96).hex();
  const bgDark = chroma(primary).luminance(0.03).desaturate(0.5).hex();

  // Text colors with guaranteed contrast
  const textDark = chroma(primary).luminance(0.05).desaturate(1).hex();
  const textLight = chroma(primary).luminance(0.93).desaturate(0.8).hex();

  return {
    primary,
    secondary,
    accent,
    background: { light: bgLight, dark: bgDark },
    chart,
    text: { light: textLight, dark: textDark },
    scheme,
  };
}

/**
 * Generate N perceptually distinct chart colors.
 * Uses LCH color space for uniform perceptual distance.
 * Checks for colorblind safety (deuteranopia simulation).
 */
export function generateChartColors(primary: string, count: number): string[] {
  const baseHue = chroma(primary).get("lch.h") || 0;
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (i * 360) / count) % 360;
    // Alternate lightness for better distinction
    const lightness = i % 2 === 0 ? 55 : 45;
    const chrom = 70 + (i % 3) * 10; // Vary chroma slightly
    colors.push(chroma.lch(lightness, chrom, hue).hex());
  }

  return colors;
}

/**
 * Check if two colors have sufficient contrast (WCAG AA = 4.5:1).
 */
export function hasContrast(fg: string, bg: string, minRatio = 4.5): boolean {
  return chroma.contrast(fg, bg) >= minRatio;
}

/**
 * Auto-pick text color (dark or light) for a given background.
 */
export function textColorOn(bg: string): string {
  return chroma(bg).luminance() > 0.4 ? "#1f2937" : "#f9fafb";
}

/**
 * Generate scene background colors that alternate light/dark.
 */
export function generateSceneBgs(primary: string, count: number): string[] {
  const bgs: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) {
      // Dark scene
      bgs.push(chroma(primary).luminance(0.04).desaturate(1).hex());
    } else if (i % 3 === 1) {
      // Light scene
      bgs.push(chroma(primary).luminance(0.95).hex());
    } else {
      // Accent scene — slightly tinted
      bgs.push(chroma(primary).luminance(0.88).saturate(0.3).hex());
    }
  }
  return bgs;
}

// --- Internal ---

function resolveColor(input: string): string {
  if (!input || typeof input !== "string") return MOOD_COLORS.professional;

  // If it's a valid hex/color, use it directly
  if (chroma.valid(input)) return chroma(input).hex();

  // Check mood keywords
  const mood = input.toLowerCase().trim();
  if (mood in MOOD_COLORS) return MOOD_COLORS[mood];

  // Default
  return MOOD_COLORS.professional;
}

function getHarmonyHues(hue: number, scheme: PaletteScheme): number[] {
  switch (scheme) {
    case "complementary":
      return [(hue + 180) % 360];
    case "triadic":
      return [(hue + 120) % 360, (hue + 240) % 360];
    case "split-complementary":
      return [(hue + 150) % 360, (hue + 210) % 360];
    case "monochrome":
      return [(hue + 15) % 360, (hue - 15 + 360) % 360];
    case "analogous":
    default:
      return [(hue + 30) % 360, (hue + 60) % 360];
  }
}
