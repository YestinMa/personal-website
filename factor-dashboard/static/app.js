const state = {
  summary: null,
  factors: [],
  jobs: [],
  selectedFactor: null,
  chartData: { ic: [], ls: [] },
  ranges: {
    ic: { start: 0, end: 0 },
    ls: { start: 0, end: 0 },
  },
};

const STATIC_MODE = Boolean(window.FACTOR_DASHBOARD_STATIC);

const fmt = (value, digits = 3) => (value === null || value === undefined || Number.isNaN(Number(value)) ? "--" : Number(value).toFixed(digits));
const pct = (value) => (value === null || value === undefined || Number.isNaN(Number(value)) ? "--" : `${(Number(value) * 100).toFixed(1)}%`);
const cssNum = (value) => {
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) return "num";
  return n > 0 ? "num pos" : "num neg";
};

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text ?? "--";
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

function getSeriesValue(item) {
  return item?.value ?? item?.nav ?? null;
}

function getDisplayFactorValueDate(item) {
  return item?.latest_factor_value_date || item?.latest_metric_date || "--";
}

function setRangeBackground(chartKey) {
  const bar = document.querySelector(`.range-control[data-chart="${chartKey}"] .dual-range`);
  if (!bar) return;
  const range = state.ranges[chartKey];
  const list = state.chartData[chartKey] || [];
  const length = list.length;
  if (!length) {
    bar.style.background = "linear-gradient(#dbe5f3, #dbe5f3) center / 100% 4px no-repeat";
    return;
  }
  const startPct = (Math.min(range.start, range.end) / Math.max(1, length - 1)) * 100;
  const endPct = (Math.max(range.start, range.end) / Math.max(1, length - 1)) * 100;
  bar.style.background = `linear-gradient(to right,
    #dbe5f3 0%,
    #dbe5f3 ${startPct}%,
    var(--blue) ${startPct}%,
    var(--blue) ${endPct}%,
    #dbe5f3 ${endPct}%,
    #dbe5f3 100%) center / 100% 4px no-repeat`;
}

function setRangeLabel(chartKey) {
  const label = document.getElementById(`${chartKey}RangeLabel`);
  const list = state.chartData[chartKey] || [];
  if (!label) return;
  if (!list.length) {
    label.textContent = "--";
    return;
  }
  const range = normalizeRange(chartKey);
  const startItem = list[range.start];
  const endItem = list[range.end];
  label.textContent = `${getSeriesDate(startItem)} ~ ${getSeriesDate(endItem)}`;
}

function normalizeRange(chartKey) {
  const list = state.chartData[chartKey] || [];
  const max = Math.max(0, list.length - 1);
  const range = state.ranges[chartKey];
  let start = Number.isFinite(range.start) ? Math.floor(range.start) : 0;
  let end = Number.isFinite(range.end) ? Math.floor(range.end) : max;
  start = Math.max(0, Math.min(start, max));
  end = Math.max(0, Math.min(end, max));
  if (start > end) {
    [start, end] = [end, start];
  }
  state.ranges[chartKey] = { start, end };
  return state.ranges[chartKey];
}

