from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal
import numpy as np
import scipy.stats as stats
from scipy import stats as sp_stats
import math

app = FastAPI(title="StatPlay Math Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────

class DatasetRequest(BaseModel):
    data: List[float]
    population: bool = True  # True = population stats, False = sample stats

class ShiftScaleRequest(BaseModel):
    data: List[float]
    shift: float = 0.0
    scale: float = 1.0

class NormalDistRequest(BaseModel):
    mean: float
    std: float

class DiscreteDistRequest(BaseModel):
    distribution: Literal["bernoulli", "binomial", "poisson", "geometric"]
    p: Optional[float] = None       # probability of success
    n: Optional[int] = None         # number of trials (binomial)
    lam: Optional[float] = None     # lambda (poisson mean)

class CLTRequest(BaseModel):
    population_type: Literal["uniform", "exponential", "bimodal"] = "exponential"
    sample_size: int = 30
    num_samples: int = 200

class CIRequest(BaseModel):
    sample_mean: float
    sample_std: float
    n: int
    confidence_level: float = 0.95
    sigma_known: bool = False
    population_std: Optional[float] = None

class HypothesisRequest(BaseModel):
    test_type: Literal["one_sample_z", "one_sample_t", "two_sample_t"]
    alternative: Literal["two-sided", "greater", "less"] = "two-sided"
    alpha: float = 0.05
    sample_mean: Optional[float] = None
    hypothesized_mean: Optional[float] = None
    sample_std: Optional[float] = None
    n: Optional[int] = None
    population_std: Optional[float] = None
    sample1: Optional[List[float]] = None
    sample2: Optional[List[float]] = None

class RegressionRequest(BaseModel):
    x: List[float]
    y: List[float]


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "StatPlay Math Engine"}


# ──────────────────────────────────────────────
# Epic 1: Descriptive Statistics
# ──────────────────────────────────────────────

@app.post("/stats/descriptive")
def descriptive_stats(req: DatasetRequest):
    if len(req.data) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 data points.")
    
    arr = np.array(req.data)
    ddof = 0 if req.population else 1

    mean = float(np.mean(arr))
    median = float(np.median(arr))

    # Mode (most common value, or list of ties)
    mode_result = sp_stats.mode(arr, keepdims=True)
    mode_val = float(mode_result.mode[0])
    mode_count = int(mode_result.count[0])

    std = float(np.std(arr, ddof=ddof))
    variance = float(np.var(arr, ddof=ddof))
    data_range = float(np.max(arr) - np.min(arr))

    q1 = float(np.percentile(arr, 25))
    q3 = float(np.percentile(arr, 75))
    iqr = q3 - q1

    # Outliers via 1.5 * IQR rule
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr
    outliers = [float(x) for x in arr if x < lower_fence or x > upper_fence]

    # Box plot whisker data
    non_outliers = arr[(arr >= lower_fence) & (arr <= upper_fence)]
    whisker_low = float(np.min(non_outliers)) if len(non_outliers) > 0 else lower_fence
    whisker_high = float(np.max(non_outliers)) if len(non_outliers) > 0 else upper_fence

    return {
        "mean": mean,
        "median": median,
        "mode": mode_val,
        "mode_count": mode_count,
        "std": std,
        "variance": variance,
        "range": data_range,
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "lower_fence": float(lower_fence),
        "upper_fence": float(upper_fence),
        "outliers": outliers,
        "whisker_low": whisker_low,
        "whisker_high": whisker_high,
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "sorted_data": sorted(req.data),
    }


@app.post("/stats/shift-scale")
def shift_scale(req: ShiftScaleRequest):
    if len(req.data) < 1:
        raise HTTPException(status_code=400, detail="Need at least 1 data point.")
    
    original = np.array(req.data)
    transformed = original * req.scale + req.shift

    return {
        "original": {
            "data": req.data,
            "mean": float(np.mean(original)),
            "std": float(np.std(original, ddof=0)),
        },
        "transformed": {
            "data": transformed.tolist(),
            "mean": float(np.mean(transformed)),
            "std": float(np.std(transformed, ddof=0)),
        },
        "insight": {
            "mean_changes_with_shift": True,
            "mean_changes_with_scale": True,
            "std_changes_with_shift": False,  # shift doesn't affect spread
            "std_changes_with_scale": True,
        }
    }


