import type { EChartsOption } from "echarts";
import type { ChartPayload, FilterValue, SeriesDefinition } from "./types";

export type ActiveFilters = Record<string, string>;

const COLORS = ["#12253f", "#b4533c", "#5f7c72", "#c59742", "#765d82", "#44779d", "#8f6454", "#65706f"];

export function matchesFilters(series: SeriesDefinition, filters: ActiveFilters): boolean {
  return Object.entries(filters).every(([key, value]) => series.filter?.[key] === undefined || String(series.filter[key]) === value);
}

function axisName(axis?: { label: string; unit: string }): string {
  if (!axis) return "";
  return axis.unit ? `${axis.label} (${axis.unit})` : axis.label;
}

function numericText(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(value ?? "");
}

function toolbox() {
  return { right: 10, feature: { dataZoom: {}, restore: {}, saveAsImage: { pixelRatio: 2 } } };
}

export function buildChartOption(payload: ChartPayload, filters: ActiveFilters): EChartsOption {
  const visible = payload.series.filter((series) => matchesFilters(series, filters));

  if (payload.chart_type === "surface3d") {
    const data = (visible[0]?.data ?? []) as [number, number, number][];
    const values = data.map((point) => point[2]);
    return {
      tooltip: { formatter: (params: unknown) => {
        const value = (params as { value?: number[] }).value ?? [];
        return `${axisName(payload.axes.x)}: ${value[0]}<br>${axisName(payload.axes.y)}: ${value[1]}<br>${axisName(payload.axes.z)}: ${numericText(value[2])}`;
      } },
      visualMap: { min: Math.min(...values), max: Math.max(...values), dimension: 2, calculable: true, right: 0, top: 48, inRange: { color: ["#e8e2d5", "#66889c", "#12253f", "#b4533c"] } },
      xAxis3D: { type: "value", name: axisName(payload.axes.x) },
      yAxis3D: { type: "value", name: axisName(payload.axes.y) },
      zAxis3D: { type: "value", name: axisName(payload.axes.z) },
      grid3D: { left: 0, right: 100, top: 10, bottom: 5, boxWidth: 130, boxDepth: 88, viewControl: { projection: "perspective", autoRotate: false, distance: 190 }, light: { main: { intensity: 1.1 }, ambient: { intensity: 0.45 } } },
      series: [{ name: visible[0]?.name, type: "surface", data, shading: "lambert", wireframe: { show: false }, itemStyle: { opacity: 0.96 } }],
    } as EChartsOption;
  }

  if (payload.chart_type === "heatmap") {
    const data = (visible[0]?.data ?? []) as [number, number, number][];
    const values = data.map((point) => point[2]);
    return {
      animation: false,
      tooltip: { position: "top", formatter: (params: unknown) => {
        const value = (params as { value?: number[] }).value ?? [];
        return `KO: ${value[0]} bp<br>KI: ${value[1]} bp<br>${visible[0]?.name}: ${numericText(value[2])}`;
      } },
      toolbox: toolbox(),
      grid: { left: 72, right: 95, top: 58, bottom: 76 },
      xAxis: { type: "category", name: axisName(payload.axes.x), data: payload.x, splitArea: { show: true } },
      yAxis: { type: "category", name: axisName(payload.axes.y), data: payload.y, splitArea: { show: true } },
      dataZoom: [{ type: "inside", xAxisIndex: 0 }, { type: "slider", xAxisIndex: 0, bottom: 20 }, { type: "inside", yAxisIndex: 0 }],
      visualMap: { min: Math.min(...values), max: Math.max(...values), calculable: true, right: 5, top: "middle", inRange: { color: ["#eee9df", "#8ba2ad", "#12253f", "#b4533c"] } },
      series: [{ name: visible[0]?.name, type: "heatmap", data, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,.25)" } } }],
    };
  }

  if (payload.chart_type === "bar") {
    const labels = (payload.bins ?? []).map((bin) => numericText(bin.center));
    return {
      color: COLORS,
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 6 },
      toolbox: toolbox(),
      grid: { left: 70, right: 28, top: 65, bottom: 82 },
      xAxis: { type: "category", name: axisName(payload.axes.x), data: labels, axisLabel: { hideOverlap: true } },
      yAxis: { type: "value", name: axisName(payload.axes.y) },
      dataZoom: [{ type: "inside" }, { type: "slider", bottom: 24 }],
      series: visible.map((series) => ({ name: series.name, type: "bar", data: series.data, barGap: "-20%", emphasis: { focus: "series" } })),
    };
  }

  const hasErrorSeries = payload.chart_id.startsWith("pricing-") && visible.some((series) => series.name === "MC − FFT");
  return {
    color: COLORS,
    tooltip: { trigger: "axis", valueFormatter: (value: unknown) => numericText(value) },
    legend: { type: "scroll", top: 5, left: 8, right: 180 },
    toolbox: toolbox(),
    grid: { left: 76, right: hasErrorSeries ? 76 : 28, top: 72, bottom: 82 },
    xAxis: { type: payload.axes.x?.unit === "date" ? "time" : "value", name: axisName(payload.axes.x), nameLocation: "middle", nameGap: 48 },
    yAxis: hasErrorSeries
      ? [{ type: "value", name: axisName(payload.axes.y) }, { type: "value", name: "MC − FFT (USD)", splitLine: { show: false } }]
      : { type: "value", name: axisName(payload.axes.y) },
    dataZoom: [{ type: "inside", filterMode: "none" }, { type: "slider", bottom: 24, filterMode: "none" }],
    series: visible.map((series, index) => ({
      name: series.name,
      type: "line",
      showSymbol: series.data.length < 120,
      symbolSize: 5,
      sampling: "lttb",
      yAxisIndex: hasErrorSeries && series.name === "MC − FFT" ? 1 : 0,
      lineStyle: { width: 2, type: series.name === "MC − FFT" ? "dashed" : "solid" },
      emphasis: { focus: "series" },
      data: series.data,
      z: visible.length - index,
    })),
  };
}

export function defaultFilters(payload: ChartPayload): ActiveFilters {
  return Object.fromEntries(Object.entries(payload.filters).map(([key, definition]) => [key, String(definition.default as FilterValue)]));
}
