import { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SAMPLE_DATA = '23, 18, 31, 45, 19, 22, 87, 24, 27, 21, 19, 35, 18, 26, 20';

export default function DataAnalyzer() {
  const [rawInput, setRawInput] = useState(SAMPLE_DATA);
  const [mode, setMode] = useState<'population' | 'sample'>('population');
  const [shift, setShift] = useState(0);
  const [scale, setScale] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const [shiftScaleResult, setShiftScaleResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseData = () => rawInput.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

  const analyze = useCallback(async () => {
    const data = parseData();
    if (data.length < 2) { setError('Enter at least 2 numbers.'); return; }
    setLoading(true); setError('');
    try {
      const [statsRes, ssRes] = await Promise.all([
        api.post('/stats/descriptive', { data, population: mode === 'population' }),
        api.post('/stats/shift-scale', { data, shift, scale }),
      ]);
      setStats(statsRes.data);
      setShiftScaleResult(ssRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, [rawInput, mode, shift, scale]);

  const boxPlotData = stats ? {
    labels: ['Dataset'],
    datasets: [
      {
        label: 'Normal',
        data: parseData().filter((v: number) => v >= stats.lower_fence && v <= stats.upper_fence),
        backgroundColor: 'rgba(124,110,230,0.7)',
        borderColor: '#7c6ee6',
        borderWidth: 1,
      },
      {
        label: 'Outliers',
        data: stats.outliers,
        backgroundColor: 'rgba(248,113,113,0.8)',
        borderColor: '#f87171',
        borderWidth: 1,
      },
    ],
  } : null;

  const shiftScaleChartData = shiftScaleResult ? {
    labels: shiftScaleResult.original.data.map((_: number, i: number) => `#${i + 1}`),
    datasets: [
      {
        label: 'Original',
        data: shiftScaleResult.original.data,
        backgroundColor: 'rgba(124,110,230,0.5)',
        borderColor: '#7c6ee6',
        borderWidth: 1,
      },
      {
        label: `Transformed (×${scale} + ${shift})`,
        data: shiftScaleResult.transformed.data,
        backgroundColor: 'rgba(56,212,196,0.5)',
        borderColor: '#38d4c4',
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8892a4' } } },
    scales: {
      x: { ticks: { color: '#4e5566' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#4e5566' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">📊 Data Analyzer</h1>
        <p className="section-desc">Paste your dataset to instantly compute descriptive statistics, detect outliers via the IQR rule, and explore how shifting & scaling transforms your data.</p>
      </div>

      <div className="grid-sidebar">
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-title">Dataset Input</div>
            <div className="form-group">
              <label className="form-label">Paste numbers (comma or space separated)</label>
              <textarea
                id="dataset-input"
                className="form-textarea"
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                placeholder="e.g. 23, 18, 31, 45..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Calculation Mode</label>
              <div className="toggle-group">
                <button id="mode-population" className={`toggle-btn ${mode === 'population' ? 'active' : ''}`} onClick={() => setMode('population')}>Population (σ)</button>
                <button id="mode-sample" className={`toggle-btn ${mode === 'sample' ? 'active' : ''}`} onClick={() => setMode('sample')}>Sample (s)</button>
              </div>
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button id="btn-analyze" className="btn btn-primary" style={{ width: '100%' }} onClick={analyze} disabled={loading}>
              {loading ? '⟳ Computing...' : '🔍 Analyze Dataset'}
            </button>
          </div>

          <div className="card">
            <div className="card-title">Shift & Scale Playground</div>
            <p className="card-subtitle">See how adding (shift) or multiplying (scale) affects mean vs. std dev.</p>
            <div className="slider-group">
              <div className="slider-label-row">
                <span className="slider-name">Shift (add constant)</span>
                <span className="slider-val">{shift > 0 ? `+${shift}` : shift}</span>
              </div>
              <input id="slider-shift" type="range" min="-50" max="50" step="1" value={shift}
                style={{ '--slider-pct': `${((shift + 50) / 100) * 100}%` } as any}
                onChange={e => setShift(Number(e.target.value))} />
            </div>
            <div className="slider-group">
              <div className="slider-label-row">
                <span className="slider-name">Scale (multiply by)</span>
                <span className="slider-val">{scale}×</span>
              </div>
              <input id="slider-scale" type="range" min="0.1" max="5" step="0.1" value={scale}
                style={{ '--slider-pct': `${((scale - 0.1) / 4.9) * 100}%` } as any}
                onChange={e => setScale(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading && <div className="loading-overlay"><div className="spinner" /><span>Computing statistics...</span></div>}

          {stats && !loading && (
            <>
              <div className="card">
                <div className="card-title">Core Statistics <span className="badge badge-purple">{mode}</span></div>
                <div className="grid-4" style={{ marginBottom: '1rem' }}>
                  {[
                    { label: 'Mean', value: stats.mean.toFixed(4), cls: '' },
                    { label: 'Median', value: stats.median.toFixed(4), cls: 'teal' },
                    { label: 'Mode', value: stats.mode.toFixed(4), cls: '' },
                    { label: 'Std Dev', value: stats.std.toFixed(4), cls: 'orange' },
                    { label: 'Variance', value: stats.variance.toFixed(4), cls: '' },
                    { label: 'Range', value: stats.range.toFixed(4), cls: '' },
                    { label: 'Q1', value: stats.q1.toFixed(4), cls: '' },
                    { label: 'Q3', value: stats.q3.toFixed(4), cls: '' },
                    { label: 'IQR', value: stats.iqr.toFixed(4), cls: 'teal' },
                    { label: 'Min', value: stats.min.toFixed(4), cls: '' },
                    { label: 'Max', value: stats.max.toFixed(4), cls: '' },
                    { label: 'n', value: parseData().length, cls: '' },
                  ].map(s => (
                    <div key={s.label} className="stat-cell">
                      <div className="stat-label">{s.label}</div>
                      <div className={`stat-value ${s.cls}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {stats.outliers.length > 0 && (
                  <div className="result-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span className="badge badge-red">⚠ {stats.outliers.length} Outlier{stats.outliers.length > 1 ? 's' : ''} Detected</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fences: [{stats.lower_fence.toFixed(2)}, {stats.upper_fence.toFixed(2)}]</span>
                    </div>
                    <div>{stats.outliers.map((o: number) => <span key={o} className="outlier-tag">{o}</span>)}</div>
                  </div>
                )}
                {stats.outliers.length === 0 && (
                  <div className="result-box">
                    <span className="badge badge-green">✓ No outliers detected</span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fences: [{stats.lower_fence.toFixed(2)}, {stats.upper_fence.toFixed(2)}]</span>
                  </div>
                )}
              </div>

              {shiftScaleResult && (
                <div className="card">
                  <div className="card-title">Shift & Scale Effect</div>
                  <div className="grid-2" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
                    {[
                      { label: 'Original Mean', value: shiftScaleResult.original.mean.toFixed(4), cls: '' },
                      { label: 'Transformed Mean', value: shiftScaleResult.transformed.mean.toFixed(4), cls: 'teal' },
                      { label: 'Original Std', value: shiftScaleResult.original.std.toFixed(4), cls: '' },
                      { label: 'Transformed Std', value: shiftScaleResult.transformed.std.toFixed(4), cls: 'orange' },
                    ].map(s => (
                      <div key={s.label} className="stat-cell">
                        <div className="stat-label">{s.label}</div>
                        <div className={`stat-value ${s.cls}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="result-box">
                    <div className="insight-row"><span className="insight-icon">💡</span><span className="insight-text"><strong>Shift</strong> changes the mean but <strong>doesn't affect</strong> the std dev (spread stays the same).</span></div>
                    <div className="insight-row"><span className="insight-icon">📐</span><span className="insight-text"><strong>Scale</strong> changes both the mean and the std dev by the same factor.</span></div>
                  </div>
                  <div className="chart-container" style={{ height: 220 }}>
                    <Bar data={shiftScaleChartData!} options={chartOptions} />
                  </div>
                </div>
              )}
            </>
          )}

          {!stats && !loading && (
            <div className="loading-overlay" style={{ color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '3rem' }}>📊</span>
              <p>Enter data and click Analyze to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