# ──────────────────────────────────────────────
# Epic 2: Distribution Visualizer
# ──────────────────────────────────────────────

@app.post("/distributions/normal")
def normal_distribution(req: NormalDistRequest):
    if req.std <= 0:
        raise HTTPException(status_code=400, detail="Standard deviation must be > 0.")
    
    mu, sigma = req.mean, req.std
    x = np.linspace(mu - 4 * sigma, mu + 4 * sigma, 300)
    y = sp_stats.norm.pdf(x, mu, sigma)

    return {
        "x": x.tolist(),
        "y": y.tolist(),
        "mean": mu,
        "std": sigma,
        "regions": {
            "one_sigma": [mu - sigma, mu + sigma],
            "two_sigma": [mu - 2 * sigma, mu + 2 * sigma],
            "three_sigma": [mu - 3 * sigma, mu + 3 * sigma],
        },
        "probabilities": {
            "within_1_sigma": 0.6827,
            "within_2_sigma": 0.9545,
            "within_3_sigma": 0.9973,
        }
    }


@app.post("/distributions/discrete")
def discrete_distribution(req: DiscreteDistRequest):
    dist = req.distribution

    if dist == "bernoulli":
        p = req.p if req.p is not None else 0.5
        if not (0 < p < 1):
            raise HTTPException(status_code=400, detail="p must be between 0 and 1.")
        k = [0, 1]
        pmf = [1 - p, p]
        mean = p
        variance = p * (1 - p)

    elif dist == "binomial":
        p = req.p if req.p is not None else 0.5
        n = req.n if req.n is not None else 10
        if not (0 < p < 1):
            raise HTTPException(status_code=400, detail="p must be between 0 and 1.")
        if n < 1:
            raise HTTPException(status_code=400, detail="n must be >= 1.")
        k = list(range(n + 1))
        pmf = [float(sp_stats.binom.pmf(i, n, p)) for i in k]
        mean = n * p
        variance = n * p * (1 - p)

    elif dist == "poisson":
        lam = req.lam if req.lam is not None else 3.0
        if lam <= 0:
            raise HTTPException(status_code=400, detail="Lambda must be > 0.")
        # Show k values where PMF > 0.001
        k_max = int(lam + 4 * math.sqrt(lam)) + 2
        k = list(range(k_max + 1))
        pmf = [float(sp_stats.poisson.pmf(i, lam)) for i in k]
        mean = lam
        variance = lam

    elif dist == "geometric":
        p = req.p if req.p is not None else 0.3
        if not (0 < p <= 1):
            raise HTTPException(status_code=400, detail="p must be between 0 and 1.")
        k_max = int(10 / p) + 1
        k = list(range(1, k_max + 1))
        pmf = [float(sp_stats.geom.pmf(i, p)) for i in k]
        mean = 1 / p
        variance = (1 - p) / (p ** 2)

    else:
        raise HTTPException(status_code=400, detail="Unknown distribution.")

    return {
        "distribution": dist,
        "k": k,
        "pmf": pmf,
        "mean": mean,
        "variance": variance,
        "std": math.sqrt(variance),
    }


@app.post("/distributions/clt")
def clt_simulation(req: CLTRequest):
    np.random.seed(42)  # reproducible
    n = req.sample_size
    num_samples = min(req.num_samples, 1000)  # cap for performance

    # Generate skewed population
    if req.population_type == "exponential":
        population = np.random.exponential(scale=2.0, size=10000)
    elif req.population_type == "uniform":
        population = np.random.uniform(0, 10, size=10000)
    else:  # bimodal
        population = np.concatenate([
            np.random.normal(2, 0.5, 5000),
            np.random.normal(8, 0.5, 5000)
        ])

    # Draw samples and record means
    sample_means = [float(np.mean(np.random.choice(population, size=n, replace=True)))
                    for _ in range(num_samples)]

    # Compute histogram for sample means
    hist, bin_edges = np.histogram(sample_means, bins=30)

    return {
        "population_type": req.population_type,
        "sample_size": n,
        "num_samples": num_samples,
        "sample_means": sample_means,
        "histogram": {
            "counts": hist.tolist(),
            "bin_edges": bin_edges.tolist(),
            "bin_centers": [(bin_edges[i] + bin_edges[i+1]) / 2 for i in range(len(bin_edges)-1)],
        },
        "population_mean": float(np.mean(population)),
        "population_std": float(np.std(population)),
        "sample_means_mean": float(np.mean(sample_means)),
        "sample_means_std": float(np.std(sample_means)),
        "expected_std_error": float(np.std(population) / math.sqrt(n)),
    }


