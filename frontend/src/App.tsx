import { useState, useEffect } from 'react';
import './index.css';
import DataAnalyzer from './components/DataAnalyzer';
import DistributionVisualizer from './components/DistributionVisualizer';
import InferenceLab from './components/InferenceLab';
import RegressionSandbox from './components/RegressionSandbox';
import api from './api';

const TABS = [
  { id: 'data',         icon: '📊', label: 'Data Analyzer'     },
  { id: 'distributions',icon: '🔔', label: 'Distributions'      },
  { id: 'inference',    icon: '🔬', label: 'Inference Lab'      },
  { id: 'regression',  icon: '📈', label: 'Regression Sandbox' },
];

function App() {
  const [activeTab, setActiveTab] = useState('data');
  const [engineStatus, setEngineStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        setEngineStatus(res.data.engine?.status === 'ok' ? 'online' : 'offline');
      } catch {
        setEngineStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div>
          <div className="app-logo">StatPlay</div>
          <div className="app-tagline">Interactive Statistics Learning Platform</div>
        </div>
        <div className="engine-status">
          <div className={`status-dot ${engineStatus === 'online' ? 'online' : engineStatus === 'offline' ? 'offline' : ''}`} />
          {engineStatus === 'checking' ? 'Connecting...' : engineStatus === 'online' ? 'Math Engine Online' : 'Engine Offline — start Python server'}
        </div>
      </header>

      {/* Tab Nav */}
      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="main-content">
        {engineStatus === 'offline' && (
          <div className="error-banner">
            ⚠️ The Python math engine is not reachable. Run: <strong>cd engine && uvicorn main:app --reload</strong>
          </div>
        )}
        {activeTab === 'data'          && <DataAnalyzer />}
        {activeTab === 'distributions' && <DistributionVisualizer />}
        {activeTab === 'inference'     && <InferenceLab />}
        {activeTab === 'regression'    && <RegressionSandbox />}
      </main>
    </>
  );
}

export default App;
