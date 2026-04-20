import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import axios, { AxiosError } from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;
const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';

// ── Middleware ─────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 200,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', limiter);

// ── Proxy Helper ───────────────────────────────
async function proxyToEngine(
  enginePath: string,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const response = await axios.post(`${PYTHON_ENGINE_URL}${enginePath}`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    res.json(response.data);
  } catch (err) {
    const error = err as AxiosError;
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({
        error: 'Math engine unavailable. Make sure the Python service is running on port 8000.',
        details: error.message,
      });
    }
  }
}

// ── Health Check ───────────────────────────────
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const engineHealth = await axios.get(`${PYTHON_ENGINE_URL}/health`, { timeout: 3000 });
    res.json({ gateway: 'ok', engine: engineHealth.data });
  } catch {
    res.status(503).json({ gateway: 'ok', engine: 'unreachable' });
  }
});

// ── Epic 1: Descriptive Stats ──────────────────
app.post('/api/stats/descriptive', (req, res) => proxyToEngine('/stats/descriptive', req, res));
app.post('/api/stats/shift-scale', (req, res) => proxyToEngine('/stats/shift-scale', req, res));

// ── Epic 2: Distributions ─────────────────────
app.post('/api/distributions/normal', (req, res) => proxyToEngine('/distributions/normal', req, res));
app.post('/api/distributions/discrete', (req, res) => proxyToEngine('/distributions/discrete', req, res));
app.post('/api/distributions/clt', (req, res) => proxyToEngine('/distributions/clt', req, res));

// ── Epic 3: Inference ─────────────────────────
app.post('/api/inference/confidence-interval', (req, res) => proxyToEngine('/inference/confidence-interval', req, res));
app.post('/api/inference/hypothesis-test', (req, res) => proxyToEngine('/inference/hypothesis-test', req, res));

// ── Epic 4: Regression ────────────────────────
app.post('/api/regression/analyze', (req, res) => proxyToEngine('/regression/analyze', req, res));

// ── 404 Handler ───────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ StatPlay API Gateway running on http://localhost:${PORT}`);
  console.log(`   Proxying to Python engine at ${PYTHON_ENGINE_URL}`);
});

export default app;
