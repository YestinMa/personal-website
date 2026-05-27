const state = {
  summary: null,
  factors: [],
  jobs: [],
  selectedFactor: null,
  filteredFactors: [],
  chartData: {
    ic: [],
    ls: [],
  },
  ranges: {
    ic: [0, 0],
    ls: [0, 0],
  },
  visibleSeries: {
    ic: {
      ic_1: false,
      ic_5: false,
      ic_22: true,
    },
    ls: {
      long_value: true,
      short_value: true,
      long_short_value: true,
    },
  },
};

const STATIC_MODE = Boolean(window.FACTOR_DASHBOARD_STATIC);

const fmt = (value, digits = 3) => {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(digits);
};

const pct = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${(Number(value) * 100).toFixed(1)}%`;
};

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

function factorDataName(factorName) {
  return encodeURIComponent(factorName || "");
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

async function fetchIc(factorName) {
  const factor = factorDataName(factorName);
  return getJson(STATIC_MODE ? dataPath(`ic/${factor}.json`) : `/api/ic?factor=${factor}`);
}

async function fetchLongShort(factorName) {
  const factor = factorDataName(factorName);
  return getJson(STATIC_MODE ? dataPath(`long-short/${factor}.json`) : `/api/long-short?factor=${factor}`);
}

function setText(id, text) {
  document.getElementById(id).textContent = text ?? "--";
}

function renderSummary() {
  const s = state.summary;
  setText("latestTradeDate", s.latest_trade_date);
  setText("latestFactorDate", s.latest_factor_date);
  setText("activeCount", s.status_counts.active || 0);
  setText("candidateCount", s.status_counts.candidate || 0);
  setText("draftCount", s.status_counts.draft || 0);

  const statusEl = document.getElementById("latestJobStatus");
  const status = s.latest_job?.status || "--";
  statusEl.textContent = status;
  statusEl.className = status;
}

function renderFactors() {
  const tbody = document.getElementById("factorTable");
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  state.filteredFactors = state.factors.filter((item) =>
    item.factor_name.toLowerCase().includes(query)
  );
  document.getElementById("factorCount").textContent = `（共 ${state.filteredFactors.length} 个）`;
  tbody.innerHTML = state.filteredFactors
    .map((item) => {
      const selected = state.selectedFactor === item.factor_name ? "selected" : "";
      return `
        <tr class="${selected}" data-factor="${item.factor_name}">
          <td class="factor-name">${item.factor_name}</td>
          <td><span class="badge ${item.lifecycle_status}">${item.lifecycle_status}</span></td>
          <td>${item.version || "--"}</td>
          <td class="${cssNum(item.ic_1)}">${fmt(item.ic_1)}</td>
          <td class="${cssNum(item.ic_5)}">${fmt(item.ic_5)}</td>
          <td class="${cssNum(item.ic_22)}">${fmt(item.ic_22)}</td>
          <td class="${cssNum(item.sharpe)}">${fmt(item.sharpe, 2)}</td>
          <td>${pct(item.coverage_ratio)}</td>
          <td>${item.latest_factor_date || "--"}</td>
        </tr>`;
    })
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
      </tr>`)
    .join("");
}

function drawEmpty(ctx, width, height, text) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#6b7280";
  ctx.font = "14px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
}

function setupCanvas(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = Math.max(320, Math.floor(box.width));
  const cssHeight = Math.max(220, Math.floor(box.height));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.floor(cssWidth * ratio);
  canvas.height = Math.floor(cssHeight * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: cssWidth, height: cssHeight };
}

function drawLineChart(canvasId, seriesList, options = {}) {
  const canvas = document.getElementById(canvasId);
  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { left: 48, right: 18, top: 28, bottom: 34 };
  const allPoints = seriesList.flatMap((s) => s.points || []).filter((p) => Number.isFinite(p.value));
  if (!allPoints.length) {
    drawEmpty(ctx, width, height, "暂无可展示数据");
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
    (item.points || []).length > (best.points || []).length ? item : best
  , { points: [] });
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
    ctx.fillStyle = "#475569";
    ctx.textAlign = "left";
    ctx.fillText(series.name, legendX + 28, 18);
    legendX += Math.max(86, series.name.length * 13 + 44);
  });
}

function normalizeRange(chartKey, total) {
  if (total <= 0) {
    state.ranges[chartKey] = [0, 0];
    return [0, 0];
  }
  let [start, end] = state.ranges[chartKey];
  start = Math.max(0, Math.min(Number(start) || 0, total - 1));
  end = Math.max(0, Math.min(Number(end) || total - 1, total - 1));
  if (start > end) [start, end] = [end, start];
  state.ranges[chartKey] = [start, end];
  return [start, end];
}

