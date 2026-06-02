const state = {
  summary: null,
  factors: [],
  jobs: [],
  selectedFactor: null,
  chartData: { ic: [], ls: [] },
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
  document.getElementById(id).textContent = text ?? "--";
}

function dataPath(path) {
  return `./data/${path}`;
}

async function fetchSummary() {
  return getJson(STATIC_MODE ? dataPath("summary.json") : "/api/summary");
}

async function fetchFactors() {
  return getJson(STATIC_MODE ? dataPath("factors.json") : "/api/factors");
}

async function fetchJobs() {
  return getJson(STATIC_MODE ? dataPath("jobs.json") : "/api/jobs");
}

async function fetchEvalSeries(factor, evalType, horizon) {
  if (STATIC_MODE) {
    const payload = await getJson(dataPath(`ic/${encodeURIComponent(factor)}.json`));
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

async function fetchNav(factor, evalType, horizon) {
  if (STATIC_MODE) {
    const payload = await getJson(dataPath(`long-short/${encodeURIComponent(factor)}.json`));
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
    horizon: String(horizon),
    eval_type: evalType,
    weighting: "equal_weight",
    transform_type: "industry_size_neutral",
  });
  return getJson(`/api/nav-drawdown?${q.toString()}`);
}

function renderSummary() {
  const s = state.summary;
  setText("latestTradeDate", s.latest_trade_date);
  setText("latestFactorDate", s.latest_factor_date);
  setText("activeCount", s.status_counts.active || 0);
  setText("candidateCount", s.status_counts.candidate || 0);
  setText("draftCount", s.status_counts.draft || 0);
  const statusEl = document.getElementById("latestJobStatus");
  statusEl.textContent = s.latest_job?.status || "--";
}

function renderFactors() {
  const tbody = document.getElementById("factorTable");
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const filtered = state.factors.filter((item) =>
    item.factor_name.toLowerCase().includes(query) ||
    (item.factor_family || "").toLowerCase().includes(query)
  );
  document.getElementById("factorCount").textContent = `(${filtered.length})`;
  tbody.innerHTML = filtered.map((item) => `
      <tr data-factor="${item.factor_name}" class="${state.selectedFactor === item.factor_name ? "selected" : ""}">
        <td class="factor-name">${item.factor_name}</td>
        <td>${item.factor_family || "--"}</td>
        <td><span class="badge ${item.lifecycle_status}">${item.lifecycle_status}</span></td>
        <td>${item.version || "--"}</td>
        <td class="${cssNum(item.rolling_ic_mean)}">${fmt(item.rolling_ic_mean)}</td>
        <td class="${cssNum(item.rolling_icir)}">${fmt(item.rolling_icir)}</td>
        <td class="${cssNum(item.rolling_sharpe)}">${fmt(item.rolling_sharpe, 2)}</td>
        <td>--</td>
        <td>--</td>
        <td>${item.latest_metric_date || "--"}</td>
      </tr>
  `).join("");
  tbody.querySelectorAll("tr").forEach((tr) => tr.addEventListener("click", () => selectFactor(tr.dataset.factor)));
}

function renderJobs() {
  const tbody = document.getElementById("jobTable");
  tbody.innerHTML = state.jobs.map((job) => `
    <tr data-run-id="${job.run_id}">
      <td>${job.run_id}</td><td>${job.job_date}</td>
      <td><span class="badge ${job.status}">${job.status}</span></td>
      <td>${job.success_count}</td><td>${job.failed_count}</td>
    </tr>
  `).join("");
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

function drawLineChart(canvasId, seriesList, percent = false) {
  const canvas = document.getElementById(canvasId);
  const { ctx, width, height } = setupCanvas(canvas);
  const pad = { l: 48, r: 16, t: 24, b: 28 };
  const points = seriesList.flatMap((s) => s.points).filter((p) => Number.isFinite(p.value));
  ctx.clearRect(0, 0, width, height);
  if (!points.length) return;
  let min = Math.min(...points.map((x) => x.value));
  let max = Math.max(...points.map((x) => x.value));
  if (min === max) { min -= 1; max += 1; }
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * plotH;
  const x = (i, n) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  ctx.strokeStyle = "#e5eaf2";
  for (let i = 0; i <= 4; i += 1) {
    const yy = pad.t + (i / 4) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(width - pad.r, yy); ctx.stroke();
  }
  seriesList.forEach((s) => {
    const p = s.points.filter((v) => Number.isFinite(v.value));
    if (!p.length) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    p.forEach((v, i) => { const xx = x(i, p.length); const yy = y(v.value); if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); });
    ctx.stroke();
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
  const points = state.chartData.ic || [];
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
  const points = state.chartData.ls || [];
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
}

async function loadCharts() {
  if (!state.selectedFactor) return;
  const [ic1, ic5, ic22, longRet, shortRet, lsRet] = await Promise.all([
    fetchEvalSeries(state.selectedFactor, "rank_ic", 1),
    fetchEvalSeries(state.selectedFactor, "rank_ic", 5),
    fetchEvalSeries(state.selectedFactor, "rank_ic", 22),
    fetchNav(state.selectedFactor, "long_ret", 22),
    fetchNav(state.selectedFactor, "short_ret", 22),
    fetchNav(state.selectedFactor, "long_short_ret", 22),
  ]);
  state.chartData.ic = mergeIC(ic1.series, ic5.series, ic22.series);
  state.chartData.ls = mergeLS(longRet.series, shortRet.series, lsRet.series);
  document.getElementById("icChartTitle").textContent = state.selectedFactor;
  document.getElementById("lsChartTitle").textContent = state.selectedFactor;
  renderIcChart();
  renderLongShortChart();
}

function chooseDefaultFactor() {
  state.selectedFactor = state.factors[0]?.factor_name || null;
  document.getElementById("selectedFactorHint").textContent = state.selectedFactor ? `当前: ${state.selectedFactor}` : "";
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
  if (!latest) { box.textContent = "暂无任务记录"; return; }
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
}

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
document.getElementById("searchInput").addEventListener("input", renderFactors);
document.getElementById("showJobItemsBtn").addEventListener("click", showLatestJobItems);
["toggleIc1", "toggleIc5", "toggleIc22"].forEach((id) => document.getElementById(id).addEventListener("change", renderIcChart));
["toggleLong", "toggleShort", "toggleLongShort"].forEach((id) => document.getElementById(id).addEventListener("change", renderLongShortChart));
window.addEventListener("resize", () => { renderIcChart(); renderLongShortChart(); });

loadDashboard().catch((err) => {
  console.error(err);
  alert(`看板加载失败: ${err.message}`);
});
