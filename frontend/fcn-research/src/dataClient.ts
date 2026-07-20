import type { ChartPayload, Manifest } from "./types";

export function isStaticMode(): boolean {
  return Boolean(window.FCN_RESEARCH_STATIC);
}

export function resolveDataUrl(resource: "manifest" | string, staticMode = isStaticMode()): string {
  if (staticMode) return resource === "manifest" ? "./data/manifest.json" : `./data/${encodeURIComponent(resource)}.json`;
  return resource === "manifest" ? "/api/v1/charts" : `/api/v1/charts/${encodeURIComponent(resource)}`;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`数据请求失败（${response.status}）`);
  return response.json() as Promise<T>;
}

export const fetchManifest = (signal?: AbortSignal) => getJson<Manifest>(resolveDataUrl("manifest"), signal);
export const fetchChart = (chartId: string, signal?: AbortSignal) => getJson<ChartPayload>(resolveDataUrl(chartId), signal);
