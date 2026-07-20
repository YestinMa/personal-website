import { useEffect, useState } from "react";
import { ChartCard } from "./ChartCard";
import { fetchManifest } from "./dataClient";
import type { Manifest } from "./types";
import "./styles.css";

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchManifest(controller.signal).then(setManifest).catch((reason: Error) => {
      if (reason.name !== "AbortError") setError(reason.message);
    });
    return () => controller.abort();
  }, [retry]);

  return (
    <div className="project-page">
      <header className="site-header">
        <a className="site-mark" href="../index.html" aria-label="Yuyao Ma home">YM</a>
        <button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen((value) => !value)}>
          <span /><span /><span /><span className="sr-only">Toggle navigation</span>
        </button>
        <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} id="site-navigation" aria-label="Primary navigation">
          <a className="active" href="../work.html" aria-current="page">Work</a>
          <a href="../notes-blogs.html">Notes</a>
          <a href="../index.html">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main className="project-main">
        <a className="project-back" href="../work.html">← Selected Work</a>
        <header className="project-hero">
          <p className="project-kicker">Financial Engineering / Interactive Research</p>
          <h1>FCN Pricing<br />&amp; Hedging</h1>
          <p>Monte Carlo 与 FFT 定价、风险曲面、动态对冲和损益归因的交互式实验结果。</p>
          <a className="notes-link" href="../blog/基于蒙特卡洛和fft方法的fcn定价分析.html">阅读技术推导 →</a>
        </header>

        {error ? <div className="manifest-error"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>重新加载全部图表</button></div> : null}
        {!manifest && !error ? <div className="manifest-loading">正在加载研究结果…</div> : null}
        {manifest?.charts.map((chart, index) => <ChartCard key={chart.chart_id} chart={chart} index={index} />)}
      </main>

      <footer className="site-footer" id="contact">
        <p>© 2026 YUYAO MA</p>
        <div><a href="mailto:yestinma@outlook.com">Email</a><a href="../work.html">Work</a><a href="../notes-blogs.html">Notes</a></div>
      </footer>
    </div>
  );
}