function setRangeInputs(chartKey) {
  const list = state.chartData[chartKey] || [];
  const max = Math.max(0, list.length - 1);
  const startInput = document.getElementById(`${chartKey}RangeStart`);
  const endInput = document.getElementById(`${chartKey}RangeEnd`);
  if (!startInput || !endInput) return;

  startInput.max = String(max);
  endInput.max = String(max);
  startInput.min = "0";
  endInput.min = "0";
  startInput.step = "1";
  endInput.step = "1";

  if (!list.length) {
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
  if (current.start === 0 && current.end === 0 && max > 0) {
    state.ranges[chartKey] = { start: 0, end: max };
  }
  startInput.value = String(state.ranges[chartKey].start);
  endInput.value = String(state.ranges[chartKey].end);
  setRangeLabel(chartKey);
  setRangeBackground(chartKey);
}

function attachRangeHandlers() {
  ["ic", "ls"].forEach((chartKey) => {
    const startInput = document.getElementById(`${chartKey}RangeStart`);
    const endInput = document.getElementById(`${chartKey}RangeEnd`);
    if (!startInput || !endInput || startInput.dataset.bound === "1") return;

    const handleRangeInput = (kind) => (event) => {
      const rawValue = Number(event.target.value);
      const list = state.chartData[chartKey] || [];
      const max = Math.max(0, list.length - 1);
      const nextValue = Math.max(0, Math.min(max, Math.floor(rawValue)));
      const current = normalizeRange(chartKey);
      if (kind === "start") {
        current.start = Math.min(nextValue, current.end);
      } else {
        current.end = Math.max(nextValue, current.start);
      }
      state.ranges[chartKey] = current;
      startInput.value = String(current.start);
      endInput.value = String(current.end);
      setRangeLabel(chartKey);
      setRangeBackground(chartKey);
      if (chartKey === "ic") {
        renderIcChart();
      } else {
        renderLongShortChart();
      }
    };

    startInput.addEventListener("input", handleRangeInput("start"));
    endInput.addEventListener("input", handleRangeInput("end"));
    startInput.dataset.bound = "1";
    endInput.dataset.bound = "1";
  });
}

function sliceByRange(points, chartKey) {
  const range = normalizeRange(chartKey);
  if (!points.length) return [];
  return points.slice(range.start, range.end + 1);
}

function renderSummary() {
  const s = state.summary;
  if (!s) return;
  setText("latestTradeDate", s.latest_trade_date);
  setText("latestFactorDate", s.latest_factor_date);
  setText("activeCount", s.status_counts.active || 0);
  setText("candidateCount", s.status_counts.candidate || 0);
  setText("draftCount", s.status_counts.draft || 0);
  const statusEl = document.getElementById("latestJobStatus");
  if (statusEl) statusEl.textContent = s.latest_job?.status || "--";
}

function renderFactors() {
  const tbody = document.getElementById("factorTable");
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const filtered = state.factors.filter((item) =>
    item.factor_name.toLowerCase().includes(query) ||
    (item.factor_family || "").toLowerCase().includes(query)
  );
  document.getElementById("factorCount").textContent = `(${filtered.length})`;
  tbody.innerHTML = filtered
    .map((item) => `
      <tr data-factor="${item.factor_name}" class="${state.selectedFactor === item.factor_name ? "selected" : ""}">
        <td class="factor-name">${item.factor_name}</td>
        <td><span class="badge ${item.lifecycle_status}">${item.lifecycle_status}</span></td>
        <td>${item.version || "--"}</td>
        <td class="${cssNum(item.rolling_annual_return)}">${pct(item.rolling_annual_return)}</td>
        <td class="${cssNum(item.rolling_vol)}">${pct(item.rolling_vol)}</td>
        <td class="${cssNum(item.rolling_sharpe)}">${fmt(item.rolling_sharpe, 2)}</td>
        <td title="${item.latest_factor_value_date || item.latest_metric_date || "--"}">${getDisplayFactorValueDate(item)}</td>
      </tr>
    `)
    .join("");

  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => selectFactor(tr.dataset.factor));
  });
}

