// --- Input from CFML host app ---

export type MountConfig = {
  data?: BusinessData;
  options?: WidgetOptions;
};

export type WidgetOptions = {
  lang?: "en" | "zh";
  theme?: "corporate" | "modern" | "minimal";
};

// Optional structured data — CFML host may pass this for richer context.
// If not provided, AI extracts everything from the user's prompt.
export type BusinessData = {
  title?: string;
  rows?: Record<string, unknown>[];
  columns?: ColumnDef[];
  aggregations?: Aggregation[];
  chartConfig?: ChartConfig;
};

export type ColumnDef = {
  key: string;
  label: string;
  type: "string" | "number" | "date";
};

export type Aggregation = {
  column: string;
  operation: "count" | "sum" | "avg" | "min" | "max";
  groupBy?: string;
  result: Record<string, number>;
};

export type ChartConfig = {
  type: "bar" | "line" | "pie" | "table";
  xAxis?: string;
  yAxis?: string;
  data: Record<string, unknown>[];
};
