import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { buildChartOption, defaultFilters, type ActiveFilters } from "./chartOptions";
import { fetchChart } from "./dataClient";
import type { ChartPayload, FilterOption, ManifestChart } from "./types";

interface Props { chart: ManifestChart; index: number; }

function EChart({ payload, filters }: { payload: ChartPayload; filters: ActiveFilters }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const option = useMemo(() => buildChartOption(payload, filters), [payload, filters]);

  useEffect(() => {
    if (!nodeRef.current) return;
    let disposed = false;
    let instance: echarts.ECharts | undefined;
    let observer: ResizeObserver | undefined;
    const mount = async () => {
      // 三维扩展体积较大，只在 Greek 曲面进入视口后加载。
      if (payload.chart_type === "surface3d") await import("echarts-gl");
      if (disposed || !nodeRef.current) return;
      instance = echarts.init(nodeRef.current, undefined, { renderer: "canvas" });
      instance.setOption(option, true);
      observer = new ResizeObserver(() => instance?.resize());
      observer.observe(nodeRef.current);
    };
    void mount();
    return () => {
      disposed = true;
      observer?.disconnect();
      instance?.dispose();
    };
  }, [option]);

  return <div className={`chart-canvas ${payload.chart_type === "surface3d" ? "is-surface" : ""}`} ref={nodeRef} role="img" aria-label={payload.description} />;
}

export function ChartCard({ chart, index }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(index < 2);
  const [retry, setRetry] = useState(0);
  const [payload, setPayload] = useState<ChartPayload | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (enabled || !sectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setEnabled(true); observer.disconnect(); }
    }, { rootMargin: "500px 0px" });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setError(null);
    fetchChart(chart.chart_id, controller.signal)
      .then((data) => { setPayload(data); setFilters(defaultFilters(data)); })
      .catch((reason: Error) => { if (reason.name !== "AbortError") setError(reason.message); });
    return () => controller.abort();
  }, [chart.chart_id, enabled, retry]);

  return (
    <section className="chart-section" ref={sectionRef} aria-labelledby={`${chart.chart_id}-title`}>
      <div className="chart-heading">
        <span className="chart-number">{String(index + 1).padStart(2, "0")}</span>
        <div><h2 id={`${chart.chart_id}-title`}>{chart.title}</h2><p>{chart.description}</p></div>
      </div>
      <div className="chart-frame">
        {payload && Object.keys(payload.filters).length > 0 && (
          <div className="chart-filters" aria-label={`${payload.title}筛选器`}>
            {Object.entries(payload.filters).map(([key, definition]) => (
              <label key={key}>
                <span>{definition.label}</span>
                <select value={filters[key] ?? String(definition.default)} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}>
                  {definition.values.map((raw) => {
                    const option = typeof raw === "object" ? raw as FilterOption : { value: raw, label: typeof raw === "number" && key === "r0" ? `${(raw * 100).toFixed(0)}%` : String(raw).toUpperCase() };
                    return <option key={String(option.value)} value={String(option.value)}>{option.label}</option>;
                  })}
                </select>
              </label>
            ))}
          </div>
        )}
        {!enabled || (!payload && !error) ? <div className="chart-skeleton" aria-label="图表加载中"><span /></div> : null}
        {error ? <div className="chart-error"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>重新加载</button></div> : null}
        {payload ? <EChart payload={payload} filters={filters} /> : null}
      </div>
    </section>
  );
}