# ──────────────────────────────────────────────
# Epic 3: Inference Lab
# ──────────────────────────────────────────────

@app.post("/inference/confidence-interval")
def confidence_interval(req: CIRequest):
    if req.n < 2:
        raise HTTPException(status_code=400, detail="Sample size must be >= 2.")

    alpha = 1 - req.confidence_level

    if req.sigma_known and req.population_std:
        # Z-interval
        z = sp_stats.norm.ppf(1 - alpha / 2)
        margin = z * (req.population_std / math.sqrt(req.n))
        critical_value = z
        distribution_used = "Z"
    else:
        # T-interval
        t = sp_stats.t.ppf(1 - alpha / 2, df=req.n - 1)
        margin = t * (req.sample_std / math.sqrt(req.n))
        critical_value = t
        distribution_used = "T"

    lower = req.sample_mean - margin
    upper = req.sample_mean + margin

    # Generate the distribution curve for visualization
    if req.sigma_known and req.population_std:
        x = np.linspace(-4, 4, 300)
        y = sp_stats.norm.pdf(x, 0, 1).tolist()
    else:
        x = np.linspace(-5, 5, 300)
        y = sp_stats.t.pdf(x, df=req.n - 1).tolist()

    return {
        "lower": lower,
        "upper": upper,
        "margin_of_error": margin,
        "point_estimate": req.sample_mean,
        "critical_value": critical_value,
        "distribution_used": distribution_used,
        "confidence_level": req.confidence_level,
        "degrees_of_freedom": req.n - 1 if not req.sigma_known else None,
        "curve": {"x": x.tolist(), "y": y},
        "critical_value_positive": abs(critical_value),
    }


