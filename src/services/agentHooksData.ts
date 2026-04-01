/**
 * Data accuracy helpers for agent quality checks.
 *
 * Extracted from agentHooks.ts to keep files under 300 lines.
 * Detects fabricated numbers in script narration and element data.
 */

/** Numeric patterns that represent hard data claims (not ordinals like "3 steps") */
const HARD_DATA_PATTERN = /(?:\$[\d,.]+[BMKTbmkt]?|\d+(?:\.\d+)?%|\d{4}(?:\s*[-–]\s*\d{4})?(?=\s|$|,|\.)|\d+(?:\.\d+)?x\b|\d[\d,.]*[BMKTbmkt]\+?(?=\s|$|,|\.|\))|\d[\d,.]*\s*(?:billion|million|trillion|thousand|percent|bps|basis\s*points))/gi;

/** Small ordinal/count numbers (1-20) that are structural, not data claims */
const TRIVIAL_NUMBER = /^(?:[0-9]|1[0-9]|20)$/;

/**
 * Canonicalize a matched number token so equivalent forms compare equal.
 *
 * Examples:
 *  "$2B" and "$2.0B" → "$2b"
 *  "2 billion" → "$2b"  (word suffix → letter suffix)
 *  "45%" stays "45%"
 *  "2020–2024" → "2020-2024" (normalize dash)
 */
function canonicalize(raw: string): string {
  let s = raw.replace(/[\s,]/g, "").toLowerCase();

  // Normalize en-dash / em-dash to hyphen
  s = s.replace(/[–—]/g, "-");

  // Word suffixes → letter suffixes: "billion" → "b", "million" → "m", etc.
  s = s.replace(/billion/g, "b").replace(/million/g, "m")
    .replace(/trillion/g, "t").replace(/thousand/g, "k")
    .replace(/percent/g, "%").replace(/basispoints/g, "bps");

  // Strip trailing ".0" before a suffix: "$2.0b" → "$2b", "45.0%" → "45%"
  s = s.replace(/\.0+([bmkt%x])/g, "$1");

  // Strip "$" when a magnitude suffix is present, so "$2b" and "2b" match.
  // Keep "$" for raw amounts without suffix (e.g. "$500" stays "$500").
  if (/[bmtk]$/i.test(s)) {
    s = s.replace(/^\$/, "");
  }

  return s;
}

/**
 * Extract hard data numbers from text (percentages, dollar amounts, years, multipliers).
 * Returns canonicalized string tokens for comparison.
 */
export function extractHardNumbers(text: string): string[] {
  const matches = text.match(HARD_DATA_PATTERN) ?? [];
  return matches.map(canonicalize);
}

/**
 * Extract hard data numbers from scene elements (metric values, chart data, progress).
 * Returns canonicalized string tokens for comparison.
 */
function extractElementNumbers(elements: Record<string, unknown>[]): string[] {
  const texts: string[] = [];
  for (const el of elements) {
    const t = String(el.type ?? "");
    // metric items: { value: "1B+", label: "..." }
    if (t === "metric") {
      const items = (el.items as Record<string, unknown>[]) ?? [];
      for (const item of items) {
        if (typeof item.value === "string") texts.push(item.value);
        if (typeof item.subtext === "string") texts.push(item.subtext);
      }
    }
    // progress: { value: 73, label: "..." }
    if (t === "progress" && typeof el.value === "number" && el.value > 20) {
      texts.push(String(el.value) + (typeof el.suffix === "string" ? el.suffix : "%"));
    }
    // comparison: left/right values
    if (t === "comparison") {
      for (const side of ["left", "right"] as const) {
        const card = el[side] as Record<string, unknown> | undefined;
        if (card && typeof card.value === "string") texts.push(card.value);
      }
    }
  }
  // Extract hard numbers from all collected text
  return texts.flatMap((text) => extractHardNumbers(text));
}

/**
 * Check whether script contains fabricated data (narration + elements).
 *
 * Strategy:
 * - Extract all hard numbers from script narrations AND element data.
 * - If userPrompt is provided, extract its numbers as the allowed set.
 * - Numbers in script that don't appear in user prompt → potential fabrication.
 * - If userPrompt has NO hard numbers at all, any hard number in script is suspect.
 */
export function checkDataAccuracy(
  scenes: Record<string, unknown>[],
  userPrompt?: string,
): string[] {
  const issues: string[] = [];
  if (!userPrompt) return issues; // no prompt → can't verify, skip

  const userNumbers = new Set(extractHardNumbers(userPrompt));
  const userHasData = userNumbers.size > 0;

  for (let si = 0; si < scenes.length; si++) {
    // Collect numbers from both narration and element data
    const narration = String(scenes[si].narration ?? "");
    const elements = (scenes[si].elements as Record<string, unknown>[]) ?? [];
    const narrationNumbers = extractHardNumbers(narration);
    const elementNumbers = extractElementNumbers(elements);

    // Deduplicate per scene
    const allNumbers = [...new Set([...narrationNumbers, ...elementNumbers])];

    for (const num of allNumbers) {
      // Skip trivial numbers that are structural, not data claims
      // But keep numbers with format markers ($, %, B, M, x) — those are data claims
      const hasFormatMarker = /[$%xbmkt]/i.test(num);
      const raw = num.replace(/[%$xbmkt,.]/gi, "");
      if (!hasFormatMarker && TRIVIAL_NUMBER.test(raw)) continue;

      if (!userHasData) {
        // User provided no data → script should not invent numbers
        const source = narrationNumbers.includes(num) ? "narration" : "element data";
        issues.push(
          `data_accuracy: Scene ${si + 1} ${source} contains "${num}" but user provided no verifiable data — remove or replace with qualitative statement`,
        );
      } else if (!userNumbers.has(num)) {
        // User provided data but this number isn't in it
        const source = narrationNumbers.includes(num) ? "narration" : "element data";
        issues.push(
          `data_accuracy: Scene ${si + 1} ${source} contains "${num}" not found in user's original data — verify or remove`,
        );
      }
    }
  }
  return issues;
}
