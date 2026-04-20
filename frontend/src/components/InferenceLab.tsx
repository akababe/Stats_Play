import { useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MIN_STEPS = 5;

// ── Confidence Interval ──────────────────────────
function ConfidenceInterval() {
  const [sampleMean, setSampleMean] = useState('72');
  const [sampleStd, setSampleStd] = useState('15');
  const [n, setN] = useState('30');
  const [sigmaKnown, setSigmaKnown] = useState(false);
  const [popStd, setPopStd] = useState('15');
  const [confidence, setConfidence] = useState(0.95);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const compute = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/inference/confidence-interval', {
        sample_mean: parseFloat(sampleMean),
        sample_std: parseFloat(sampleStd),
        n: parseInt(n),
        confidence_level: confidence,
        sigma_known: sigmaKnown,
        population_std: sigmaKnown ? parseFloat(popStd) : null,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    }
    setLoading(false);
  };

  const chartData = result ? {
    labels: result.curve.x.map((v: number) => v.toFixed(2)),
    datasets: [
      {
        label: 'Critical Region',
        data: result.curve.x.map((v: number, i: number) =>
          Math.abs(v) >= result.critical_value_positive ? result.curve.y[i] : 0),
        backgroundColor: 'rgba(248,113,113,0.25)',
        fill: true, borderWidth: 0, pointRadius: 0,
      },
      {
        label: 'Acceptance Region',
        data: result.curve.x.map((v: number, i: number) =>
          Math.abs(v) < result.critical_value_positive ? result.curve.y[i] : 0),
        backgroundColor: 'rgba(74,222,128,0.15)',
        fill: true, borderWidth: 0, pointRadius: 0,
      },
      {
        label: 'Distribution',
        data: result.curve.y,
        borderColor: '#7c6ee6',
        backgroundColor: 'transparent',
        borderWidth: 2, pointRadius: 0, tension: 0.4,
      },
    ],
  } : null;

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#4e5566', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#4e5566' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
    },
  };

  return (
    <div className="card">
      <div className="card-title">📏 Confidence Interval Generator</div>

      <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
        {[
          { label: 'Sample Mean (x̄)', val: sampleMean, set: setSampleMean, id: 'ci-mean' },
          { label: 'Sample Std Dev (s)', val: sampleStd, set: setSampleStd, id: 'ci-std' },
          { label: 'Sample Size (n)', val: n, set: setN, id: 'ci-n' },
        ].map(f => (
          <div key={f.id} className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{f.label}</label>
            <input id={f.id} type="number" className="form-input" value={f.val} onChange={e => f.set(e.target.value)} />
          </div>
        ))}
      </div>

      <div className="slider-group">
        <div className="slider-label-row">
          <span className="slider-name">Confidence Level</span>
          <span className="slider-val">{(confidence * 100).toFixed(0)}%</span>
        </div>
        <input id="ci-confidence" type="range" min="0.80" max="0.99" step="0.01" value={confidence}
          style={{ '--slider-pct': `${((confidence - 0.8) / 0.19) * 100}%` } as any}
          onChange={e => setConfidence(Number(e.target.value))} />
      </div>

      <div className="form-group">
        <label className="form-label">Population σ Known?</label>
        <div className="toggle-group">
          <button id="ci-sigma-no" className={`toggle-btn ${!sigmaKnown ? 'active' : ''}`} onClick={() => setSigmaKnown(false)}>No → T-test</button>
          <button id="ci-sigma-yes" className={`toggle-btn ${sigmaKnown ? 'active' : ''}`} onClick={() => setSigmaKnown(true)}>Yes → Z-test</button>
        </div>
      </div>

      {sigmaKnown && (
        <div className="form-group">
          <label className="form-label">Population Std Dev (σ)</label>
          <input id="ci-pop-std" type="number" className="form-input" value={popStd} onChange={e => setPopStd(e.target.value)} />
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
      <button id="btn-ci-compute" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={compute} disabled={loading}>
        {loading ? '⟳ Computing...' : '🔍 Compute Interval'}
      </button>

      {result && (
        <>
          <div className="result-highlight" style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {(confidence * 100).toFixed(0)}% Confidence Interval ({result.distribution_used}-distribution)
            </div>
            <div className="result-big">
              [{result.lower.toFixed(4)}, {result.upper.toFixed(4)}]
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Point Estimate: <strong>{result.point_estimate}</strong></span>
              <span>Margin of Error: <strong>±{result.margin_of_error.toFixed(4)}</strong></span>
              <span>Critical Value: <strong>{result.critical_value.toFixed(4)}</strong></span>
            </div>
          </div>
          <div className="chart-container" style={{ height: 200 }}>
            <Line data={chartData!} options={chartOpts as any} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Hypothesis Wizard ────────────────────────────
const WIZARD_STEPS = ['Define H₀ & Hₐ', 'Set α Level', 'Enter Data', 'Results'];

function HypothesisWizard() {
  const [step, setStep] = useState(0);
  const [testType, setTestType] = useState<'one_sample_z' | 'one_sample_t'>('one_sample_t');
  const [alternative, setAlternative] = useState<'two-sided' | 'greater' | 'less'>('two-sided');
  const [h0Val, setH0Val]= useState('100');
  const [alpha, setAlpha] = useState(0.05);
  const [sampleMean, setSampleMean] = useState('103');
  const [sampleStd, setSampleStd] = useState('12');
  const [sampleN, setSampleN] = useState('40');
  const [popStd, setPopStd] = useState('12');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const compute = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/inference/hypothesis-test', {
        test_type: testType,
        alternative,
        alpha,
        hypothesized_mean: parseFloat(h0Val),
        sample_mean: parseFloat(sampleMean),
        sample_std: parseFloat(sampleStd),
        n: parseInt(sampleN),
        population_std: testType === 'one_sample_z' ? parseFloat(popStd) : null,
      });
      setResult(res.data);
      setStep(3);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    }
    setLoading(false);
  };

  const chartData = result ? {
    labels: result.curve.x.map((v: number) => v.toFixed(2)),
    datasets: [
      {
        label: 'Rejection Region',
        data: result.curve.x.map((v: number, i: number) =>
          Math.abs(v) >= Math.abs(result.critical_value) ? result.curve.y[i] : 0),
        backgroundColor: 'rgba(248,113,113,0.3)',
        fill: true, borderWidth: 0, pointRadius: 0,
      },
      {
        label: 'Curve',
        data: result.curve.y,
        borderColor: '#7c6ee6', backgroundColor: 'transparent',
        borderWidth: 2, pointRadius: 0, tension: 0.4,
      },
    ],
  } : null;

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#4e5566', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#4e5566' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
    },
  };

  return (
    <div className="card">
      <div className="card-title">🧪 Hypothesis Testing Wizard</div>

      {/* Step indicator */}
      <div className="wizard-steps" style={{ marginBottom: '1.5rem' }}>
        {WIZARD_STEPS.map((label, i) => (
          <div key={i} className="wizard-step">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={`step-circle ${step === i ? 'active' : step > i ? 'done' : ''}`}
                style={{ cursor: step > i ? 'pointer' : 'default' }}
                onClick={() => step > i && setStep(i)}>
                {step > i ? '✓' : i + 1}
              </div>
              <span className="step-label" style={{ color: step === i ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && <div className={`step-line ${step > i ? 'done' : ''}`} style={{ marginBottom: '1.25rem' }} />}
          </div>
        ))}
      </div>

      {/* Step 0: H₀ & Hₐ */}
      {step === 0 && (
        <div>
          <div className="form-group">
            <label className="form-label">Test Type</label>
            <div className="toggle-group">
              <button id="test-type-t" className={`toggle-btn ${testType === 'one_sample_t' ? 'active' : ''}`} onClick={() => setTestType('one_sample_t')}>One-Sample T (σ unknown)</button>
              <button id="test-type-z" className={`toggle-btn ${testType === 'one_sample_z' ? 'active' : ''}`} onClick={() => setTestType('one_sample_z')}>One-Sample Z (σ known)</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">H₀: μ = ?</label>
            <input id="h0-value" type="number" className="form-input" value={h0Val} onChange={e => setH0Val(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Alternative Hypothesis (Hₐ)</label>
            <select id="alternative-select" className="form-select" value={alternative} onChange={e => setAlternative(e.target.value as any)}>
              <option value="two-sided">Hₐ: μ ≠ μ₀ (two-sided)</option>
              <option value="greater">Hₐ: μ &gt; μ₀ (right-tailed)</option>
              <option value="less">Hₐ: μ &lt; μ₀ (left-tailed)</option>
            </select>
          </div>
          <button id="wizard-next-0" className="btn btn-primary" onClick={() => setStep(1)}>Next →</button>
        </div>
      )}

      {/* Step 1: Alpha */}
      {step === 1 && (
        <div>
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="slider-name">Significance Level (α)</span>
              <span className="slider-val">{alpha}</span>
            </div>
            <input id="alpha-slider" type="range" min="0.01" max="0.20" step="0.01" value={alpha}
              style={{ '--slider-pct': `${((alpha - 0.01) / 0.19) * 100}%` } as any}
              onChange={e => setAlpha(Number(e.target.value))} />
          </div>
          <div className="result-box">
            <div className="insight-row">
              <span className="insight-icon">ℹ️</span>
              <span className="insight-text">α = {alpha} means you accept a <strong>{(alpha * 100).toFixed(0)}%</strong> chance of a Type I error (false positive).</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button id="wizard-back-1" className="btn btn-secondary btn-sm" onClick={() => setStep(0)}>← Back</button>
            <button id="wizard-next-1" className="btn btn-primary btn-sm" onClick={() => setStep(2)}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 2: Data */}
      {step === 2 && (
        <div>
          <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { label: 'Sample Mean (x̄)', val: sampleMean, set: setSampleMean, id: 'hw-sample-mean' },
              { label: 'Sample Std Dev (s)', val: sampleStd, set: setSampleStd, id: 'hw-sample-std' },
              { label: 'Sample Size (n)', val: sampleN, set: setSampleN, id: 'hw-n' },
              ...(testType === 'one_sample_z' ? [{ label: 'Population σ', val: popStd, set: setPopStd, id: 'hw-pop-std' }] : []),
            ].map(f => (
              <div key={f.id} className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{f.label}</label>
                <input id={f.id} type="number" className="form-input" value={f.val} onChange={e => f.set(e.target.value)} />
              </div>
            ))}
          </div>
          {error && <div className="error-banner">{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button id="wizard-back-2" className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>← Back</button>
            <button id="wizard-compute" className="btn btn-primary btn-sm" onClick={compute} disabled={loading}>
              {loading ? '⟳ Computing...' : '🔬 Run Test'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div>
          <div className={`result-highlight`} style={{
            background: result.reject_null
              ? 'linear-gradient(135deg, rgba(248,113,113,0.12), rgba(248,113,113,0.05))'
              : 'linear-gradient(135deg, rgba(74,222,128,0.12), rgba(74,222,128,0.05))',
            borderColor: result.reject_null ? 'rgba(248,113,113,0.4)' : 'rgba(74,222,128,0.4)',
          }}>
            <div className="result-big" style={{ color: result.reject_null ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {result.conclusion}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span>{result.stat_name} = <strong>{result.test_statistic.toFixed(4)}</strong></span>
              <span>p-value = <strong>{result.p_value.toFixed(4)}</strong></span>
              <span>α = <strong>{result.alpha}</strong></span>
              <span>Critical Value: <strong>±{Math.abs(result.critical_value).toFixed(4)}</strong></span>
            </div>
          </div>

          <div className="chart-container" style={{ height: 180, margin: '1rem 0' }}>
            <Line data={chartData!} options={chartOpts as any} />
          </div>

          {/* Error Matrix */}
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Error Analysis</div>
          <div className="error-matrix">
            <div className={`matrix-cell type1`}>
              <div style={{ fontWeight: 700, color: 'var(--accent-red)', marginBottom: '0.25rem' }}>Type I Error (α = {alpha})</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Rejecting H₀ when it's actually true (false positive).</div>
              <div style={{ marginTop: '0.5rem' }}><span className={`badge ${result.reject_null ? 'badge-red' : 'badge-green'}`}>{result.reject_null ? '⚠ Possible' : '✓ Not committed'}</span></div>
            </div>
            <div className={`matrix-cell type2`}>
              <div style={{ fontWeight: 700, color: 'var(--accent-orange)', marginBottom: '0.25rem' }}>Type II Error (β)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Failing to reject H₀ when it is actually false (false negative).</div>
              <div style={{ marginTop: '0.5rem' }}><span className={`badge ${!result.reject_null ? 'badge-orange' : 'badge-green'}`}>{!result.reject_null ? '⚠ Possible' : '✓ Not committed'}</span></div>
            </div>
          </div>

          <button id="wizard-restart" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={() => { setStep(0); setResult(null); }}>
            ↺ Start Over
          </button>
        </div>
      )}
    </div>
  );
}

export default function InferenceLab() {
  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">🔬 Inference Lab</h1>
        <p className="section-desc">Compute confidence intervals and run step-by-step hypothesis tests with real-time p-value computation and error analysis.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <ConfidenceInterval />
        <HypothesisWizard />
      </div>
    </div>
  );
}
