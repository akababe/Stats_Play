import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CHART_OPTIONS = (label: string) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, title: { display: true, text: label, color: '#8892a4', font: { size: 13 } } },
  scales: {
    x: { ticks: { color: '#4e5566', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#4e5566' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
  },
});

// ── Sub-component: Normal Distribution ──────────
function NormalDist() {
  const [mean, setMean] = useState(0);
  const [std, setStd] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (std <= 0) return;
    setLoading(true);
    try {
      const res = await api.post('/distributions/normal', { mean, std });
      setResult(res.data);
    } catch {}
    setLoading(false);
  }, [mean, std]);

  useEffect(() => { fetch(); }, [fetch]);

  const buildDatasets = () => {
    if (!result) return { labels: [], datasets: [] };
    const x = result.x.map((v: number) => v.toFixed(2));
    const [r1l, r1r] = result.regions.one_sigma;
    const [r2l, r2r] = result.regions.two_sigma;
    const [r3l, r3r] = result.regions.three_sigma;

    const makeRegion = (color: string, lower: number, upper: number) =>
      result.x.map((xv: number, i: number) =>
        xv >= lower && xv <= upper ? result.y[i] : 0);

    return {
      labels: x,
      datasets: [
        { label: '99.7%', data: makeRegion('#facc15', r3l, r3r), backgroundColor: 'rgba(250,204,21,0.15)', fill: true, borderWidth: 0, pointRadius: 0 },
        { label: '95%',   data: makeRegion('#38d4c4', r2l, r2r), backgroundColor: 'rgba(56,212,196,0.2)',  fill: true, borderWidth: 0, pointRadius: 0 },
        { label: '68%',   data: makeRegion('#7c6ee6', r1l, r1r), backgroundColor: 'rgba(124,110,230,0.35)', fill: true, borderWidth: 0, pointRadius: 0 },
        { label: 'Curve', data: result.y, borderColor: '#7c6ee6', backgroundColor: 'transparent', borderWidth: 2, fill: false, pointRadius: 0, tension: 0.4 },
      ],
    };
  };

  return (
    <div className="card">
      <div className="card-title">🔔 Empirical Rule (68-95-99.7)</div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="slider-name">Mean (μ)</span>
              <span className="slider-val">{mean}</span>
            </div>
            <input id="normal-mean" type="range" min="-10" max="10" step="0.5" value={mean}
              style={{ '--slider-pct': `${((mean + 10) / 20) * 100}%` } as any}
              onChange={e => setMean(Number(e.target.value))} />
          </div>
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="slider-name">Std Dev (σ)</span>
              <span className="slider-val">{std}</span>
            </div>
            <input id="normal-std" type="range" min="0.1" max="5" step="0.1" value={std}
              style={{ '--slider-pct': `${((std - 0.1) / 4.9) * 100}%` } as any}
              onChange={e => setStd(Number(e.target.value))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[['rgba(124,110,230,0.6)', '68%'], ['rgba(56,212,196,0.6)', '95%'], ['rgba(250,204,21,0.6)', '99.7%']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: 12, height: 12, background: c as string, borderRadius: 2 }} />
              {l}
            </div>
          ))}
        </div>
      </div>
      <div className="chart-container" style={{ height: 240 }}>
        {result && !loading ? (
          <Line data={buildDatasets()} options={{ ...CHART_OPTIONS(`Normal(μ=${mean}, σ=${std})`), plugins: { ...CHART_OPTIONS('').plugins, legend: { labels: { color: '#8892a4', boxWidth: 12 } } } } as any} />
        ) : <div className="loading-overlay"><div className="spinner" /></div>}
      </div>
    </div>
  );
}