function resetRange(chartKey, total) {
  state.ranges[chartKey] = total > 0 ? [0, total - 1] : [0, 0];
  updateRangeInputs(chartKey);
}

function pointDate(item) {
  return item?.date || item?.trade_date || "--";
}

function updateRangeInputs(chartKey) {
  const data = state.chartData[chartKey] || [];
  const startInput = document.getElementById(`${chartKey}RangeStart`);
  const endInput = document.getElementById(`${chartKey}RangeEnd`);
  const label = document.getElementById(`${chartKey}RangeLabel`);
  const max = Math.max(0, data.length - 1);
  const [start, end] = normalizeRange(chartKey, data.length);
  startInput.min = "0";
  startInput.max = String(max);
  startInput.value = String(start);
  endInput.min = "0";
  endInput.max = String(max);
  endInput.value = String(end);
  startInput.disabled = data.length <= 1;
  endInput.disabled = data.length <= 1;
  label.textContent = data.length ? `${pointDate(data[start])} ~ ${pointDate(data[end])}` : "--";
}

function onRangeInput(chartKey, side) {
  const startInput = document.getElementById(`${chartKey}RangeStart`);
  const endInput = document.getElementById(`${chartKey}RangeEnd`);
  let start = Number(startInput.value);
  let end = Number(endInput.value);
  if (side === "start" && start > end) {
    start = end;
    startInput.value = String(start);
  }
  if (side === "end" && end < start) {
    end = start;
    endInput.value = String(end);
  }
  state.ranges[chartKey] = [start, end];
  updateRangeInputs(chartKey);
  if (chartKey === "ic") renderIcChart();
  if (chartKey === "ls") renderLongShortChart();
}

function activateRangeThumb(input) {
  const wrap = input.closest(".dual-range");
  wrap?.querySelectorAll("input").forEach((item) => item.classList.remove("is-active"));
  input.classList.add("is-active");
}

function sliceByRange(chartKey) {
  const data = state.chartData[chartKey] || [];
  if (!data.length) return [];
  const [start, end] = normalizeRange(chartKey, data.length);
  return data.slice(start, end + 1);
}

function selectedSeries(chartKey) {
  return state.visibleSeries[chartKey] || {};
}

function readSeriesToggles(chartKey) {
  const visible = {};
  document.querySelectorAll(`.series-toggles[data-chart="${chartKey}"] input`).forEach((input) => {
    visible[input.dataset.series] = input.checked;
  });
  state.visibleSeries[chartKey] = visible;
}

function normalizeNetSeries(points, key) {
  const values = points.map((p) => Number(p[key]));
  const base = values.find((value) => Number.isFinite(value) && value !== 0);
  if (!Number.isFinite(base) || base === 0) {
    return points.map((p) => ({ date: p.date, value: Number.NaN }));
  }
  return points.map((p) => {
    const value = Number(p[key]);
    return {
      date: p.date,
      value: Number.isFinite(value) ? value / base : Number.NaN,
    };
  });
}

function renderIcChart() {
  updateRangeInputs("ic");
  const points = sliceByRange("ic");
  const visible = selectedSeries("ic");
  const series = [];
  if (visible.ic_1) {
    series.push({
      name: "IC_1",
      color: "#2563eb",
      points: points.map((p) => ({ date: p.trade_date, value: Number(p.ic_1) })),
    });
  }
  if (visible.ic_5) {
    series.push({
      name: "IC_5",
      color: "#2f9e65",
      points: points.map((p) => ({ date: p.trade_date, value: Number(p.ic_5) })),
    });
  }
  if (visible.ic_22) {
    series.push({
      name: "IC_22",
      color: "#e79b28",
      points: points.map((p) => ({ date: p.trade_date, value: Number(p.ic_22) })),
    });
  }
  drawLineChart("icChart", series, { zeroLine: true });
}

function renderLongShortChart() {
  updateRangeInputs("ls");
  const points = sliceByRange("ls");
  const visible = selectedSeries("ls");
  const series = [];
  if (visible.long_value) {
    series.push({
      name: "多头",
      color: "#2563eb",
      points: normalizeNetSeries(points, "long_value"),
    });
  }
  if (visible.short_value) {
    series.push({
      name: "空头",
      color: "#ef5552",
      points: normalizeNetSeries(points, "short_value"),
    });
  }
  if (visible.long_short_value) {
    series.push({
      name: "多空对冲",
      color: "#2f9e65",
      points: normalizeNetSeries(points, "long_short_value"),
    });
  }
  drawLineChart("lsChart", series);
}