@app.post("/inference/hypothesis-test")
def hypothesis_test(req: HypothesisRequest):
    alpha = req.alpha

    if req.test_type == "one_sample_z":
        if None in [req.sample_mean, req.hypothesized_mean, req.population_std, req.n]:
            raise HTTPException(status_code=400, detail="Missing required fields for Z-test.")
        se = req.population_std / math.sqrt(req.n)  # type: ignore
        z_stat = (req.sample_mean - req.hypothesized_mean) / se  # type: ignore

        if req.alternative == "two-sided":
            p_value = 2 * sp_stats.norm.sf(abs(z_stat))
        elif req.alternative == "greater":
            p_value = sp_stats.norm.sf(z_stat)
        else:
            p_value = sp_stats.norm.cdf(z_stat)

        test_stat = z_stat
        stat_name = "z"
        critical_value = sp_stats.norm.ppf(1 - alpha / 2) if req.alternative == "two-sided" else sp_stats.norm.ppf(1 - alpha)
        df = None
        x = np.linspace(-4, 4, 300)
        y = sp_stats.norm.pdf(x, 0, 1).tolist()

    elif req.test_type == "one_sample_t":
        if None in [req.sample_mean, req.hypothesized_mean, req.sample_std, req.n]:
            raise HTTPException(status_code=400, detail="Missing required fields for T-test.")
        se = req.sample_std / math.sqrt(req.n)  # type: ignore
        t_stat = (req.sample_mean - req.hypothesized_mean) / se  # type: ignore
        df = req.n - 1  # type: ignore

        if req.alternative == "two-sided":
            p_value = 2 * sp_stats.t.sf(abs(t_stat), df=df)
        elif req.alternative == "greater":
            p_value = sp_stats.t.sf(t_stat, df=df)
        else:
            p_value = sp_stats.t.cdf(t_stat, df=df)

        test_stat = t_stat
        stat_name = "t"
        critical_value = sp_stats.t.ppf(1 - alpha / 2, df=df) if req.alternative == "two-sided" else sp_stats.t.ppf(1 - alpha, df=df)
        x = np.linspace(-5, 5, 300)
        y = sp_stats.t.pdf(x, df=df).tolist()

    else:  # two_sample_t
        if req.sample1 is None or req.sample2 is None:
            raise HTTPException(status_code=400, detail="Missing sample data for two-sample T-test.")
        t_stat, p_value_two_sided = sp_stats.ttest_ind(req.sample1, req.sample2)
        df = len(req.sample1) + len(req.sample2) - 2

        if req.alternative == "two-sided":
            p_value = p_value_two_sided
        elif req.alternative == "greater":
            p_value = p_value_two_sided / 2 if t_stat > 0 else 1 - p_value_two_sided / 2
        else:
            p_value = p_value_two_sided / 2 if t_stat < 0 else 1 - p_value_two_sided / 2

        test_stat = float(t_stat)
        stat_name = "t"
        critical_value = sp_stats.t.ppf(1 - alpha / 2, df=df) if req.alternative == "two-sided" else sp_stats.t.ppf(1 - alpha, df=df)
        x = np.linspace(-5, 5, 300)
        y = sp_stats.t.pdf(x, df=df).tolist()

    reject = float(p_value) < alpha

    return {
        "test_type": req.test_type,
        "test_statistic": float(test_stat),
        "stat_name": stat_name,
        "p_value": float(p_value),
        "alpha": alpha,
        "reject_null": reject,
        "conclusion": f"Reject H₀" if reject else "Fail to reject H₀",
        "critical_value": float(critical_value),
        "degrees_of_freedom": df,
        "alternative": req.alternative,
        "curve": {"x": x.tolist(), "y": y},
        "error_matrix": {
            "type1": {
                "label": "Type I Error (α)",
                "description": "Rejecting H₀ when it's actually true (false positive).",
                "probability": alpha,
                "committed": reject,
            },
            "type2": {
                "label": "Type II Error (β)",
                "description": "Failing to reject H₀ when it is actually false (false negative).",
                "probability": "unknown without effect size",
                "committed": not reject,
            }
        }
    }


# ──────────────────────────────────────────────
# Epic 4: Regression Sandbox
# ──────────────────────────────────────────────

@app.post("/regression/analyze")
def regression_analyze(req: RegressionRequest):
    if len(req.x) != len(req.y):
        raise HTTPException(status_code=400, detail="X and Y must have the same length.")
    if len(req.x) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 data points.")

    x = np.array(req.x)
    y = np.array(req.y)

    # Pearson r and covariance
    r, p_value = sp_stats.pearsonr(x, y)
    covariance = float(np.cov(x, y)[0][1])

    # Least-squares regression
    slope, intercept, r_value, p_val, std_err = sp_stats.linregress(x, y)

    # Predictions and residuals
    y_pred = slope * x + intercept
    residuals = y - y_pred

    # R² and RMSE
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    r_squared = 1 - (ss_res / ss_tot)
    rmse = float(np.sqrt(np.mean(residuals ** 2)))

    # Regression line points for smooth rendering
    x_line = np.linspace(float(np.min(x)), float(np.max(x)), 100)
    y_line = slope * x_line + intercept

    return {
        "pearson_r": float(r),
        "p_value": float(p_value),
        "covariance": covariance,
        "slope": float(slope),
        "intercept": float(intercept),
        "equation": f"ŷ = {slope:.4f}x + {intercept:.4f}",
        "r_squared": float(r_squared),
        "rmse": float(rmse),
        "regression_line": {
            "x": x_line.tolist(),
            "y": y_line.tolist(),
        },
        "residuals": residuals.tolist(),
        "y_predicted": y_pred.tolist(),
        "interpretation": {
            "r_strength": (
                "very strong" if abs(r) >= 0.9 else
                "strong" if abs(r) >= 0.7 else
                "moderate" if abs(r) >= 0.5 else
                "weak" if abs(r) >= 0.3 else "very weak"
            ),
            "r_direction": "positive" if r > 0 else "negative",
        }
    }
