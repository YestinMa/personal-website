import { describe, expect, it } from "vitest";
import { buildChartOption, defaultFilters, matchesFilters } from "./chartOptions";
import type { ChartPayload } from "./types";

const payload: ChartPayload = {
  schema_version: 1, chart_id: "test", chart_type: "line", title: "Test", description: "Test chart",
  axes: { x: { label: "Date", unit: "date" }, y: { label: "PnL", unit: "USD" } },
  filters: { method: { label: "Method", values: ["mc", "fft"], default: "fft" } },
  series: [{ name: "MC", filter: { method: "mc" }, data: [["2026-01-01", 1]] }, { name: "FFT", filter: { method: "fft" }, data: [["2026-01-01", 2]] }],
  metadata: {},
};

describe("chart options", () => {
  it("uses payload defaults and filters series", () => {
    expect(defaultFilters(payload)).toEqual({ method: "fft" });
    expect(matchesFilters(payload.series[0], { method: "fft" })).toBe(false);
    expect(matchesFilters(payload.series[1], { method: "fft" })).toBe(true);
  });
  it("builds an interactive line chart", () => {
    const option = buildChartOption(payload, { method: "fft" });
    expect(option.tooltip).toBeTruthy();
    expect(option.legend).toBeTruthy();
    expect(option.dataZoom).toBeTruthy();
    expect((option.series as Array<{ name: string }>)[0].name).toBe("FFT");
  });
});
