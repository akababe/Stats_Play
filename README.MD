# StatPlay

> An interactive statistics learning platform — input data, move sliders, and instantly see statistical calculations and visualizations update in real-time.

![StatPlay UI](https://img.shields.io/badge/Status-Live-brightgreen) ![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Python-blue) ![License](https://img.shields.io/badge/License-MIT-purple)

---

## Features

StatPlay is broken into four interactive modules, each covering a core area of statistics:

| Module | What You Can Do |
|---|---|
| **Data Analyzer** | Paste any dataset, compute mean/median/mode/std/IQR, auto-detect outliers via the 1.5xIQR rule, and explore how shift and scale transformations affect your data |
| **Distribution Visualizer** | Explore the Empirical Rule (68-95-99.7) with live sliders, compute discrete probabilities (Bernoulli, Binomial, Poisson, Geometric), and watch the Central Limit Theorem animate in real-time |
| **Inference Lab** | Generate confidence intervals (auto Z-test vs. T-test selection), and run hypothesis tests through a guided 4-step wizard with p-value output and Type I/II error matrix |
| **Regression Sandbox** | Plot scatter data, compute Pearson r and covariance, fit a least-squares regression line, and evaluate model accuracy (r-squared, RMSE) |

---

## Architecture

StatPlay uses a 3-tier microservice architecture where Python handles all the math and Node.js acts as an API gateway:

```
Browser (React/Vite)
       |  HTTP
       v
Node.js Express  <-- API Gateway (port 3001)
       |  HTTP Proxy
       v
Python FastAPI   <-- Math Engine (port 8000)
  scipy, numpy
```

| Service | Tech | Port |
|---|---|---|
| **Frontend** | React + Vite + TypeScript + Chart.js | `5173` |
| **Backend** | Node.js + Express + TypeScript | `3001` |
| **Engine** | Python + FastAPI + scipy + numpy | `8000` |

---

## Quick Start

### Prerequisites

- **Node.js** v18+ and `npm`
- **Python 3.9+** and `pip`

### 1. Clone and Install

```bash
# Install all Node.js dependencies (frontend + backend)
npm run install:all

# Install Python dependencies
npm run install:python
```

### 2. Run Everything

Launch all 3 services with a single command:

```bash
npm run dev:all
```

Then open **http://localhost:5173** in your browser.

You should see **"Math Engine Online"** (green dot) in the top-right corner, confirming all 3 services are communicating correctly.

---

## Project Structure

```
Stats_Play/
├── frontend/               # React + Vite app (user interface)
│   └── src/
│       ├── App.tsx         # Main layout with tab navigation
│       ├── api.ts          # Axios client -> Node.js gateway
│       ├── index.css       # Dark-mode design system
│       └── components/
│           ├── DataAnalyzer.tsx           # Epic 1
│           ├── DistributionVisualizer.tsx  # Epic 2
│           ├── InferenceLab.tsx           # Epic 3
│           └── RegressionSandbox.tsx      # Epic 4
│
├── backend/                # Node.js API Gateway
│   └── src/
│       └── index.ts        # Express proxy server
│
├── engine/                 # Python Math Engine
│   ├── main.py             # FastAPI app with all endpoints
│   └── requirements.txt
│
├── source/
│   └── PRD.MD              # Product Requirements Document
│
├── Agent.MD                # Product strategy and vision
└── package.json            # Root scripts (dev:all, install:all)
```

---

## API Endpoints

All requests go through Node.js at `http://localhost:3001/api`, which proxies to the Python engine.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Check status of both gateway and engine |
| `POST` | `/api/stats/descriptive` | Mean, median, mode, IQR, outliers |
| `POST` | `/api/stats/shift-scale` | Effect of shift/scale on a dataset |
| `POST` | `/api/distributions/normal` | Normal curve data (Empirical Rule) |
| `POST` | `/api/distributions/discrete` | PMF for Bernoulli/Binomial/Poisson/Geometric |
| `POST` | `/api/distributions/clt` | CLT simulation — sample means histogram |
| `POST` | `/api/inference/confidence-interval` | CI boundaries (Z or T) |
| `POST` | `/api/inference/hypothesis-test` | p-value, test stat, reject/fail decision |
| `POST` | `/api/regression/analyze` | Pearson r, regression line, r-squared, RMSE |

---

## Individual Service Scripts

If you need to run services separately:

```bash
# Python Engine only (port 8000)
npm run dev:engine

# Node.js Backend only (port 3001)
npm run dev:backend

# React Frontend only (port 5173)
npm run dev:frontend
```

---

## Tech Stack

### Frontend
- [React](https://react.dev/) — Component-based UI
- [Vite](https://vitejs.dev/) — Ultra-fast dev server
- [TypeScript](https://www.typescriptlang.org/) — Type-safe code
- [Chart.js](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/) — Interactive charts
- [Axios](https://axios-http.com/) — HTTP client

### Backend
- [Node.js](https://nodejs.org/) — JavaScript runtime
- [Express](https://expressjs.com/) — Web framework
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) — API rate limiting
- [ts-node-dev](https://github.com/wclr/ts-node-dev) — TypeScript hot-reload

### Engine
- [Python 3](https://www.python.org/) — Core language
- [FastAPI](https://fastapi.tiangolo.com/) — High-performance async API
- [SciPy](https://scipy.org/) — Statistical computations
- [NumPy](https://numpy.org/) — Numerical operations
- [Uvicorn](https://www.uvicorn.org/) — ASGI server

---

## Product Background

This project was product-managed using the `skill-po` agent skill and built following the `PRD.MD` document located in `source/`. The PRD was generated from the vision in `Agent.MD` using a custom AI-powered Product Owner workflow.

---

## License

MIT
