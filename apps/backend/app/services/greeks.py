"""Options Greeks Calculator — Black-Scholes Model

Calculates Delta, Gamma, Theta, Vega, and option premium for
Indian equity options (NIFTY, BANKNIFTY, SENSEX).

Used by the trading engine to select optimal strikes based on
Greeks equilibrium rather than naive nearest-strike rounding.
"""
import math
from typing import Optional

# Risk-free rate (India 10Y benchmark ~ 7.1%)
RISK_FREE_RATE = 0.071

# Strike step sizes per index
STRIKE_STEPS = {"NIFTY": 50, "BANKNIFTY": 100, "SENSEX": 100}


def _norm_cdf(x: float) -> float:
    """Cumulative standard normal distribution (no scipy needed)."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    """Standard normal probability density."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def black_scholes_greeks(
    spot: float,
    strike: float,
    tte: float,         # time to expiry in years  (e.g. 3 days = 3/365)
    iv: float,          # implied volatility as decimal (e.g. 0.18 for 18%)
    r: float = RISK_FREE_RATE,
    option_type: str = "CE",   # "CE" or "PE"
) -> dict:
    """Calculate all Greeks for a single option.

    Returns dict with:
        premium, delta, gamma, theta, vega, intrinsic, extrinsic
    """
    if tte <= 0:
        tte = 1 / 365   # minimum 1 day
    if iv <= 0:
        iv = 0.15        # fallback

    sqrt_t = math.sqrt(tte)
    d1 = (math.log(spot / strike) + (r + 0.5 * iv ** 2) * tte) / (iv * sqrt_t)
    d2 = d1 - iv * sqrt_t

    if option_type == "CE":
        delta = _norm_cdf(d1)
        premium = spot * _norm_cdf(d1) - strike * math.exp(-r * tte) * _norm_cdf(d2)
        theta = (
            -(spot * _norm_pdf(d1) * iv) / (2 * sqrt_t)
            - r * strike * math.exp(-r * tte) * _norm_cdf(d2)
        ) / 365
        intrinsic = max(0, spot - strike)
    else:  # PE
        delta = _norm_cdf(d1) - 1
        premium = strike * math.exp(-r * tte) * _norm_cdf(-d2) - spot * _norm_cdf(-d1)
        theta = (
            -(spot * _norm_pdf(d1) * iv) / (2 * sqrt_t)
            + r * strike * math.exp(-r * tte) * _norm_cdf(-d2)
        ) / 365
        intrinsic = max(0, strike - spot)

    gamma = _norm_pdf(d1) / (spot * iv * sqrt_t)
    vega = spot * _norm_pdf(d1) * sqrt_t / 100   # per 1% IV change

    premium = max(premium, 0.05)
    extrinsic = max(0, premium - intrinsic)

    return {
        "strike": strike,
        "option_type": option_type,
        "premium": round(premium, 2),
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta, 2),
        "vega": round(vega, 2),
        "intrinsic": round(intrinsic, 2),
        "extrinsic": round(extrinsic, 2),
    }


def build_option_chain(
    spot: float,
    index: str,
    direction: str,   # "LONG" or "SHORT"
    iv: float = 0.16,
    days_to_expiry: int = 3,
) -> list:
    """Build a mini option chain (5 strikes around ATM) with Greeks.

    Returns list of dicts sorted by strike, each with full Greeks.
    """
    step = STRIKE_STEPS.get(index, 50)
    tte = max(days_to_expiry, 1) / 365
    option_type = "CE" if direction == "LONG" else "PE"

    atm = round(spot / step) * step
    strikes = [atm + i * step for i in range(-2, 3)]   # ATM ± 2 strikes

    chain = []
    for k in strikes:
        greeks = black_scholes_greeks(spot, k, tte, iv, option_type=option_type)
        greeks["moneyness"] = "ATM" if k == atm else ("ITM" if (
            (direction == "LONG" and k < spot) or
            (direction == "SHORT" and k > spot)
        ) else "OTM")
        chain.append(greeks)

    return chain


def select_optimal_strike(
    spot: float,
    index: str,
    direction: str,
    iv: float = 0.16,
    days_to_expiry: int = 3,
    vix: Optional[float] = None,
) -> dict:
    """Select the best strike based on Delta-Gamma-Theta equilibrium.

    Scoring algorithm:
        score = w_delta * |delta_score|
              + w_gamma * gamma_score
              + w_theta * theta_score

    Delta target:
        - LONG CE:  delta ~ 0.55   (slight ITM → high probability)
        - SHORT PE: delta ~ -0.55  (slight ITM)
        - On high VIX days: shift towards ATM (delta ~ 0.50) for safety

    Gamma reward:
        - Higher gamma = faster delta acceleration → reward it
        - Normalised across the chain

    Theta penalty:
        - More negative theta = higher time decay → penalise it
        - Normalised across the chain

    Returns the full Greeks dict for the optimal strike, plus:
        score, rank, chain (all 5 strikes with scores)
    """
    chain = build_option_chain(spot, index, direction, iv, days_to_expiry)
    if not chain:
        return {"strike": round(spot / 100) * 100, "delta": 0, "gamma": 0, "theta": 0, "premium": 0}

    # ── Configure weights ────────────────────────────────
    # High VIX → favour ATM, penalise theta more
    high_vix = vix and vix > 18
    target_delta = 0.50 if high_vix else 0.55

    w_delta = 0.50    # Delta accuracy is most important
    w_gamma = 0.30    # Gamma acceleration is valuable
    w_theta = 0.20    # Theta decay is a cost

    if high_vix:
        w_delta = 0.40
        w_gamma = 0.20
        w_theta = 0.40   # Penalise time decay more on volatile days

    # ── Normalise metrics ────────────────────────────────
    max_gamma = max(abs(c["gamma"]) for c in chain) or 1e-10
    min_theta = min(c["theta"] for c in chain)       # most negative
    max_theta = max(c["theta"] for c in chain)
    theta_range = abs(max_theta - min_theta) or 1

    for c in chain:
        abs_delta = abs(c["delta"])

        # Delta score: how close is |delta| to target? (1.0 = perfect)
        delta_score = 1.0 - abs(abs_delta - target_delta) / target_delta

        # Gamma score: normalised 0-1 (higher is better)
        gamma_score = abs(c["gamma"]) / max_gamma

        # Theta score: normalised 0-1 (less negative is better)
        theta_score = 1.0 - abs(c["theta"] - max_theta) / theta_range

        c["delta_score"] = round(delta_score, 4)
        c["gamma_score"] = round(gamma_score, 4)
        c["theta_score"] = round(theta_score, 4)
        c["total_score"] = round(
            w_delta * delta_score + w_gamma * gamma_score + w_theta * theta_score,
            4,
        )

    # ── Pick the best ────────────────────────────────────
    chain.sort(key=lambda c: c["total_score"], reverse=True)
    best = chain[0]
    best["chain"] = chain
    best["selection_method"] = "greeks_equilibrium"
    best["target_delta"] = target_delta
    best["weights"] = {"delta": w_delta, "gamma": w_gamma, "theta": w_theta}

    return best