// ── Sub-component: Discrete Distributions ───────
function DiscreteDist() {
  const [distType, setDistType] = useState<'bernoulli' | 'binomial' | 'poisson' | 'geometric'>('binomial');
  const [p, setP] = useState(0.5);
  const [n, setN] = useState(10);
  const [lam, setLam] = useState(3);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post('/distributions/discrete', { distribution: distType, p, n, lam });
      setResult(res.data);
    } catch {}
    setLoading(false);
  }, [distType, p, n, lam]);

  useEffect(() => { fetch(); }, [fetch]);

  const chartData = result ? {
    labels: result.k.map(String),
    datasets: [{
      label: 'P(X = k)',
      data: result.pmf,
      backgroundColor: result.k.map((_: number, i: number) =>
        result.pmf[i] === Math.max(...result.pmf) ? 'rgba(124,110,230,0.9)' : 'rgba(91,141,245,0.5)'),
      borderColor: '#5b8df5',
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null;

  return (
    <div className="card">
      <div className="card-title">🎲 Discrete Probability Calculator</div>
      <div className="form-group">
        <label className="form-label">Distribution Type</label>
        <select id="dist-type-select" className="form-select" value={distType} onChange={e => setDistType(e.target.value as any)}>
          <option value="bernoulli">Bernoulli (single trial)</option>
          <option value="binomial">Binomial (n trials)</option>
          <option value="poisson">Poisson (rare events)</option>
          <option value="geometric">Geometric (trials until success)</option>
        </select>
      </div>

      {(distType === 'bernoulli' || distType === 'binomial' || distType === 'geometric') && (
        <div className="slider-group">
          <div className="slider-label-row">
            <span className="slider-name">Probability of success (p)</span>
            <span className="slider-val">{p}</span>
          </div>
          <input id="discrete-p" type="range" min="0.01" max="0.99" step="0.01" value={p}
            style={{ '--slider-pct': `${p * 100}%` } as any}
            onChange={e => setP(Number(e.target.value))} />
        </div>
      )}

      {distType === 'binomial' && (
        <div className="slider-group">
          <div className="slider-label-row">
            <span className="slider-name">Number of trials (n)</span>
            <span className="slider-val">{n}</span>
          </div>
          <input id="discrete-n" type="range" min="1" max="50" step="1" value={n}
            style={{ '--slider-pct': `${((n - 1) / 49) * 100}%` } as any}
            onChange={e => setN(Number(e.target.value))} />
        </div>
      )}

      {distType === 'poisson' && (
        <div className="slider-group">
          <div className="slider-label-row">
            <span className="slider-name">Average rate (λ)</span>
            <span className="slider-val">{lam}</span>
          </div>
          <input id="discrete-lambda" type="range" min="0.1" max="20" step="0.1" value={lam}
            style={{ '--slider-pct': `${((lam - 0.1) / 19.9) * 100}%` } as any}
            onChange={e => setLam(Number(e.target.value))} />
        </div>
      )}

      {result && (
        <div className="grid-3" style={{ margin: '0.75rem 0', gap: '0.5rem' }}>
          <div className="stat-cell"><div className="stat-label">Mean</div><div className="stat-value">{result.mean.toFixed(4)}</div></div>
          <div className="stat-cell"><div className="stat-label">Variance</div><div className="stat-value orange">{result.variance.toFixed(4)}</div></div>
          <div className="stat-cell"><div className="stat-label">Std Dev</div><div className="stat-value teal">{result.std.toFixed(4)}</div></div>
        </div>
      )}

      <div className="chart-container" style={{ height: 220 }}>
        {chartData && !loading ? (
          <Bar data={chartData} options={CHART_OPTIONS(`P(X = k) — ${distType}`) as any} />
        ) : <div className="loading-overlay"><div className="spinner" /></div>}
      </div>
    </div>
  );
}

// ── Sub-component: CLT Simulator ────────────────
function CLTSimulator() {
  const [popType, setPopType] = useState<'exponential' | 'uniform' | 'bimodal'>('exponential');
  const [sampleSize, setSampleSize] = useState(30);
  const [numSamples, setNumSamples] = useState(200);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const animRef = useRef<any>(null);

  const runSimulation = async () => {
    setLoading(true); setDrawn(0); setResult(null);
    try {
      const res = await api.post('/distributions/clt', { population_type: popType, sample_size: sampleSize, num_samples: numSamples });
      setResult(res.data);
      // Animate drawing samples
      let i = 0;
      animRef.current = setInterval(() => {
        i += Math.max(1, Math.floor(numSamples / 60));
        setDrawn(Math.min(i, numSamples));
        if (i >= numSamples) clearInterval(animRef.current);
      }, 50);
    } catch {}
    setLoading(false);
  };

  const chartData = result && drawn > 0 ? {
    labels: result.histogram.bin_centers.map((v: number) => v.toFixed(2)),
    datasets: [{
      label: 'Sample Means',
      data: result.histogram.counts.map((c: number) => Math.round(c * (drawn / result.num_samples))),
      backgroundColor: 'rgba(124,110,230,0.6)',
      borderColor: '#7c6ee6',
      borderWidth: 1,
      borderRadius: 3,
    }],
  } : null;

  return (
    <div className="card">
      <div className="card-title">🎬 Central Limit Theorem Simulator</div>
      <p className="card-subtitle">Watch the distribution of sample means converge to a normal curve, regardless of the original population shape.</p>

      <div className="form-group">
        <label className="form-label">Population Shape</label>
        <div className="toggle-group">
          {(['exponential', 'uniform', 'bimodal'] as const).map(t => (
            <button key={t} id={`clt-pop-${t}`} className={`toggle-btn ${popType === t ? 'active' : ''}`} onClick={() => setPopType(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="slider-name">Sample size (n)</span>
              <span className="slider-val">{sampleSize}</span>
            </div>
            <input id="clt-n" type="range" min="5" max="100" step="5" value={sampleSize}
              style={{ '--slider-pct': `${((sampleSize - 5) / 95) * 100}%` } as any}
              onChange={e => setSampleSize(Number(e.target.value))} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="slider-name">Number of samples</span>
              <span className="slider-val">{numSamples}</span>
            </div>
            <input id="clt-num" type="range" min="50" max="1000" step="50" value={numSamples}
              style={{ '--slider-pct': `${((numSamples - 50) / 950) * 100}%` } as any}
              onChange={e => setNumSamples(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <button id="btn-clt-run" className="btn btn-primary btn-sm" onClick={runSimulation} disabled={loading} style={{ marginBottom: '1rem' }}>
        {loading ? '⟳ Simulating...' : '▶ Draw Samples'}
      </button>

      {result && (
        <div className="grid-4" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div className="stat-cell"><div className="stat-label">Samples drawn</div><div className="stat-value">{drawn}/{result.num_samples}</div></div>
          <div className="stat-cell"><div className="stat-label">Pop. Mean</div><div className="stat-value">{result.population_mean.toFixed(3)}</div></div>
          <div className="stat-cell"><div className="stat-label">x̄ Mean</div><div className="stat-value teal">{result.sample_means_mean.toFixed(3)}</div></div>
          <div className="stat-cell"><div className="stat-label">SE (σ/√n)</div><div className="stat-value orange">{result.expected_std_error.toFixed(3)}</div></div>
        </div>
      )}

      <div className="chart-container" style={{ height: 220 }}>
        {chartData ? (
          <Bar data={chartData} options={CHART_OPTIONS('Distribution of Sample Means') as any} />
        ) : (
          <div className="loading-overlay" style={{ color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem' }}>🎬</span>
            <p>Click "Draw Samples" to run the simulation</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DistributionVisualizer() {
  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">🔔 Distribution Visualizer</h1>
        <p className="section-desc">Explore normal distributions, discrete probability models, and watch the Central Limit Theorem unfold in real-time.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <NormalDist />
        <div className="grid-2">
          <DiscreteDist />
          <CLTSimulator />
        </div>
      </div>
    </div>
  );
}
