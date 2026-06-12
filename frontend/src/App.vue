<script setup>
import { onMounted, ref, nextTick } from "vue";
import * as echarts from "echarts";
import { fetchStrategyDashboard } from "./api";

const loading = ref(true);
const error = ref("");
const dashboard = ref(null);
const equityRef = ref(null);
const drawdownRef = ref(null);
const monthlyRef = ref(null);
const positionRef = ref(null);

let equityChart;
let drawdownChart;
let monthlyChart;
let positionChart;

function pct(v) {
  return `${(v * 100).toFixed(2)}%`;
}

function buildMonthlyHeatmap(points) {
  const map = new Map();
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const month = curr.date.slice(0, 7);
    const ret = (curr.value - prev.value) / prev.value;
    map.set(month, (map.get(month) || 0) + ret);
  }
  return [...map.entries()].map(([m, v]) => [m, Number((v * 100).toFixed(2))]);
}

function renderCharts() {
  if (!dashboard.value || !equityRef.value || !drawdownRef.value || !monthlyRef.value || !positionRef.value) return;

  const dates = dashboard.value.equity_curve.map((p) => p.date);
  const equity = dashboard.value.equity_curve.map((p) => p.value);
  const drawdown = dashboard.value.drawdown_curve.map((p) => p.value);
  const monthly = buildMonthlyHeatmap(dashboard.value.equity_curve);

  equityChart?.dispose();
  drawdownChart?.dispose();
  monthlyChart?.dispose();
  positionChart?.dispose();

  equityChart = echarts.init(equityRef.value);
  drawdownChart = echarts.init(drawdownRef.value);
  monthlyChart = echarts.init(monthlyRef.value);
  positionChart = echarts.init(positionRef.value);

  equityChart.setOption({
    title: { text: "净值曲线", textStyle: { color: "#0f172a", fontSize: 14 } },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: dates, boundaryGap: false },
    yAxis: { type: "value", scale: true, splitLine: { lineStyle: { color: "#e5e7eb" } } },
    series: [{ type: "line", data: equity, smooth: true, showSymbol: false, lineStyle: { color: "#2563eb" }, areaStyle: { opacity: 0.12, color: "#93c5fd" } }],
  });

  drawdownChart.setOption({
    title: { text: "回撤分析", textStyle: { color: "#0f172a", fontSize: 14 } },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: dates, boundaryGap: false },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (v) => `${(v * 100).toFixed(0)}%` },
      splitLine: { lineStyle: { color: "#e5e7eb" } },
    },
    series: [{ type: "line", data: drawdown, smooth: true, showSymbol: false, lineStyle: { color: "#ef4444" }, areaStyle: { opacity: 0.1, color: "#fecaca" } }],
  });

  monthlyChart.setOption({
    title: { text: "月度收益热力图", textStyle: { color: "#0f172a", fontSize: 14 } },
    tooltip: { formatter: (p) => `${p.value[0]}: ${p.value[1]}%` },
    visualMap: {
      min: -5,
      max: 5,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#fecaca", "#f8fafc", "#bbf7d0"] },
    },
    xAxis: { type: "category", data: monthly.map((m) => m[0]) },
    yAxis: { type: "category", data: ["Monthly"] },
    series: [{ type: "heatmap", data: monthly.map((m) => [m[0], "Monthly", m[1]]) }],
  });

  positionChart.setOption({
    title: { text: "持仓分布", textStyle: { color: "#0f172a", fontSize: 14 } },
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        data: dashboard.value.positions.map((p) => ({ name: p.symbol, value: Number((p.weight * 100).toFixed(2)) })),
      },
    ],
  });
}

onMounted(async () => {
  try {
    dashboard.value = await fetchStrategyDashboard();
    await nextTick();
    renderCharts();
    window.addEventListener("resize", () => {
      equityChart?.resize();
      drawdownChart?.resize();
      monthlyChart?.resize();
      positionChart?.resize();
    });
  } catch (e) {
    error.value = e.message || "Failed to load dashboard data";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="layout">
    <aside class="sidebar">
      <div class="logo">量化平台</div>
      <nav class="menu">
        <a class="menu-item active" href="#">策略看板</a>
        <a class="menu-item" href="#">因子研究</a>
        <a class="menu-item" href="#">开发日志</a>
      </nav>
    </aside>

    <section class="main">
      <header class="topbar">
        <h1>多因子选股策略 V2.3</h1>
        <span class="tag">运行中</span>
      </header>

      <section v-if="loading" class="status">Loading dashboard...</section>
      <section v-else-if="error" class="status error">{{ error }}</section>

      <section v-else class="content">
        <div class="metrics">
          <article class="metric"><span>策略年化收益</span><strong>{{ pct(dashboard.metrics.annual_return) }}</strong></article>
          <article class="metric"><span>超额年化收益</span><strong>{{ pct(dashboard.metrics.total_return - 0.0938) }}</strong></article>
          <article class="metric"><span>信息比率</span><strong>{{ dashboard.metrics.sharpe.toFixed(2) }}</strong></article>
          <article class="metric"><span>最大回撤</span><strong class="danger">{{ pct(dashboard.metrics.max_drawdown) }}</strong></article>
          <article class="metric"><span>年化波动率</span><strong>{{ pct(dashboard.metrics.annual_volatility) }}</strong></article>
        </div>

        <div class="grid two">
          <section class="panel"><div ref="equityRef" class="chart"></div></section>
          <section class="panel"><div ref="drawdownRef" class="chart"></div></section>
        </div>

        <div class="grid three">
          <section class="panel"><div ref="monthlyRef" class="chart sm"></div></section>
          <section class="panel"><div ref="positionRef" class="chart sm"></div></section>
          <section class="panel logs">
            <h3>开发日志</h3>
            <ul>
              <li>2026-05-11 10:30 接入 FastAPI dashboard 接口</li>
              <li>2026-05-11 10:20 完成白色主题看板布局</li>
              <li>2026-05-11 10:10 增加 ECharts 多图联动</li>
            </ul>
          </section>
        </div>
      </section>
    </section>
  </main>
</template>