function renderJobs() {
  const tbody = document.getElementById("jobTable");
  tbody.innerHTML = state.jobs
    .map((job) => `
      <tr data-run-id="${job.run_id}">
        <td>${job.run_id}</td>
        <td>${job.job_date}</td>
        <td><span class="badge ${job.status}">${job.status}</span></td>
        <td>${job.success_count}</td>
        <td>${job.failed_count}</td>
      </tr>
    `)
    .join("");
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
  const padding = { left: 48, right: 18, top: 28, bottom: 34 };
  const allPoints = seriesList.flatMap((s) => s.points || []).filter((p) => Number.isFinite(p.value));
  if (!allPoints.length) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText("暂无可展示数据", width / 2, height / 2);
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
  min -= span * 0.1;
  max += span * 0.1;

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const xFor = (i, n) => padding.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yFor = (v) => padding.top + (1 - (v - min) / (max - min)) * plotH;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#e5eaf2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#6b7280";
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

  if (options.zeroLine && min < 0 && max > 0) {
    const y = yFor(0);
    ctx.strokeStyle = "#cbd5e1";
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
    ctx.lineWidth = 2;
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

  const longestSeries = seriesList.reduce((best, item) =>
    (item.points || []).length > (best.points || []).length ? item : best,
  { points: [] });
  const first = longestSeries.points[0]?.date;
  const last = longestSeries.points[longestSeries.points.length - 1]?.date;
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "left";
  ctx.fillText(first || "", padding.left, height - 10);
  ctx.textAlign = "right";
  ctx.fillText(last || "", width - padding.right, height - 10);

  let legendX = padding.left;
  seriesList.forEach((series) => {
    ctx.strokeStyle = series.color;
    ctx.lineWidth = 2;
    ctx.setLineDash(series.dash ? [6, 5] : []);
    ctx.beginPath();
    ctx.moveTo(legendX, 14);
    ctx.lineTo(legendX + 22, 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(series.name || "", legendX + 28, 18);
    legendX += 24 + ctx.measureText(series.name || "").width + 18;
  });
}

function mergeIC(ic1, ic5, ic22) {
  const out = {};
  [ic1, ic5, ic22].forEach((arr, idx) => {
    const key = idx === 0 ? "ic_1" : idx === 1 ? "ic_5" : "ic_22";
    (arr || []).forEach((row) => {
      const d = row.date;
      out[d] = out[d] || { trade_date: d, ic_1: NaN, ic_5: NaN, ic_22: NaN };
      out[d][key] = Number(row.value);
    });
  });
  return Object.values(out).sort((a, b) => String(a.trade_date).localeCompare(String(b.trade_date)));
}

function renderIcChart() {
  const points = sliceByRange(state.chartData.ic || [], "ic");
  const visible = {
    ic_1: document.getElementById("toggleIc1").checked,
    ic_5: document.getElementById("toggleIc5").checked,
    ic_22: document.getElementById("toggleIc22").checked,
  };
  const series = [];
  if (visible.ic_1) series.push({ name: "IC_1", color: "#2563eb", points: points.map((p) => ({ date: p.trade_date, value: Number(p.ic_1) })) });
  if (visible.ic_5) series.push({ name: "IC_5", color: "#2f9e65", points: points.map((p) => ({ date: p.trade_date, value: Number(p.ic_5) })) });
  if (visible.ic_22) series.push({ name: "IC_22", color: "#e79b28", points: points.map((p) => ({ date: p.trade_date, value: Number(p.ic_22) })) });
  drawLineChart("icChart", series, false);
  setRangeLabel("ic");
  setRangeBackground("ic");
}

function mergeLS(longNav, shortNav, lsNav) {
  const out = {};
  const fill = (arr, key) => (arr || []).forEach((row) => {
    const d = row.date;
    out[d] = out[d] || { date: d, long_value: NaN, short_value: NaN, long_short_value: NaN };
    out[d][key] = Number(row.nav);
  });
  fill(longNav, "long_value");
  fill(shortNav, "short_value");
  fill(lsNav, "long_short_value");
  return Object.values(out).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function renderLongShortChart() {
  const points = sliceByRange(state.chartData.ls || [], "ls");
  const visible = {
    long_value: document.getElementById("toggleLong").checked,
    short_value: document.getElementById("toggleShort").checked,
    long_short_value: document.getElementById("toggleLongShort").checked,
  };
  const series = [];
  if (visible.long_value) series.push({ name: "Long", color: "#2563eb", points: points.map((p) => ({ date: p.date, value: Number(p.long_value) })) });
  if (visible.short_value) series.push({ name: "Short", color: "#ef5552", points: points.map((p) => ({ date: p.date, value: Number(p.short_value) })) });
  if (visible.long_short_value) series.push({ name: "LongShort", color: "#2f9e65", points: points.map((p) => ({ date: p.date, value: Number(p.long_short_value) })) });
  drawLineChart("lsChart", series, false);
  setRangeLabel("ls");
  setRangeBackground("ls");
}

function getFactorSeriesPayload(url, factorName, seriesKey) {
  return getJson(url).then((payload) => ({
    factor_name: payload.factor_name || factorName,
    version_id: payload.version_id || null,
    series: (payload.series || []).map((row) => ({
      date: row.trade_date || row.date,
      value: row[seriesKey] ?? row.value,
    })),
  }));
}

async function fetchEvalSeries(factor, evalType, horizon) {
  if (STATIC_MODE) {
    const payload = await getJson(dataPath(`ic/${factorKey(factor)}.json`));
    const seriesKey = horizon === 1 ? "ic_1" : horizon === 5 ? "ic_5" : "ic_22";
    return {
      factor_name: payload.factor_name || factor,
      version_id: payload.version_id || null,
      series: (payload.series || []).map((row) => ({
        date: row.trade_date,
        value: row[seriesKey],
      })),
    };
  }
  const q = new URLSearchParams({
    factor,
    universe: "ALL",
    horizon: String(horizon),
    eval_type: evalType,
    weighting: "equal_weight",
    transform_type: "industry_size_neutral",
  });
  return getJson(`/api/eval-series?${q.toString()}`);
}

async function fetchNav(factor, evalType) {
  if (STATIC_MODE) {
    const payload = await getJson(dataPath(`long-short/${factorKey(factor)}.json`));
    const field = evalType === "long_ret" ? "long_value" : evalType === "short_ret" ? "short_value" : "long_short_value";
    return {
      factor_name: payload.factor_name || factor,
      version_id: payload.version_id || null,
      series: (payload.series || []).map((row) => ({
        date: row.date,
        nav: row[field],
      })),
    };
  }
  const q = new URLSearchParams({
    factor,
    universe: "ALL",
    horizon: "22",
    eval_type: evalType,
    weighting: "equal_weight",
    transform_type: "industry_size_neutral",
  });
  return getJson(`/api/nav-drawdown?${q.toString()}`);
}

function syncPanelHeights() {
  const factorPanel = document.querySelector(".factor-panel");
  const icPanel = document.getElementById("icChart")?.closest(".panel");
  if (!factorPanel || !icPanel) return;
  factorPanel.style.height = "";
  const targetHeight = Math.round(icPanel.getBoundingClientRect().height);
  if (targetHeight > 0) {
    factorPanel.style.height = `${targetHeight}px`;
  }
}

function chooseDefaultFactor() {
  state.selectedFactor = state.factors[0]?.factor_name || null;
  document.getElementById("selectedFactorHint").textContent = state.selectedFactor ? `当前: ${state.selectedFactor}` : "";
}

async function loadCharts() {
  if (!state.selectedFactor) return;
  const [ic1, ic5, ic22, longRet, shortRet, lsRet] = await Promise.all([
    fetchEvalSeries(state.selectedFactor, "rank_ic", 1),
    fetchEvalSeries(state.selectedFactor, "rank_ic", 5),
    fetchEvalSeries(state.selectedFactor, "rank_ic", 22),
    fetchNav(state.selectedFactor, "long_ret"),
    fetchNav(state.selectedFactor, "short_ret"),
    fetchNav(state.selectedFactor, "long_short_ret"),
  ]);
  state.chartData.ic = mergeIC(ic1.series, ic5.series, ic22.series);
  state.chartData.ls = mergeLS(longRet.series, shortRet.series, lsRet.series);
  state.ranges.ic = { start: 0, end: Math.max(0, state.chartData.ic.length - 1) };
  state.ranges.ls = { start: 0, end: Math.max(0, state.chartData.ls.length - 1) };
  setRangeInputs("ic");
  setRangeInputs("ls");
  document.getElementById("icChartTitle").textContent = state.selectedFactor;
  document.getElementById("lsChartTitle").textContent = state.selectedFactor;
  renderIcChart();
  renderLongShortChart();
  syncPanelHeights();
}

async function selectFactor(factorName) {
  state.selectedFactor = factorName;
  document.getElementById("selectedFactorHint").textContent = `当前: ${factorName}`;
  renderFactors();
  await loadCharts();
}

async function showLatestJobItems() {
  const latest = state.jobs[0];
  const box = document.getElementById("jobItems");
  if (!latest) {
    box.textContent = "暂无任务记录";
    return;
  }
  const items = await getJson(`/api/job-items?run_id=${encodeURIComponent(latest.run_id)}`);
  box.innerHTML = items.length
    ? items.map((item) => `<div class="job-item-row"><strong>${item.factor_name}</strong> <span class="badge ${item.status}">${item.status}</span> <span>${item.error_type || item.rows_written || ""} ${item.error_message || ""}</span></div>`).join("")
    : "最近任务没有明细记录";
}

async function loadDashboard() {
  const [summary, factors, jobs] = await Promise.all([fetchSummary(), fetchFactors(), fetchJobs()]);
  state.summary = summary;
  state.factors = factors;
  state.jobs = jobs;
  if (!state.selectedFactor) chooseDefaultFactor();
  renderSummary();
  renderFactors();
  renderJobs();
  await loadCharts();
  attachRangeHandlers();
  syncPanelHeights();
}

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
document.getElementById("searchInput").addEventListener("input", renderFactors);
document.getElementById("showJobItemsBtn").addEventListener("click", showLatestJobItems);
["toggleIc1", "toggleIc5", "toggleIc22"].forEach((id) => document.getElementById(id).addEventListener("change", renderIcChart));
["toggleLong", "toggleShort", "toggleLongShort"].forEach((id) => document.getElementById(id).addEventListener("change", renderLongShortChart));
window.addEventListener("resize", () => {
  renderIcChart();
  renderLongShortChart();
  syncPanelHeights();
});

loadDashboard().catch((err) => {
  console.error(err);
  alert(`看板加载失败: ${err.message}`);
});
