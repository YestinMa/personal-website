const state = {
  summary: null,
  factors: [],
  jobs: [],
  status: null,
  portfolioBacktests: [],
  selectedPortfolioRunId: null,
  portfolioDetail: null,
  selectedFactor: null,
  currentView: "overview",
  chartData: {
    ic: [],
    group: { columns: [], series: [] },
    lsRaw: [],
    ls: [],
  },
  ranges: {
    ic: { start: 0, end: 0 },
    ls: { start: 0, end: 0 },
  },
  factorTable: {
    statusFilter: "all",
    sortBy: "lifecycle_status",
    sortDir: "desc",
    collapsed: true,
    metricFilters: {
      rolling_annual_return: { min: "", max: "" },
      rolling_vol: { min: "", max: "" },
      rolling_sharpe: { min: "", max: "" },
      rolling_win_rate: { min: "", max: "" },
      rolling_ic_mean: { min: "", max: "" },
      rolling_icir: { min: "", max: "" },
    },
  },
  selectedIcSeries: "ic_22",
};

const STATIC_MODE = Boolean(window.FACTOR_DASHBOARD_STATIC);
const VIEW_META = {
  overview: {
    title: "因子总览 <span>Factor Overview</span>",
    subtitle: "聚焦因子表现、分组收益与区间收益分析",
  },
  status: {
    title: "任务与数据状态 <span>Task & Data Status</span>",
    subtitle: "聚焦日更任务、最近运行结果与数据新鲜度",
  },
  portfolio: {
    title: "组合回测 <span>Portfolio Backtests</span>",
    subtitle: "查看历史组合回测、参数配置与组合净值表现",
  },
};

let lsAnalysisToken = 0;
let lsAnalysisTimer = null;
let toastTimer = null;

const fmt = (value, digits = 3) => (value === null || value === undefined || Number.isNaN(Number(value)) ? "--" : Number(value).toFixed(digits));
const pct = (value, digits = 1) => (value === null || value === undefined || Number.isNaN(Number(value)) ? "--" : `${(Number(value) * 100).toFixed(digits)}%`);
const numericOrNaN = (value) => (value === null || value === undefined || value === "" ? NaN : Number(value));
const displayText = (value) => (value === null || value === undefined || value === "" ? "--" : String(value));
const cssNum = (value) => {
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) return "num";
  return n > 0 ? "num pos" : "num neg";
};
const METRIC_FILTER_CONFIG = [
  { key: "rolling_annual_return", minId: "filterRollingAnnualReturnMin", maxId: "filterRollingAnnualReturnMax", valueScale: 1 },
  { key: "rolling_vol", minId: "filterRollingVolMin", maxId: "filterRollingVolMax", valueScale: 1 },
  { key: "rolling_sharpe", minId: "filterRollingSharpeMin", maxId: "filterRollingSharpeMax", valueScale: 1 },
  { key: "rolling_win_rate", minId: "filterRollingWinRateMin", maxId: "filterRollingWinRateMax", valueScale: 0.01 },
  { key: "rolling_ic_mean", minId: "filterRollingIcMeanMin", maxId: "filterRollingIcMeanMax", valueScale: 1 },
  { key: "rolling_icir", minId: "filterRollingIcirMin", maxId: "filterRollingIcirMax", valueScale: 1 },
];

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text ?? "--";
}

function setHtml(id, html) {
  const node = document.getElementById(id);
  if (node) node.innerHTML = html;
}

function dataPath(path) {
  return `./data/${path}`;
}

function factorKey(factorName) {
  return encodeURIComponent(factorName || "");
}

function getSeriesDate(item) {
  return item?.trade_date || item?.date || "";
}

function getDisplayFactorValueDate(item) {
  return item?.latest_factor_value_date || item?.latest_metric_date || "--";
}

function getSelectedFactorMeta() {
  return state.factors.find((item) => item.factor_name === state.selectedFactor) || null;
}

