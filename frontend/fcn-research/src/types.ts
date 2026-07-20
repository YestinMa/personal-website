export type FilterValue = string | number;

export interface FilterOption {
  value: FilterValue;
  label: string;
}

export interface FilterDefinition {
  label: string;
  values: Array<FilterValue | FilterOption>;
  default: FilterValue;
}

export interface SeriesDefinition {
  name: string;
  filter?: Record<string, FilterValue>;
  data: Array<number | [string | number, number] | [number, number, number]>;
}

export interface ChartPayload {
  schema_version: number;
  chart_id: string;
  chart_type: "line" | "bar" | "heatmap" | "surface3d";
  title: string;
  description: string;
  axes: Record<string, { label: string; unit: string }>;
  filters: Record<string, FilterDefinition>;
  series: SeriesDefinition[];
  metadata: { experiment?: string; generated_at?: string };
  x?: number[];
  y?: number[];
  bins?: Array<{ start: number; end: number; center: number }>;
}

export interface ManifestChart {
  chart_id: string;
  chart_type: ChartPayload["chart_type"];
  title: string;
  description: string;
  file: string;
}

export interface Manifest {
  schema_version: number;
  generated_at?: string;
  charts: ManifestChart[];
}
