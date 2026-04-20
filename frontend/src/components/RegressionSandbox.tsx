import { useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SAMPLE_DATASETS = {
  'Study Hours vs Score': {
    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    y: [45, 52, 58, 64, 68, 73, 79, 82, 88, 93],
  },
  'Temperature vs Ice Cream Sales': {
    x: [60, 65, 70, 75, 80, 85, 90, 95],
    y: [120, 145, 190, 220, 280, 310, 380, 430],
  },
  'Age vs Score (No relation)': {
    x: [22, 25, 27, 30, 32, 35, 38, 42, 45, 50],
    y: [88, 72, 95, 60, 85, 78, 92, 65, 80, 75],
  },
};

export default function RegressionSandbox() {
  const [xInput, setXInput] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
  const [yInput, setYInput] = useState('45, 52, 58, 64, 68, 73, 79, 82, 88, 93');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseList = (s: string) => s.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

  const loadSample = (name: string) => {
    const d = SAMPLE_DATASETS[name as keyof typeof SAMPLE_DATASETS];
    setXInput(d.x.join(', '));
    setYInput(d.y.join(', '));
    setResult(null);
  };

  const analyze = async () => {
    const x = parseList(xInput);
    const y = parseList(yInput);
    if (x.length !== y.length) { setError('X and Y must have the same number of values.'); return; }
    if (x.length < 3) { setError('Need at least 3 data points.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/regression/analyze', { x, y });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    }
    setLoading(false);
  };

  const scatterData = result ? {
    datasets: [
      {
        label: 'Data Points',
        data: parseList(xInput).map((xi, i) => ({ x: xi, y: parseList(yInput)[i] })),
        backgroundColor: 'rgba(124,110,230,0.8)',
        borderColor: '#7c6ee6',
        pointRadius: 7,
        pointHoverRadius: 9,
        showLine: false,
        type: 'scatter' as const,
      },
      {
        label: 'Regression Line',
        data: result.regression_line.x.map((xi: number, i: number) => ({ x: xi, y: result.regression_line.y[i] })),
        borderColor: '#38d4c4',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0,
        type: 'line' as const,
      },
      {
        label: 'Residuals',
        data: parseList(xInput).map((xi, i) => ({ x: xi, y: parseList(yInput)[i] })),
        borderColor: 'rgba(251,146,60,0.5)',
        backgroundColor: 'transparent',
        pointRadius: 0,
        showLine: false,
        type: 'scatter' as const,
      },
    ],
  } : null;

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8892a4' } } },
    scales: {
      x: { type: 'linear' as const, ticks: { color: '#4e5566' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#4e5566' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  };

  const rStrength = result?.interpretation?.r_strength;
  const rDir = result?.interpretation?.r_direction;
  const r = result?.pearson_r;

  const rColor = !result ? '' :
    Math.abs(r) >= 0.7 ? (rDir === 'positive' ? 'var(--accent-green)' : 'var(--accent-red)') :
    Math.abs(r) >= 0.4 ? 'var(--accent-orange)' : 'var(--text-secondary)';

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">📈 Regression Sandbox</h1>
        <p className="section-desc">Input X and Y variables to compute Pearson correlation, fit a least-squares regression line, and evaluate model accuracy with r² and RMSE.</p>
      </div>

      <div className="grid-sidebar">
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-title">Sample Datasets</div>
            {Object.keys(SAMPLE_DATASETS).map(name => (
              <button key={name} id={`sample-${name.replace(/\s/g,'-')}`} className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'left' }}
                onClick={() => loadSample(name)}>
                📋 {name}
              </button>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Data Input</div>
            <div className="form-group">
              <label className="form-label">X values (comma separated)</label>
              <textarea id="regression-x" className="form-textarea" style={{ minHeight: 70 }}
                value={xInput} onChange={e => setXInput(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Y values (comma separated)</label>
              <textarea id="regression-y" className="form-textarea" style={{ minHeight: 70 }}
                value={yInput} onChange={e => setYInput(e.target.value)} />
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button id="btn-regression-analyze" className="btn btn-primary" style={{ width: '100%' }} onClick={analyze} disabled={loading}>
              {loading ? '⟳ Analyzing...' : '📈 Fit Regression'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading && <div className="loading-overlay"><div className="spinner" /><span>Fitting regression...</span></div>}

          {result && !loading && (
            <>
              {/* Key metrics */}
              <div className="card">
                <div className="card-title">Model Results</div>
                <div className="grid-4" style={{ marginBottom: '1rem', gap: '0.5rem' }}>
                  <div className="stat-cell">
                    <div className="stat-label">Pearson r</div>
                    <div className="stat-value" style={{ color: rColor }}>{r.toFixed(4)}</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">r² (Fit)</div>
                    <div className="stat-value teal">{result.r_squared.toFixed(4)}</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">RMSE</div>
                    <div className="stat-value orange">{result.rmse.toFixed(4)}</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">p-value</div>
                    <div className="stat-value" style={{ color: result.p_value < 0.05 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {result.p_value < 0.0001 ? '<0.0001' : result.p_value.toFixed(4)}
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">Slope (b)</div>
                    <div className="stat-value">{result.slope.toFixed(4)}</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">Intercept (a)</div>
                    <div className="stat-value">{result.intercept.toFixed(4)}</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">Covariance</div>
                    <div className="stat-value">{result.covariance.toFixed(4)}</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">Explained Var.</div>
                    <div className="stat-value green">{(result.r_squared * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="result-box">
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="equation">{result.equation}</div>
                    <span className={`badge ${Math.abs(r) >= 0.7 ? 'badge-green' : Math.abs(r) >= 0.4 ? 'badge-orange' : 'badge-purple'}`}>
                      {rStrength} {rDir} correlation
                    </span>
                  </div>
                  <div className="insight-row">
                    <span className="insight-icon">📐</span>
                    <span className="insight-text">
                      The model explains <strong>{(result.r_squared * 100).toFixed(1)}%</strong> of the variance in Y.
                      The remaining {((1 - result.r_squared) * 100).toFixed(1)}% is unexplained noise.
                    </span>
                  </div>
                  <div className="insight-row">
                    <span className="insight-icon">🎯</span>
                    <span className="insight-text">
                      Average prediction error (RMSE) is <strong>{result.rmse.toFixed(4)}</strong> units.
                    </span>
                  </div>
                </div>
              </div>

              {/* Scatter + regression line */}
              <div className="card">
                <div className="card-title">Scatter Plot with Regression Line</div>
                <div className="chart-container" style={{ height: 320 }}>
                  <Line data={scatterData!} options={chartOpts as any} />
                </div>
              </div>
            </>
          )}

          {!result && !loading && (
            <div className="loading-overlay" style={{ color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '3rem' }}>📈</span>
              <p>Select a sample dataset or enter X/Y values, then click Fit Regression</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