function getSelectedPortfolioMeta() {
  return state.portfolioBacktests.find((item) => item.run_id === state.selectedPortfolioRunId) || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "--";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function renderKvGrid(targetId, items, emptyText) {
  const node = document.getElementById(targetId);
  if (!node) return;
  if (!(items || []).length) {
    node.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    return;
  }
  node.innerHTML = items.map((item) => `
    <div class="kv-card ${item.compactList ? "compact-list" : ""}">
      <span>${escapeHtml(toTitleLabel(item.label))}</span>
      <strong>${escapeHtml(stringifyValue(item.value))}</strong>
    </div>
  `).join("");
}

function toTitleLabel(key) {
  return String(key || "")
    .replaceAll("_", " ")
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function renderReportSummaryChips(targetId, items) {
  const node = document.getElementById(targetId);
  if (!node) return;
  node.innerHTML = (items || [])
    .map((item) => `
      <div class="report-summary-chip">
        <span>${escapeHtml(item.label)}</span>
        <strong class="${item.tone || "num"}">${escapeHtml(item.value)}</strong>
      </div>
    `)
    .join("");
}

function createJobRow(title, status, detail) {
  return `
    <div class="job-item-row">
      <strong>${escapeHtml(title)}</strong>
      <span class="badge ${escapeHtml(status || "skipped")}">${escapeHtml(status || "--")}</span>
      <span class="job-detail">${escapeHtml(detail || "--")}</span>
    </div>
  `;
}

function getDataLayerItems(dataLayer) {
  return [
    ...(dataLayer.daily_update || []).map((item) => ({ ...item, source_label: "daily_update", item_name: item.table_name })),
    ...(dataLayer.financial_events || []).map((item) => ({ ...item, source_label: "financial_events", item_name: item.table_name || item.name })),
    ...(dataLayer.backfill || []).map((item) => ({ ...item, source_label: "backfill", item_name: item.table_name || item.name })),
  ];
}

function setMetricFilterCollapsed(collapsed) {
  state.factorTable.collapsed = collapsed;
  const bar = document.getElementById("metricFilterBar");
  const body = document.getElementById("metricFilterBody");
  const button = document.getElementById("metricFilterToggleBtn");
  if (!bar || !body || !button) return;
  bar.classList.toggle("is-collapsed", collapsed);
  body.hidden = collapsed;
  button.setAttribute("aria-expanded", collapsed ? "false" : "true");
  button.textContent = collapsed ? "筛选" : "收起";
  button.title = collapsed ? "展开指标筛选" : "收起指标筛选";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 1800);
}

function updatePageHeader() {
  const meta = VIEW_META[state.currentView] || VIEW_META.overview;
  setHtml("pageTitle", meta.title);
  setText("pageSubtitle", meta.subtitle);
}

function updateToolbarVisibility() {
  const actions = document.querySelector(".top-actions");
  if (!actions) return;
  actions.classList.toggle("is-hidden", state.currentView !== "overview");
}

function switchView(nextView) {
  state.currentView = nextView;
  document.querySelectorAll(".view-section").forEach((section) => {
    const active = section.id === `${nextView}View`;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  document.querySelectorAll("nav a[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === nextView);
  });
  updatePageHeader();
  updateToolbarVisibility();
  window.requestAnimationFrame(() => {
    renderIcChart();
    renderGroupChart();
    renderLongShortChart();
    renderPortfolioChart();
  });
}

function setRangeBackground(chartKey) {
  const bar = document.querySelector(`.range-control[data-chart="${chartKey}"] .dual-range`);
  if (!bar) return;
  const range = state.ranges[chartKey];
  const list = chartKey === "ls" ? state.chartData.lsRaw : state.chartData[chartKey];
  const length = Array.isArray(list) ? list.length : 0;
  if (!length) {
    bar.style.background = "linear-gradient(#d8d5cf, #d8d5cf) center / 100% 2px no-repeat";
    return;
  }
  const startPct = (Math.min(range.start, range.end) / Math.max(1, length - 1)) * 100;
  const endPct = (Math.max(range.start, range.end) / Math.max(1, length - 1)) * 100;
  bar.style.background = `linear-gradient(to right,
    #d8d5cf 0%,
    #d8d5cf ${startPct}%,
    var(--blue) ${startPct}%,
    var(--blue) ${endPct}%,
    #d8d5cf ${endPct}%,
    #d8d5cf 100%) center / 100% 2px no-repeat`;
}

function normalizeRange(chartKey) {
  const list = chartKey === "ls" ? state.chartData.lsRaw : state.chartData[chartKey];
  const max = Math.max(0, (list?.length || 0) - 1);
  const range = state.ranges[chartKey];
  let start = Number.isFinite(range.start) ? Math.floor(range.start) : 0;
  let end = Number.isFinite(range.end) ? Math.floor(range.end) : max;
  start = Math.max(0, Math.min(start, max));
  end = Math.max(0, Math.min(end, max));
  if (start > end) [start, end] = [end, start];
  state.ranges[chartKey] = { start, end };
  return state.ranges[chartKey];
}

function setRangeLabel(chartKey) {
  const label = document.getElementById(`${chartKey}RangeLabel`);
  const list = chartKey === "ls" ? state.chartData.lsRaw : state.chartData[chartKey];
  if (!label) return;
  if (!list?.length) {
    label.textContent = "--";
    return;
  }
  const range = normalizeRange(chartKey);
  label.textContent = `${getSeriesDate(list[range.start])} ~ ${getSeriesDate(list[range.end])}`;
}

function setRangeInputs(chartKey) {
  const list = chartKey === "ls" ? state.chartData.lsRaw : state.chartData[chartKey];
  const max = Math.max(0, (list?.length || 0) - 1);
  const startInput = document.getElementById(`${chartKey}RangeStart`);
  const endInput = document.getElementById(`${chartKey}RangeEnd`);
  if (!startInput || !endInput) return;

  startInput.max = String(max);
  endInput.max = String(max);
  startInput.min = "0";
  endInput.min = "0";

  if (!list?.length) {
    startInput.value = "0";
    endInput.value = "0";
    startInput.disabled = true;
    endInput.disabled = true;
    state.ranges[chartKey] = { start: 0, end: 0 };
    setRangeLabel(chartKey);
    setRangeBackground(chartKey);
    return;
  }

  startInput.disabled = false;
  endInput.disabled = false;
  const current = normalizeRange(chartKey);
  startInput.value = String(current.start);
  endInput.value = String(current.end);
  setRangeLabel(chartKey);
  setRangeBackground(chartKey);
}

function mergeIC(ic1, ic5, ic22) {
  const out = {};
  const readValue = (value) => (value === null || value === undefined || value === "" ? NaN : Number(value));
  [ic1, ic5, ic22].forEach((arr, idx) => {
    const key = idx === 0 ? "ic_1" : idx === 1 ? "ic_5" : "ic_22";
    const cumulativeKey = idx === 0 ? "cum_ic_1" : idx === 1 ? "cum_ic_5" : "cum_ic_22";
    (arr || []).forEach((row) => {
      const d = row.date;
      out[d] = out[d] || {
        trade_date: d,
        ic_1: NaN,
        ic_5: NaN,
        ic_22: NaN,
        cum_ic_1: NaN,
        cum_ic_5: NaN,
        cum_ic_22: NaN,
      };
      out[d][key] = readValue(row.value);
      out[d][cumulativeKey] = readValue(row.cumulative_value);
    });
  });
  return Object.values(out).sort((a, b) => String(a.trade_date).localeCompare(String(b.trade_date)));
}

function setupCanvas(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(box.width));
  const height = Math.max(220, Math.floor(box.height));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

function drawLineChart(canvasId, seriesList, options = {}) {
  const canvas = document.getElementById(canvasId);
  const { ctx, width, height } = setupCanvas(canvas);
  const legendItems = (seriesList || []).filter((item) => item?.name);
  const hasLegend = legendItems.length > 0;
  const padding = { left: 52, right: 20, top: hasLegend ? 64 : 30, bottom: 34 };
  const allPoints = seriesList.flatMap((s) => s.points || []).filter((p) => Number.isFinite(p.value));
  if (!allPoints.length) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#716f69";
    ctx.font = "14px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText(options.emptyText || "暂无可展示数据", width / 2, height / 2);
    return;
  }

  const values = allPoints.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (options.zeroLine) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const xFor = (i, n) => padding.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yFor = (v) => padding.top + (1 - (v - min) / (max - min)) * plotH;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#d8d5cf";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#716f69";
  ctx.font = "12px Segoe UI, Arial";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (i / 4) * plotH;
    const value = max - (i / 4) * (max - min);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(options.percent ? `${(value * 100).toFixed(0)}%` : value.toFixed(2), padding.left - 8, y + 4);
  }

  if (options.highlightRange && allPoints.length > 1) {
    const range = options.highlightRange;
    const refSeries = seriesList.find((item) => item.name === range.seriesName) || seriesList[0];
    const points = refSeries.points || [];
    const startIdx = points.findIndex((point) => point.date === range.startDate);
    const endIdx = points.findIndex((point) => point.date === range.endDate);
    if (startIdx >= 0 && endIdx >= 0 && endIdx >= startIdx) {
      const xStart = xFor(startIdx, points.length);
      const xEnd = xFor(endIdx, points.length);
      ctx.fillStyle = "rgba(229, 83, 83, 0.10)";
      ctx.fillRect(xStart, padding.top, xEnd - xStart, plotH);
    }
  }

  if (options.zeroLine && min < 0 && max > 0) {
    const y = yFor(0);
    ctx.strokeStyle = "#bbb8b1";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  seriesList.forEach((series) => {
    const points = (series.points || []).filter((p) => Number.isFinite(p.value));
    if (!points.length) return;
    ctx.strokeStyle = series.color;
    ctx.lineWidth = series.lineWidth || 2;
    ctx.setLineDash(series.dash ? [6, 5] : []);
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i, points.length);
      const y = yFor(p.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  });

  if (options.markers) {
    const markerSeries = seriesList.find((item) => item.name === options.markers.seriesName) || seriesList[0];
    const points = markerSeries.points || [];
    options.markers.items.forEach((marker) => {
      const idx = points.findIndex((point) => point.date === marker.date);
      if (idx < 0) return;
      const point = points[idx];
      if (!Number.isFinite(point.value)) return;
      const x = xFor(idx, points.length);
      const y = yFor(point.value);
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = marker.color;
      ctx.textAlign = "left";
      ctx.fillText(marker.label, Math.min(width - padding.right - 32, x + 6), Math.max(padding.top + 12, y - 8));
    });
  }

  const longestSeries = seriesList.reduce((best, item) => ((item.points || []).length > (best.points || []).length ? item : best), { points: [] });
  const first = longestSeries.points[0]?.date;
  const last = longestSeries.points[longestSeries.points.length - 1]?.date;
  ctx.fillStyle = "#716f69";
  ctx.textAlign = "left";
  ctx.fillText(first || "", padding.left, height - 10);
  ctx.textAlign = "right";
  ctx.fillText(last || "", width - padding.right, height - 10);

  let legendX = padding.left + 12;
  const legendY = 34;
  legendItems.forEach((series) => {
    ctx.strokeStyle = series.color;
    ctx.lineWidth = series.lineWidth || 2;
    ctx.setLineDash(series.dash ? [6, 5] : []);
    ctx.beginPath();
    ctx.moveTo(legendX, legendY);
    ctx.lineTo(legendX + 22, legendY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(series.name || "", legendX + 28, legendY + 5);
    legendX += 24 + ctx.measureText(series.name || "").width + 18;
  });
}

function drawIcComboChart(canvasId, seriesList, options = {}) {
  const canvas = document.getElementById(canvasId);
  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { left: 56, right: 60, top: 30, bottom: 34 };
  const barPoints = seriesList.flatMap((s) => s.barPoints || []).filter((p) => Number.isFinite(p.value));
  const linePoints = seriesList.flatMap((s) => s.linePoints || []).filter((p) => Number.isFinite(p.value));
  if (!barPoints.length && !linePoints.length) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#716f69";
    ctx.font = "14px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText(options.emptyText || "暂无可展示数据", width / 2, height / 2);
    return;
  }

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const barValues = barPoints.map((p) => p.value);
  let leftMin = barValues.length ? Math.min(...barValues, 0) : -1;
  let leftMax = barValues.length ? Math.max(...barValues, 0) : 1;
  if (leftMin === leftMax) {
    leftMin -= 1;
    leftMax += 1;
  }
  const leftSpan = leftMax - leftMin;
  leftMin -= leftSpan * 0.08;
  leftMax += leftSpan * 0.08;

  const lineValues = linePoints.map((p) => p.value);
  let rightMin = lineValues.length ? Math.min(...lineValues) : -1;
  let rightMax = lineValues.length ? Math.max(...lineValues) : 1;
  if (rightMin === rightMax) {
    rightMin -= 1;
    rightMax += 1;
  }
  const rightSpan = rightMax - rightMin;
  rightMin -= rightSpan * 0.08;
  rightMax += rightSpan * 0.08;

  const longestSeries = seriesList.reduce((best, item) => {
    const currentLength = Math.max((item.barPoints || []).length, (item.linePoints || []).length);
    const bestLength = Math.max((best.barPoints || []).length, (best.linePoints || []).length);
    return currentLength > bestLength ? item : best;
  }, { barPoints: [], linePoints: [] });
  const refPoints = longestSeries.barPoints?.length ? longestSeries.barPoints : (longestSeries.linePoints || []);
  const xFor = (i, n) => padding.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yLeft = (v) => padding.top + (1 - (v - leftMin) / (leftMax - leftMin)) * plotH;
  const yRight = (v) => padding.top + (1 - (v - rightMin) / (rightMax - rightMin)) * plotH;
  const zeroY = yLeft(0);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#d8d5cf";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#716f69";
  ctx.font = "12px Segoe UI, Arial";
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (i / 4) * plotH;
    const leftValue = leftMax - (i / 4) * (leftMax - leftMin);
    const rightValue = rightMax - (i / 4) * (rightMax - rightMin);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(leftValue.toFixed(2), padding.left - 8, y + 4);
    ctx.textAlign = "left";
    ctx.fillText(rightValue.toFixed(2), width - padding.right + 8, y + 4);
  }

  if (leftMin < 0 && leftMax > 0) {
    ctx.strokeStyle = "#bbb8b1";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const groupCount = Math.max(1, seriesList.length);
  const step = refPoints.length > 1 ? plotW / (refPoints.length - 1) : plotW;
  const barWidth = Math.max(6, Math.min(22, step / Math.max(2, groupCount + 1)));

  seriesList.forEach((series, seriesIdx) => {
    const bars = (series.barPoints || []).filter((p) => Number.isFinite(p.value));
    ctx.fillStyle = series.barColor || series.color;
    bars.forEach((point, idx) => {
      const baseX = xFor(idx, refPoints.length);
      const offset = (seriesIdx - (groupCount - 1) / 2) * (barWidth + 2);
      const x = baseX + offset - barWidth / 2;
      const y = yLeft(point.value);
      const top = Math.min(y, zeroY);
      const barHeight = Math.max(1, Math.abs(y - zeroY));
      ctx.globalAlpha = 0.82;
      ctx.fillRect(x, top, barWidth, barHeight);
      ctx.globalAlpha = 1;
    });
  });

  seriesList.forEach((series) => {
    const points = (series.linePoints || []).filter((p) => Number.isFinite(p.value));
    if (!points.length) return;
    ctx.strokeStyle = series.lineColor || series.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    points.forEach((point, idx) => {
      const x = xFor(idx, refPoints.length);
      const y = yRight(point.value);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  const first = refPoints[0]?.date;
  const last = refPoints[refPoints.length - 1]?.date;
  ctx.fillStyle = "#716f69";
  ctx.textAlign = "left";
  ctx.fillText(first || "", padding.left, height - 10);
  ctx.textAlign = "right";
  ctx.fillText(last || "", width - padding.right, height - 10);

  let legendX = padding.left;
  seriesList.forEach((series) => {
    const barColor = series.barColor || series.color;
    const lineColor = series.lineColor || series.color;
    ctx.fillStyle = barColor;
    ctx.globalAlpha = 0.82;
    ctx.fillRect(legendX, 9, 12, 10);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(legendX + 18, 14);
    ctx.lineTo(legendX + 34, 14);
    ctx.stroke();
    const label = series.legendLabel || `${series.name} / Cum`;
    ctx.fillStyle = "#716f69";
    ctx.textAlign = "left";
    ctx.fillText(label, legendX + 40, 18);
    legendX += 36 + ctx.measureText(label).width + 18;
  });
}

function samplePointsByDensity(points, maxPoints) {
  const safePoints = Array.isArray(points) ? points : [];
  if (safePoints.length <= maxPoints || maxPoints <= 0) return safePoints;
  const step = Math.ceil(safePoints.length / maxPoints);
  const sampled = safePoints.filter((_, idx) => idx % step === 0);
  const last = safePoints[safePoints.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

function getIcSamplingLimit(totalPoints) {
  const chartBox = document.querySelector(".ic-panel .chart-box");
  const width = Math.max(320, Math.floor(chartBox?.getBoundingClientRect().width || 640));
  const maxPoints = Math.max(28, Math.floor(width / 8));
  return Math.min(totalPoints, maxPoints);
}

function computeStaticAnalysis(rawSeries, startIdx, endIdx) {
  const max = Math.max(0, rawSeries.length - 1);
  const safeStart = Math.max(0, Math.min(max, startIdx ?? 0));
  const safeEnd = Math.max(0, Math.min(max, endIdx ?? max));
  const [start, end] = safeStart <= safeEnd ? [safeStart, safeEnd] : [safeEnd, safeStart];
  const window = rawSeries.slice(start, end + 1);
  const normalize = (field) => {
    const first = window.find((item) => Number.isFinite(Number(item[field])));
    const base = first ? Number(first[field]) : NaN;
    return window.map((item) => {
      const value = Number(item[field]);
      return {
        date: item.date,
        value: Number.isFinite(value) && Number.isFinite(base) && base !== 0 ? value / base : null,
      };
    });
  };
  const long = normalize("long_value");
  const short = normalize("short_value");
  const longShort = normalize("long_short_value");
  const lsValues = longShort.filter((item) => Number.isFinite(Number(item.value)));
  let annualReturn = null;
  let annualVolatility = null;
  let maxDrawdown = null;
  let range = null;
  if (lsValues.length) {
    const navs = lsValues.map((item) => Number(item.value));
    if (navs.length > 1) {
      annualReturn = navs[navs.length - 1] ** (252 / (navs.length - 1)) - 1;
      const returns = [];
      for (let idx = 1; idx < navs.length; idx += 1) {
        returns.push(navs[idx] / navs[idx - 1] - 1);
      }
      if (returns.length) {
        const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
        const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
        annualVolatility = Math.sqrt(variance) * Math.sqrt(252);
      }
    }
    let runningMax = -Infinity;
    let peakIdx = 0;
    let troughIdx = 0;
    let worst = 0;
    navs.forEach((nav, idx) => {
      if (nav > runningMax) {
        runningMax = nav;
        peakIdx = idx;
      }
      const drawdown = nav / runningMax - 1;
      if (drawdown < worst) {
        worst = drawdown;
        troughIdx = idx;
      }
    });
    maxDrawdown = worst;
    let actualPeakIdx = 0;
    let peakValue = -Infinity;
    for (let idx = 0; idx <= troughIdx; idx += 1) {
      if (navs[idx] >= peakValue) {
        peakValue = navs[idx];
        actualPeakIdx = idx;
      }
    }
    let recoveryDate = null;
    for (let idx = troughIdx; idx < navs.length; idx += 1) {
      if (navs[idx] >= peakValue) {
        recoveryDate = lsValues[idx].date;
        break;
      }
    }
    range = {
      peak_date: lsValues[actualPeakIdx]?.date || null,
      trough_date: lsValues[troughIdx]?.date || null,
      recovery_date: recoveryDate,
    };
  }
  return {
    series: window.map((item, idx) => ({
      date: item.date,
      long_value: long[idx]?.value ?? null,
      short_value: short[idx]?.value ?? null,
      long_short_value: longShort[idx]?.value ?? null,
    })),
    stats: {
      annual_return: annualReturn,
      annual_volatility: annualVolatility,
      max_drawdown: maxDrawdown,
      max_drawdown_range: range,
    },
  };
}

function renderSummary() {
  const s = state.summary;
  if (!s) return;
  setText("latestTradeDate", s.market_latest_trade_date || s.latest_trade_date);
  setText("latestFactorDate", s.latest_factor_date);
  setText("activeCount", s.status_counts.active || 0);
  setText("candidateCount", s.status_counts.candidate || 0);
  setText("draftCount", s.status_counts.draft || 0);
  setText("latestJobStatus", s.latest_job?.status || "--");
  setText("statusMarketTradeDate", s.market_latest_trade_date || s.latest_trade_date);
  setText("statusFactorDate", s.latest_factor_date);
  setText("statusLatestJob", s.latest_job?.status || "--");
  const latestJobStatus = document.getElementById("latestJobStatus");
  const statusLatestJob = document.getElementById("statusLatestJob");
  [latestJobStatus, statusLatestJob].forEach((node) => {
    if (!node) return;
    node.className = s.latest_job?.status || "";
  });
}

function renderFactors() {
  const tbody = document.getElementById("factorTable");
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const { statusFilter, sortBy, sortDir, metricFilters } = state.factorTable;
  const filtered = state.factors
    .filter((item) =>
      item.factor_name.toLowerCase().includes(query) ||
      (item.factor_family || "").toLowerCase().includes(query)
    )
    .filter((item) => statusFilter === "all" || item.lifecycle_status === statusFilter)
    .filter((item) => passesMetricFilters(item, metricFilters))
    .sort((left, right) => compareFactorRows(left, right, sortBy, sortDir));
  setText("factorCount", `(${filtered.length})`);
  tbody.innerHTML = filtered
    .map((item) => `
      <tr data-factor="${item.factor_name}" class="${state.selectedFactor === item.factor_name ? "selected" : ""}">
        <td class="factor-name">${item.factor_name}</td>
        <td><span class="badge ${item.lifecycle_status}">${item.lifecycle_status}</span></td>
        <td>${item.version || "--"}</td>
        <td class="${cssNum(item.rolling_ic_mean)}">${fmt(item.rolling_ic_mean, 3)}</td>
        <td class="${cssNum(item.rolling_icir)}">${fmt(item.rolling_icir, 2)}</td>
        <td class="${cssNum(item.rolling_annual_return)}">${pct(item.rolling_annual_return)}</td>
        <td class="${cssNum(item.rolling_vol)}">${pct(item.rolling_vol)}</td>
        <td class="${cssNum(item.rolling_sharpe)}">${fmt(item.rolling_sharpe, 2)}</td>
        <td class="${cssNum(item.rolling_win_rate)}">${pct(item.rolling_win_rate)}</td>
        <td title="${item.latest_factor_value_date || item.latest_metric_date || "--"}">${getDisplayFactorValueDate(item)}</td>
      </tr>
    `)
    .join("");

  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => selectFactor(tr.dataset.factor));
  });
}

function passesMetricFilters(item, metricFilters) {
  return METRIC_FILTER_CONFIG.every((config) => {
    const filter = metricFilters[config.key] || {};
    const hasMin = filter.min !== "" && filter.min !== null && filter.min !== undefined;
    const hasMax = filter.max !== "" && filter.max !== null && filter.max !== undefined;
    if (!hasMin && !hasMax) return true;
    const rawValue = numericOrNaN(item[config.key]);
    if (!Number.isFinite(rawValue)) return false;
    const value = rawValue / config.valueScale;
    if (hasMin && value < Number(filter.min)) return false;
    if (hasMax && value > Number(filter.max)) return false;
    return true;
  });
}

function statusRank(status) {
  if (status === "active") return 3;
  if (status === "candidate") return 2;
  if (status === "draft") return 1;
  return 0;
}

function compareNullableNumbers(left, right) {
  const l = Number(left);
  const r = Number(right);
  const lValid = Number.isFinite(l);
  const rValid = Number.isFinite(r);
  if (!lValid && !rValid) return 0;
  if (!lValid) return -1;
  if (!rValid) return 1;
  return l - r;
}

function compareFactorRows(left, right, sortBy, sortDir) {
  let result = 0;
  if (sortBy === "lifecycle_status") {
    result = statusRank(left.lifecycle_status) - statusRank(right.lifecycle_status);
  } else if (sortBy === "factor_name") {
    result = String(left.factor_name || "").localeCompare(String(right.factor_name || ""));
  } else if (sortBy === "latest_factor_value_date") {
    result = String(left.latest_factor_value_date || left.latest_metric_date || "").localeCompare(String(right.latest_factor_value_date || right.latest_metric_date || ""));
  } else {
    result = compareNullableNumbers(left[sortBy], right[sortBy]);
  }
  if (result === 0) {
    result = String(left.factor_name || "").localeCompare(String(right.factor_name || ""));
  }
  return sortDir === "asc" ? result : -result;
}

function bindMetricFilterInputs() {
  METRIC_FILTER_CONFIG.forEach((config) => {
    const minInput = document.getElementById(config.minId);
    const maxInput = document.getElementById(config.maxId);
    const sync = () => {
      state.factorTable.metricFilters[config.key] = {
        min: minInput.value.trim(),
        max: maxInput.value.trim(),
      };
      renderFactors();
    };
    minInput.addEventListener("input", sync);
    maxInput.addEventListener("input", sync);
  });

  document.getElementById("clearMetricFiltersBtn").addEventListener("click", () => {
    METRIC_FILTER_CONFIG.forEach((config) => {
      document.getElementById(config.minId).value = "";
      document.getElementById(config.maxId).value = "";
      state.factorTable.metricFilters[config.key] = { min: "", max: "" };
    });
    renderFactors();
  });

  document.getElementById("metricFilterToggleBtn").addEventListener("click", () => {
    setMetricFilterCollapsed(!state.factorTable.collapsed);
  });

  setMetricFilterCollapsed(true);
}

function renderJobs() {
  const payload = state.status || {};
  const scheduler = payload.scheduler || {};
  const dataLayer = payload.data_layer || { summary: {} };
  const factorLayer = payload.factor_layer || { summary: {}, rolling_metrics: {} };
  const backtestLayer = payload.backtest_layer || { summary: {} };
  const dataItems = getDataLayerItems(dataLayer);
  const factorItems = factorLayer.factor_value_update || [];
  const backtestRuns = backtestLayer.runs || [];
  const schedulerBox = document.getElementById("statusScheduler");
  const dataBox = document.getElementById("statusDataLayer");
  const factorBox = document.getElementById("statusFactorLayer");
  const backtestBox = document.getElementById("statusBacktestLayer");
  schedulerBox.className = "job-items scheduler-items";
  dataBox.className = "job-items";
  factorBox.className = "job-items";
  backtestBox.className = "job-items";
  schedulerBox.innerHTML = (scheduler.stages || []).length
    ? (scheduler.stages || []).map((stage) => createJobRow(stage.stage_name, stage.status, stage.trade_date || "--")).join("")
    : "暂无调度记录";
  renderReportSummaryChips("statusDataLayerSummary", [
    { label: "success", value: dataLayer.summary?.success_table_count || 0, tone: "num" },
    { label: "failed", value: dataLayer.summary?.failed_table_count || 0, tone: "num" },
    { label: "rows_written", value: dataLayer.summary?.rows_written || 0, tone: cssNum(dataLayer.summary?.rows_written) },
    { label: "field_values_written", value: dataLayer.summary?.field_values_written || 0, tone: cssNum(dataLayer.summary?.field_values_written) },
    { label: "financial_raw_new_rows", value: dataLayer.summary?.financial_raw_new_rows || 0, tone: cssNum(dataLayer.summary?.financial_raw_new_rows) },
  ]);
  dataBox.innerHTML = dataItems.length
    ? dataItems.slice(0, 8).map((item) => createJobRow(
      `${item.item_name || "--"} · ${item.source_label || "data"}`,
      item.status,
      `${item.rows_written || 0} rows / ${item.field_values_written || 0} fields`,
    )).join("")
    : "暂无数据层报告";
  renderReportSummaryChips("statusFactorLayerSummary", [
    { label: "success", value: factorLayer.summary?.success_factor_count || 0, tone: "num" },
    { label: "failed", value: factorLayer.summary?.failed_factor_count || 0, tone: "num" },
    { label: "skipped", value: factorLayer.summary?.skipped_factor_count || 0, tone: "num" },
    { label: "rows_written", value: factorLayer.summary?.rows_written || 0, tone: cssNum(factorLayer.summary?.rows_written) },
    { label: "field_values_written", value: factorLayer.summary?.field_values_written || 0, tone: cssNum(factorLayer.summary?.field_values_written) },
  ]);
  factorBox.innerHTML = `
    ${factorItems.slice(0, 8).map((item) => createJobRow(
      item.factor_name,
      item.status,
      `${item.phase || "--"} / ${item.rows_written || 0} rows / ${item.field_values_written || 0} fields`,
    )).join("") || "暂无因子层报告"}
    ${factorLayer.rolling_metrics ? createJobRow(
      "rolling_metrics",
      factorLayer.rolling_metrics.status || "skipped",
      `${factorLayer.rolling_metrics.rows_written || 0} rows`,
    ) : ""}
  `;
  renderReportSummaryChips("statusBacktestLayerSummary", [
    { label: "success", value: backtestLayer.summary?.success_count || 0, tone: "num" },
    { label: "failed", value: backtestLayer.summary?.failed_count || 0, tone: "num" },
    { label: "running", value: backtestLayer.summary?.running_count || 0, tone: "num" },
  ]);
  backtestBox.innerHTML = backtestRuns.length
    ? backtestRuns.slice(0, 8).map((item) => createJobRow(
      item.factor_name,
      item.status,
      `${item.start_date || "--"} ~ ${item.end_date || "--"}`,
    )).join("")
    : "暂无回测层报告";
}

function renderIcChart() {
  const range = normalizeRange("ic");
  const points = (state.chartData.ic || []).slice(range.start, range.end + 1);
  const selected = document.querySelector('input[name="icHorizon"]:checked')?.value || state.selectedIcSeries || "ic_22";
  state.selectedIcSeries = selected;
  const series = [];
  const seriesMap = {
    ic_1: { label: "IC_1", barKey: "ic_1", lineKey: "cum_ic_1" },
    ic_5: { label: "IC_5", barKey: "ic_5", lineKey: "cum_ic_5" },
    ic_22: { label: "IC_22", barKey: "ic_22", lineKey: "cum_ic_22" },
  };
  const config = seriesMap[selected];
  if (config) {
    const sampledPoints = samplePointsByDensity(points, getIcSamplingLimit(points.length));
    series.push({
      name: config.label,
      color: "#243f63",
      barColor: "#243f63",
      lineColor: "#e55353",
      legendLabel: `${config.label} Bar / Cumulative IC`,
      barPoints: sampledPoints.map((p) => ({ date: p.trade_date, value: numericOrNaN(p[config.barKey]) })),
      linePoints: sampledPoints.map((p) => ({ date: p.trade_date, value: numericOrNaN(p[config.lineKey]) })),
    });
  }
  drawIcComboChart("icChart", series, { emptyText: "暂无 IC 数据" });
  setRangeLabel("ic");
  setRangeBackground("ic");
}

function renderGroupChart() {
  const payload = state.chartData.group;
  const columns = payload.columns || [];
  const seriesRows = payload.series || [];
  const palette = ["#243f63", "#55705a", "#9a7741", "#985b52", "#67728a", "#577a7e", "#89664b", "#4f6d67", "#5e6681", "#815b68"];
  const series = columns.map((column, idx) => ({
    name: `Q${column}`,
    color: palette[idx % palette.length],
    lineWidth: column === columns[0] || column === columns[columns.length - 1] ? 2.4 : 1.4,
    points: seriesRows.map((row) => ({ date: row.date, value: numericOrNaN(row[column]) })),
  }));
  drawLineChart("groupChart", series, { emptyText: "暂无全区间分组收益数据" });
}

function renderLsMetrics(stats) {
  setText("annualReturnValue", pct(stats?.annual_return));
  setText("annualVolatilityValue", pct(stats?.annual_volatility));
  setText("maxDrawdownValue", pct(stats?.max_drawdown));
}

function renderLongShortChart() {
  const points = state.chartData.ls || [];
  const visible = {
    long_value: document.getElementById("toggleLong").checked,
    short_value: document.getElementById("toggleShort").checked,
    long_short_value: document.getElementById("toggleLongShort").checked,
  };
  const series = [];
  if (visible.long_value) series.push({ name: "Long", color: "#243f63", points: points.map((p) => ({ date: p.date, value: numericOrNaN(p.long_value) })) });
  if (visible.short_value) series.push({ name: "Short", color: "#ef5552", points: points.map((p) => ({ date: p.date, value: numericOrNaN(p.short_value) })) });
  if (visible.long_short_value) series.push({ name: "LongShort", color: "#55705a", lineWidth: 2.6, points: points.map((p) => ({ date: p.date, value: numericOrNaN(p.long_short_value) })) });

  const stats = state.chartData.lsStats || {};
  const range = stats.max_drawdown_range;
  const highlightRange = range?.peak_date && range?.trough_date
    ? { seriesName: "LongShort", startDate: range.peak_date, endDate: range.trough_date }
    : null;
  const markers = range?.peak_date && range?.trough_date
    ? {
        seriesName: "LongShort",
        items: [
          { date: range.peak_date, color: "#e55353", label: "Peak" },
          { date: range.trough_date, color: "#e55353", label: "Trough" },
          ...(range.recovery_date ? [{ date: range.recovery_date, color: "#243f63", label: "Recover" }] : []),
        ],
      }
    : null;

  drawLineChart("lsChart", series, {
    highlightRange,
    markers,
    emptyText: "暂无全区间收益序列数据",
  });
  renderLsMetrics(stats);
  setRangeLabel("ls");
  setRangeBackground("ls");
}

function pickPortfolioParamItems(payload) {
  return Object.entries(payload || {}).map(([key, value]) => ({ label: key, value }));
}

function buildOptimizerParamItems(summary) {
  if (!summary) return [];
  const items = [
    { label: "optimizer_name", value: summary.optimizer_name },
    { label: "start_date", value: summary.start_date },
    { label: "end_date", value: summary.end_date },
    { label: "n_factors", value: summary.n_factors },
    { label: "n_rebalance_dates", value: summary.n_rebalance_dates },
  ];
  const constraints = summary.constraints || {};
  const lines = Object.entries(constraints)
    .filter(([key, value]) => !(key === "extras" && value && typeof value === "object" && !Object.keys(value).length))
    .map(([key, value]) => `${key}: ${stringifyValue(value)}`);
  if (lines.length) {
    items.push({
      label: "constraints",
      value: lines.join("\n"),
      compactList: true,
    });
  }
  return items;
}

function renderPortfolioList() {
  const node = document.getElementById("portfolioRunList");
  if (!node) return;
  const runs = state.portfolioBacktests || [];
  setText("portfolioRunCount", runs.length ? `共 ${runs.length} 条` : "");
  if (!runs.length) {
    node.innerHTML = '<div class="empty-state">暂无组合回测结果</div>';
    return;
  }
  node.innerHTML = runs.map((item) => `
    <article class="portfolio-run-card ${state.selectedPortfolioRunId === item.run_id ? "selected" : ""}" data-run-id="${escapeHtml(item.run_id)}">
      <div class="panel-head">
        <h3>${escapeHtml(item.run_id)}</h3>
        <span class="badge ${escapeHtml(item.status || "skipped")}">${escapeHtml(item.status || "--")}</span>
      </div>
      <p>${escapeHtml(displayText(item.start_date))} ~ ${escapeHtml(displayText(item.end_date))}</p>
      <div class="portfolio-run-meta">
        <span>回测时间: ${escapeHtml(displayText(item.timestamp))}</span>
        <span>基准: ${escapeHtml(displayText(item.benchmark))}</span>
        <span>Optimizer: ${escapeHtml(displayText(item.optimizer_run_id))}</span>
        <span>样本点: ${escapeHtml(displayText(item.portfolio_rows))}</span>
      </div>
    </article>
  `).join("");
  node.querySelectorAll(".portfolio-run-card").forEach((card) => {
    card.addEventListener("click", () => selectPortfolioRun(card.dataset.runId));
  });
}

function renderPortfolioMetrics(metrics) {
  const node = document.getElementById("portfolioMetrics");
  if (!node) return;
  const items = [
    { label: "年化收益", value: pct(metrics?.annual_return) },
    { label: "年化波动", value: pct(metrics?.annual_volatility) },
    { label: "最大回撤", value: pct(metrics?.max_drawdown) },
    { label: "基准年化收益", value: pct(metrics?.benchmark_annual_return) },
    { label: "超额年化收益", value: pct(metrics?.excess_annual_return) },
    { label: "回测天数", value: displayText(metrics?.days) },
    { label: "平均换手", value: pct(metrics?.avg_turnover) },
    { label: "累计成本", value: metrics?.total_cost === null || metrics?.total_cost === undefined ? "--" : fmt(metrics.total_cost, 2) },
  ];
  node.innerHTML = items.map((item) => `
    <div class="metric-chip">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>
  `).join("");
}

function renderPortfolioChart() {
  const detail = state.portfolioDetail || {};
  const seriesRows = detail.series || [];
  drawLineChart("portfolioChart", [
    {
      name: "Portfolio",
      color: "#243f63",
      lineWidth: 2.6,
      points: seriesRows.map((item) => ({ date: item.date, value: numericOrNaN(item.portfolio_nav) })),
    },
    {
      name: "Benchmark",
      color: "#e79b28",
      lineWidth: 2,
      dash: true,
      points: seriesRows.map((item) => ({ date: item.date, value: numericOrNaN(item.benchmark_nav) })),
    },
  ], { emptyText: "暂无组合回测曲线数据" });
}

function renderPortfolioDetail() {
  const detail = state.portfolioDetail;
  const selected = getSelectedPortfolioMeta();
  setText("portfolioSelectedHint", selected?.run_id || "--");
  if (!detail || !selected) {
    renderKvGrid("portfolioQlibParams", [], "暂无参数");
    renderKvGrid("portfolioOptimizerParams", [], "暂无参数");
    renderPortfolioMetrics({});
    drawLineChart("portfolioChart", [], { emptyText: "暂无组合回测曲线数据" });
    setText("portfolioMissingNotes", "暂无组合回测详情");
    return;
  }

  const qlibItems = pickPortfolioParamItems(detail.qlib_run_summary?.run);
  const optimizerItems = buildOptimizerParamItems(detail.optimizer_run_summary);
  renderKvGrid("portfolioQlibParams", qlibItems, "暂无 QLib 回测参数");
  renderKvGrid("portfolioOptimizerParams", optimizerItems, "未找到关联 optimizer_run 的 run_summary");
  renderPortfolioMetrics(detail.metrics || {});
  renderPortfolioChart();
  const missing = detail.missing || [];
  setText("portfolioMissingNotes", missing.length ? missing.join(" | ") : "");
}

async function fetchSummary() {
  return STATIC_MODE ? getJson(dataPath("summary.json")) : getJson("/api/summary");
}

async function fetchFactors() {
  return STATIC_MODE ? getJson(dataPath("factors.json")) : getJson("/api/factors");
}

async function fetchJobs() {
  return STATIC_MODE ? getJson(dataPath("status.json")) : getJson("/api/status");
}

async function fetchPortfolioBacktests() {
  return STATIC_MODE ? getJson(dataPath("portfolio-backtests.json")) : getJson("/api/portfolio-backtests");
}

async function fetchPortfolioBacktestDetail(runId) {
  if (!runId) return null;
  if (STATIC_MODE) return getJson(dataPath(`portfolio-details/${encodeURIComponent(runId)}.json`));
  const q = new URLSearchParams({ run_id: runId });
  return getJson(`/api/portfolio-backtest-detail?${q.toString()}`);
}

async function fetchEvalSeries(factor, horizon) {
  if (STATIC_MODE) {
    const payload = await getJson(dataPath(`ic/${factorKey(factor)}.json`));
    const seriesKey = horizon === 1 ? "ic_1" : horizon === 5 ? "ic_5" : "ic_22";
    const cumulativeKey = horizon === 1 ? "cum_ic_1" : horizon === 5 ? "cum_ic_5" : "cum_ic_22";
    return (payload.series || []).map((row) => ({
      date: row.trade_date,
      value: row[seriesKey],
      cumulative_value: row[cumulativeKey],
    }));
  }
  const q = new URLSearchParams({
    factor,
    universe: "ALL",
    horizon: String(horizon),
    eval_type: "rank_ic",
    weighting: "equal_weight",
    transform_type: "industry_size_neutral",
  });
  const payload = await getJson(`/api/eval-series?${q.toString()}`);
  return (payload.series || []).map((row) => ({
    date: row.date,
    value: row.value,
    cumulative_value: row.cumulative_value,
  }));
}

async function fetchBacktestNav(factor) {
  if (STATIC_MODE) return getJson(dataPath(`long-short/${factorKey(factor)}.json`));
  const factorMeta = getSelectedFactorMeta();
  const q = new URLSearchParams({ factor, version_id: factorMeta?.version_id || "" });
  return getJson(`/api/backtest-nav?${q.toString()}`);
}

async function fetchGroupReturns(factor) {
  if (STATIC_MODE) return getJson(dataPath(`group-returns/${factorKey(factor)}.json`));
  const factorMeta = getSelectedFactorMeta();
  const q = new URLSearchParams({ factor, version_id: factorMeta?.version_id || "" });
  return getJson(`/api/group-returns?${q.toString()}`);
}

async function fetchBacktestAnalysis(factor, startIdx, endIdx) {
  if (STATIC_MODE) {
    return computeStaticAnalysis(state.chartData.lsRaw || [], startIdx, endIdx);
  }
  const factorMeta = getSelectedFactorMeta();
  const q = new URLSearchParams({
    factor,
    version_id: factorMeta?.version_id || "",
    start_idx: String(startIdx),
    end_idx: String(endIdx),
  });
  return getJson(`/api/backtest-analysis?${q.toString()}`);
}

function chooseDefaultFactor() {
  state.selectedFactor = state.factors[0]?.factor_name || null;
  setText("selectedFactorHint", state.selectedFactor ? `当前: ${state.selectedFactor}` : "");
}

async function updateLongShortAnalysis() {
  if (!state.selectedFactor) return;
  const token = ++lsAnalysisToken;
  const range = normalizeRange("ls");
  const payload = await fetchBacktestAnalysis(state.selectedFactor, range.start, range.end);
  if (token !== lsAnalysisToken) return;
  state.chartData.ls = payload.series || [];
  state.chartData.lsStats = payload.stats || {};
  renderLongShortChart();
}

function queueLongShortAnalysis() {
  if (lsAnalysisTimer) window.clearTimeout(lsAnalysisTimer);
  lsAnalysisTimer = window.setTimeout(() => {
    updateLongShortAnalysis().catch((err) => {
      console.error(err);
      showToast(`收益区间分析失败: ${err.message}`);
    });
  }, 90);
}

async function loadFactorDependentPanels() {
  if (!state.selectedFactor) return;
  const [ic1, ic5, ic22, backtestNav, groupReturns] = await Promise.all([
    fetchEvalSeries(state.selectedFactor, 1),
    fetchEvalSeries(state.selectedFactor, 5),
    fetchEvalSeries(state.selectedFactor, 22),
    fetchBacktestNav(state.selectedFactor),
    fetchGroupReturns(state.selectedFactor),
  ]);
  state.chartData.ic = mergeIC(ic1, ic5, ic22);
  state.chartData.group = groupReturns || { columns: [], series: [] };
  state.chartData.lsRaw = backtestNav?.series || [];
  state.ranges.ic = { start: 0, end: Math.max(0, state.chartData.ic.length - 1) };
  state.ranges.ls = { start: 0, end: Math.max(0, state.chartData.lsRaw.length - 1) };
  setRangeInputs("ic");
  setRangeInputs("ls");
  setText("icChartTitle", state.selectedFactor);
  setText("groupChartTitle", state.selectedFactor);
  setText("lsChartTitle", state.selectedFactor);
  renderIcChart();
  renderGroupChart();
  await updateLongShortAnalysis();
}

async function loadPortfolioPanels() {
  renderPortfolioList();
  if (!state.selectedPortfolioRunId && state.portfolioBacktests.length) {
    state.selectedPortfolioRunId = state.portfolioBacktests[0].run_id;
  }
  if (!state.selectedPortfolioRunId) {
    state.portfolioDetail = null;
    renderPortfolioDetail();
    return;
  }
  state.portfolioDetail = await fetchPortfolioBacktestDetail(state.selectedPortfolioRunId);
  renderPortfolioList();
  renderPortfolioDetail();
}

async function selectFactor(factorName) {
  state.selectedFactor = factorName;
  setText("selectedFactorHint", factorName ? `当前: ${factorName}` : "");
  renderFactors();
  await loadFactorDependentPanels();
}

async function selectPortfolioRun(runId) {
  state.selectedPortfolioRunId = runId;
  renderPortfolioList();
  state.portfolioDetail = await fetchPortfolioBacktestDetail(runId);
  renderPortfolioDetail();
}

async function showLatestJobItems() {
  const latest = state.jobs[0];
  const box = document.getElementById("jobItems");
  if (!latest) {
    box.textContent = "暂无任务记录";
    return;
  }
  if (STATIC_MODE) {
    box.textContent = "静态发布版暂不包含任务明细，请在本地服务版查看。";
    return;
  }
  const items = await getJson(`/api/job-items?run_id=${encodeURIComponent(latest.run_id)}`);
  box.innerHTML = items.length
    ? items.map((item) => `<div class="job-item-row"><strong>${item.factor_name}</strong><span class="badge ${item.status}">${item.status}</span><span>${item.error_type || item.rows_written || ""} ${item.error_message || ""}</span></div>`).join("")
    : "最近任务没有明细记录";
}

async function loadDashboard() {
  const [summary, factors, statusPayload, portfolioBacktests] = await Promise.all([
    fetchSummary(),
    fetchFactors(),
    fetchJobs(),
    fetchPortfolioBacktests(),
  ]);
  state.summary = summary;
  state.factors = factors;
  state.status = statusPayload;
  state.portfolioBacktests = portfolioBacktests || [];
  state.jobs = statusPayload?.scheduler?.recent_stages || [];
  if (!state.selectedFactor) chooseDefaultFactor();
  if (!state.selectedPortfolioRunId) state.selectedPortfolioRunId = state.portfolioBacktests[0]?.run_id || null;
  renderSummary();
  renderFactors();
  renderJobs();
  await Promise.all([loadFactorDependentPanels(), loadPortfolioPanels()]);
}

function bindNavigation() {
  document.querySelectorAll("nav a[data-view]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const view = link.dataset.view;
      if (view === "building") {
        event.preventDefault();
        showToast("敬请期待");
        return;
      }
      event.preventDefault();
      switchView(view);
    });
    if (link.dataset.view === "building") {
      link.addEventListener("mouseenter", () => {
        showToast("敬请期待");
      });
    }
  });
}

function bindRangeHandlers() {
  ["ic", "ls"].forEach((chartKey) => {
    const startInput = document.getElementById(`${chartKey}RangeStart`);
    const endInput = document.getElementById(`${chartKey}RangeEnd`);
    const handle = (kind) => (event) => {
      const list = chartKey === "ls" ? state.chartData.lsRaw : state.chartData[chartKey];
      const max = Math.max(0, (list?.length || 0) - 1);
      const next = Math.max(0, Math.min(max, Math.floor(Number(event.target.value))));
      const current = normalizeRange(chartKey);
      if (kind === "start") current.start = Math.min(next, current.end);
      else current.end = Math.max(next, current.start);
      state.ranges[chartKey] = current;
      startInput.value = String(current.start);
      endInput.value = String(current.end);
      setRangeLabel(chartKey);
      setRangeBackground(chartKey);
      if (chartKey === "ic") {
        renderIcChart();
      } else {
        queueLongShortAnalysis();
      }
    };
    startInput.addEventListener("input", handle("start"));
    endInput.addEventListener("input", handle("end"));
  });
}

function bindEvents() {
  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadDashboard().catch((err) => {
      console.error(err);
      alert(`看板加载失败: ${err.message}`);
    });
  });
  document.getElementById("searchInput").addEventListener("input", renderFactors);
  document.getElementById("statusFilter").addEventListener("change", (event) => {
    state.factorTable.statusFilter = event.target.value;
    renderFactors();
  });
  document.getElementById("sortBy").addEventListener("change", (event) => {
    state.factorTable.sortBy = event.target.value;
    renderFactors();
  });
  document.getElementById("sortDirBtn").addEventListener("click", () => {
    state.factorTable.sortDir = state.factorTable.sortDir === "asc" ? "desc" : "asc";
    document.getElementById("sortDirBtn").textContent = state.factorTable.sortDir === "asc" ? "↑" : "↓";
    renderFactors();
  });
  ["toggleIc1", "toggleIc5", "toggleIc22"].forEach((id) => document.getElementById(id).addEventListener("change", renderIcChart));
  ["toggleLong", "toggleShort", "toggleLongShort"].forEach((id) => document.getElementById(id).addEventListener("change", renderLongShortChart));
  window.addEventListener("resize", () => {
    renderIcChart();
    renderGroupChart();
    renderLongShortChart();
  });
  bindNavigation();
  bindRangeHandlers();
  bindMetricFilterInputs();
}

bindEvents();
switchView("overview");
loadDashboard().catch((err) => {
  console.error(err);
  alert(`看板加载失败: ${err.message}`);
});