async function loadCharts() {
  const [ic, ls] = await Promise.all([
    fetchIc(state.selectedFactor || ""),
    fetchLongShort(state.selectedFactor || ""),
  ]);
  document.getElementById("icChartTitle").textContent = ic.factor_name || state.selectedFactor || "--";
  document.getElementById("lsChartTitle").textContent = ls.factor_name || state.selectedFactor || "--";
  state.chartData.ic = ic.series || [];
  state.chartData.ls = ls.series || [];
  resetRange("ic", state.chartData.ic.length);
  resetRange("ls", state.chartData.ls.length);
  renderIcChart();
  renderLongShortChart();
}

function chooseDefaultFactor() {
  const firstWithMetrics = state.factors.find((item) => item.ic_5 !== null && item.ic_5 !== undefined);
  const first = firstWithMetrics || state.factors[0];
  state.selectedFactor = first?.factor_name || null;
  document.getElementById("selectedFactorHint").textContent = state.selectedFactor ? `当前：${state.selectedFactor}` : "";
}

async function selectFactor(factorName) {
  state.selectedFactor = factorName;
  document.getElementById("selectedFactorHint").textContent = `当前：${factorName}`;
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
  if (STATIC_MODE) {
    box.textContent = "静态快照暂不包含任务明细";
    return;
  }
  const items = await getJson(`/api/job-items?run_id=${encodeURIComponent(latest.run_id)}`);
  box.innerHTML = items.length
    ? items.map((item) => `
      <div class="job-item-row">
        <strong>${item.factor_name}</strong>
        <span class="badge ${item.status}">${item.status}</span>
        <span>${item.error_type || item.rows_written || ""} ${item.error_message || ""}</span>
      </div>`)
      .join("")
    : "最近任务没有明细记录";
}

function showBuildingToast(label) {
  const toast = document.getElementById("toast");
  toast.textContent = `${label} 正在施工中`;
  toast.hidden = false;
  window.clearTimeout(showBuildingToast.timer);
  showBuildingToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 1800);
}

function setupNavigation() {
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelectorAll("nav a").forEach((item) => item.classList.remove("active"));
      document.querySelector('nav a[data-view="overview"]').classList.add("active");
      if (link.dataset.view !== "overview") {
        showBuildingToast(link.textContent.trim());
        return;
      }
      window.location.hash = "overview";
    });
  });
}

async function loadDashboard() {
  document.body.classList.add("loading");
  const [summary, factors, jobs] = await Promise.all([
    fetchSummary(),
    fetchFactors(),
    fetchJobs(),
  ]);
  state.summary = summary;
  state.factors = factors;
  state.jobs = jobs;
  if (!state.selectedFactor) chooseDefaultFactor();
  renderSummary();
  renderFactors();
  renderJobs();
  await loadCharts();
  document.body.classList.remove("loading");
}

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
document.getElementById("searchInput").addEventListener("input", renderFactors);
document.getElementById("showJobItemsBtn").addEventListener("click", showLatestJobItems);
document.getElementById("icRangeStart").addEventListener("input", () => onRangeInput("ic", "start"));
document.getElementById("icRangeEnd").addEventListener("input", () => onRangeInput("ic", "end"));
document.getElementById("lsRangeStart").addEventListener("input", () => onRangeInput("ls", "start"));
document.getElementById("lsRangeEnd").addEventListener("input", () => onRangeInput("ls", "end"));
document.querySelectorAll(".dual-range input").forEach((input) => {
  input.addEventListener("pointerdown", () => activateRangeThumb(input));
  input.addEventListener("focus", () => activateRangeThumb(input));
});
document.querySelectorAll('.series-toggles[data-chart="ic"] input').forEach((input) => {
  input.addEventListener("change", () => {
    readSeriesToggles("ic");
    renderIcChart();
  });
});
document.querySelectorAll('.series-toggles[data-chart="ls"] input').forEach((input) => {
  input.addEventListener("change", () => {
    readSeriesToggles("ls");
    renderLongShortChart();
  });
});
window.addEventListener("resize", () => {
  renderIcChart();
  renderLongShortChart();
});
setupNavigation();
readSeriesToggles("ic");
readSeriesToggles("ls");

loadDashboard().catch((err) => {
  console.error(err);
  alert(`看板加载失败：${err.message}`);
});
