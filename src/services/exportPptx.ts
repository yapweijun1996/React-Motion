import pptxgen from "pptxgenjs";
import type { VideoScript, VideoScene, SceneElement } from "../types";

// ---------- Color helpers ----------

/** Strip leading '#' for pptxgenjs (expects "RRGGBB" not "#RRGGBB"). */
function pptxColor(hex: string | undefined, fallback = "FFFFFF"): string {
  if (!hex) return fallback;
  return hex.replace(/^#/, "");
}

// ---------- Layout engine ----------

type Rect = { x: number; y: number; w: number; h: number };

const SLIDE_W = 10; // inches (16:9)
const SLIDE_H = 5.625;
const PAD = 0.6;
const CONTENT_W = SLIDE_W - PAD * 2;
const CONTENT_H = SLIDE_H - PAD * 2;

/** Calculate bounding boxes for N elements given a layout strategy. */
function layoutRects(
  count: number,
  layout: "column" | "center" | "row",
): Rect[] {
  if (count === 0) return [];
  const gap = 0.15;

  if (layout === "row") {
    const itemW = (CONTENT_W - gap * (count - 1)) / count;
    return Array.from({ length: count }, (_, i) => ({
      x: PAD + i * (itemW + gap),
      y: PAD,
      w: itemW,
      h: CONTENT_H,
    }));
  }

  // column / center — stack vertically
  const itemH = (CONTENT_H - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: PAD,
    y: PAD + i * (itemH + gap),
    w: CONTENT_W,
    h: itemH,
  }));
}

// ---------- Element renderers ----------

function addTextElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  const content = (el.content as string) ?? "";
  slide.addText(content, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    fontSize: clampFont(el.fontSize as number | undefined, 24),
    color: pptxColor(el.color as string | undefined, "333333"),
    bold: ((el.fontWeight as number) ?? 400) >= 700,
    align: (el.align as "left" | "center" | "right") ?? "left",
    valign: "middle",
    wrap: true,
  });
}

function addMetricElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  const items = (el.items as { value: string; label: string; subtext?: string; color?: string }[]) ?? [];
  if (items.length === 0) return;

  const itemW = rect.w / items.length;
  items.forEach((item, i) => {
    // Big number
    slide.addText(String(item.value), {
      x: rect.x + i * itemW,
      y: rect.y,
      w: itemW,
      h: rect.h * 0.6,
      fontSize: 36,
      color: pptxColor(item.color, "2563EB"),
      bold: true,
      align: "center",
      valign: "bottom",
    });
    // Label
    slide.addText(item.label ?? "", {
      x: rect.x + i * itemW,
      y: rect.y + rect.h * 0.6,
      w: itemW,
      h: rect.h * 0.25,
      fontSize: 14,
      color: "666666",
      align: "center",
      valign: "top",
    });
    // Subtext
    if (item.subtext) {
      slide.addText(item.subtext, {
        x: rect.x + i * itemW,
        y: rect.y + rect.h * 0.85,
        w: itemW,
        h: rect.h * 0.15,
        fontSize: 10,
        color: "999999",
        align: "center",
        valign: "top",
      });
    }
  });
}

function addBarChartElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  const bars = (el.bars as { label: string; value: number; color?: string }[]) ?? [];
  if (bars.length === 0) return;

  slide.addChart("bar" as pptxgen.CHART_NAME, [
    {
      name: "Data",
      labels: bars.map((b) => b.label),
      values: bars.map((b) => b.value),
    },
  ], {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    showValue: true,
    barDir: "bar",
    chartColors: bars.map((b) => pptxColor(b.color, "4F81BD")),
  });
}

function addPieChartElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  const slices = (el.slices as { label: string; value: number; color?: string }[]) ?? [];
  if (slices.length === 0) return;

  const chartType = el.donut ? "doughnut" : "pie";
  slide.addChart(chartType as pptxgen.CHART_NAME, [
    {
      name: "Data",
      labels: slices.map((s) => s.label),
      values: slices.map((s) => s.value),
    },
  ], {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    showPercent: true,
    showLegend: true,
    legendPos: "b",
    chartColors: slices.map((s) => pptxColor(s.color, "4F81BD")),
  });
}

function addLineChartElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  type DataPoint = { label: string; value: number };
  type LineSeries = { name: string; data: DataPoint[]; color?: string };

  const series = (el.series as LineSeries[] | undefined)
    ?? (el.data ? [{ name: "Data", data: el.data as DataPoint[], color: el.color as string | undefined }] : []);

  if (series.length === 0) return;

  const labels = series[0].data.map((d) => d.label);
  const chartData = series.map((s) => ({
    name: s.name,
    labels,
    values: s.data.map((d) => d.value),
  }));

  slide.addChart("line" as pptxgen.CHART_NAME, chartData, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    showValue: false,
    showLegend: series.length > 1,
    legendPos: "b",
    chartColors: series.map((s) => pptxColor(s.color, "4F81BD")),
  });
}

function addSankeyElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  // pptxgenjs has no native sankey — render as a text summary table
  const nodes = (el.nodes as { name: string }[]) ?? [];
  const links = (el.links as { source: number; target: number; value: number }[]) ?? [];

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Source", options: { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: "4472C4" } } },
      { text: "Target", options: { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: "4472C4" } } },
      { text: "Value", options: { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: "4472C4" } } },
    ],
  ];

  links.forEach((l) => {
    rows.push([
      { text: nodes[l.source]?.name ?? String(l.source), options: { fontSize: 10 } },
      { text: nodes[l.target]?.name ?? String(l.target), options: { fontSize: 10 } },
      { text: String(l.value), options: { fontSize: 10, align: "right" } },
    ]);
  });

  slide.addTable(rows, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    colW: [rect.w * 0.4, rect.w * 0.4, rect.w * 0.2],
    border: { type: "solid", pt: 0.5, color: "CCCCCC" },
    autoPage: false,
  });
}

function addListElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  const items = (el.items as string[]) ?? [];
  if (items.length === 0) return;

  const textRows = items.map((item) => ({
    text: item,
    options: {
      bullet: true as const,
      fontSize: clampFont(el.fontSize as number | undefined, 18),
      color: pptxColor(el.textColor as string | undefined, "333333"),
      spacing: { before: 4, after: 4 },
    },
  }));

  slide.addText(textRows, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    valign: "top",
    wrap: true,
  });
}

function addDividerElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  const color = pptxColor(el.color as string | undefined, "2563EB");
  const divW = Math.min((el.width as number) ?? 400, rect.w * 96) / 96; // px → inches approx
  const centerX = rect.x + (rect.w - divW) / 2;
  const centerY = rect.y + rect.h / 2;

  slide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: centerX,
    y: centerY,
    w: divW,
    h: 0.04,
    fill: { color },
  });
}

function addCalloutElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  const borderColor = pptxColor(el.borderColor as string | undefined, "2563EB");
  const bgColor = pptxColor(el.bgColor as string | undefined, "EEF2FF");
  const content = (el.content as string) ?? "";
  const title = el.title as string | undefined;

  // Background rounded rect
  slide.addShape("roundRect" as pptxgen.SHAPE_NAME, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    fill: { color: bgColor },
    line: { color: borderColor, width: 2 },
    rectRadius: 0.1,
  });

  // Left accent bar
  slide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: rect.x,
    y: rect.y,
    w: 0.06,
    h: rect.h,
    fill: { color: borderColor },
  });

  const textParts: pptxgen.TextProps[] = [];
  if (title) {
    textParts.push({
      text: title + "\n",
      options: { bold: true, fontSize: 16, color: pptxColor(el.color as string | undefined, borderColor) },
    });
  }
  textParts.push({
    text: content,
    options: { fontSize: clampFont(el.fontSize as number | undefined, 14), color: pptxColor(el.color as string | undefined, "333333") },
  });

  slide.addText(textParts, {
    x: rect.x + 0.2,
    y: rect.y + 0.1,
    w: rect.w - 0.3,
    h: rect.h - 0.2,
    valign: "middle",
    wrap: true,
  });
}

// ---------- Helpers ----------

function clampFont(raw: number | undefined, fallback: number): number {
  const v = raw ?? fallback;
  // Video canvas is 1920×1080 with large fonts (96-128px for titles).
  // PPT slides are 10" wide. Scale: ×0.25 maps video px to reasonable PPT pt.
  return Math.min(Math.max(v * 0.25, 10), 48);
}

// ---------- Per-element dispatcher ----------

function renderElement(
  slide: pptxgen.Slide,
  el: SceneElement,
  rect: Rect,
): void {
  switch (el.type) {
    case "text":
      return addTextElement(slide, el, rect);
    case "metric":
      return addMetricElement(slide, el, rect);
    case "bar-chart":
      return addBarChartElement(slide, el, rect);
    case "pie-chart":
      return addPieChartElement(slide, el, rect);
    case "line-chart":
      return addLineChartElement(slide, el, rect);
    case "sankey":
      return addSankeyElement(slide, el, rect);
    case "list":
      return addListElement(slide, el, rect);
    case "divider":
      return addDividerElement(slide, el, rect);
    case "callout":
      return addCalloutElement(slide, el, rect);
    case "kawaii":
      // Kawaii characters have no PPT equivalent — render caption as text
      if (el.caption) {
        slide.addText(el.caption as string, {
          x: rect.x, y: rect.y, w: rect.w, h: rect.h,
          fontSize: 14, color: "666666", align: "center", valign: "middle",
        });
      }
      return;
    case "lottie":
      // Lottie animations cannot be represented in PPT — skip silently
      return;
    default:
      console.warn(`[exportPptx] Unknown element type: "${el.type}"`);
  }
}

// ---------- Scene → Slide ----------

function renderScene(
  pres: pptxgen,
  scene: VideoScene,
  primaryColor?: string,
): void {
  const slide = pres.addSlide();

  // Background
  if (scene.bgColor) {
    slide.background = { color: pptxColor(scene.bgColor) };
  }

  // Speaker notes from narration
  if (scene.narration) {
    slide.addNotes(scene.narration);
  }

  // Layout elements
  const layout = scene.layout ?? "column";
  const rects = layoutRects(scene.elements.length, layout);

  scene.elements.forEach((el, i) => {
    const rect = rects[i];
    if (!rect) return;
    renderElement(slide, el, rect);
  });

  // If the scene is entirely empty (e.g., only lottie/kawaii that were skipped),
  // add a subtle centered label so the slide isn't blank.
  void primaryColor; // reserved for future theme pass-through
}

// ---------- Public API ----------

export async function exportToPptx(script: VideoScript): Promise<void> {
  console.group("[exportPptx] Generating PPTX");
  console.log("[exportPptx] Scenes:", script.scenes.length);

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "React-Motion";
  pres.title = script.title;
  pres.subject = script.narrative ?? "";

  // Theme
  const primaryColor = script.theme?.primaryColor;
  if (script.theme?.fontFamily) {
    pres.theme = { headFontFace: script.theme.fontFamily, bodyFontFace: script.theme.fontFamily };
  }

  // Render each scene as a slide
  script.scenes.forEach((scene) => {
    renderScene(pres, scene, primaryColor);
  });

  // Trigger download
  const fileName = `${script.title || "presentation"}.pptx`;
  await pres.writeFile({ fileName });

  console.log("[exportPptx] Download triggered:", fileName);
  console.groupEnd();
}
