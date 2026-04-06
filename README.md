# AlgoTrader Pro — Enhanced Edition v2

Production-grade cross-platform trading application for Indian equity options (Nifty 50, Bank Nifty, Sensex) with three proven intraday strategies.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web Frontend** | React 18 + Vite + TailwindCSS v4 |
| **Mobile App** | React Native + Expo SDK |
| **Backend API** | FastAPI (Python) + Motor (async MongoDB) |
| **Database** | MongoDB Atlas |
| **Deployment** | Railway (backend) · Vercel (web) · EAS Build (mobile) |

---

## Trading Strategies

### 1. ORB — Opening Range Breakout (5-min)
- **Window:** 9:30–10:15 AM IST | First 3 candles define range
- **Confluence:** 4/5 required — EMA crossover, Price > VWAP, Volume 1.5× surge, RSI 40–75
- **R:R:** 2.0× | VIX filter: disabled if VIX > 18

### 2. VWAP Bounce / Rejection (5-min)
- **Window:** 10:00 AM–1:00 PM IST (10:30 AM on high-VIX days)
- **Confluence:** 4/5 required — EMA, Volume 1.5×, RSI neutral, Bullish/Bearish candle body
- **R:R:** 1.8× | SL = ATR × 1.2

### 3. CPR Day Filter (Pre-market)
- **Trending** (width < 0.20%) / **Normal** (0.20–0.40%) / **Weak** (0.40–0.60%) / **Ranging** (> 0.60%)

---

## Bug Fixes Applied

| # | Issue | Fix |
|---|-------|-----|
| 1 | `_get_settings_sync()` returned hardcoded defaults — user settings ignored | Reads from MongoDB with fallback |
| 2 | WebSocket broadcast mutated list during iteration — crash risk | Iterate copy; collect dead clients separately |
| 3 | Paper trade LTP used ±15% random swing — wildly unrealistic | Gaussian drift ±3.5%, capped ±8%, +0.3% theta decay |
| 4 | `CORS allow_origins=["*"]` — insecure for production | Reads `ALLOWED_ORIGINS` env var |
| 5 | `_send_telegram_signal()` referenced undefined `rule` variable | Removed dangling reference |
| 6 | Settings fetched N×M times per scan (once per index) | Fetched once per scan cycle and reused |
| 7 | Engine mode (paper/live) not synced from settings at runtime | Mode updated from settings on each scan |
| 8 | Squareoff time hardcoded 3:10 PM, ignored user setting | Reads `squareoff_time` from settings |
| 9 | Squareoff decay hardcoded 10% — changed to 8% (more realistic) | Parameterised |
| 10 | Nifty lot size was 65 in ManualTrade.jsx — outdated (SEBI revised to 75 Nov 2024) | Updated to 75 |
| 11 | `squareoff_time` default in schemas was `15:15` but engine used `15:10` | Synced to `15:10` |
| 12 | Missing DB indexes on `strategy+result`, `user_id`, `strategy+index` | Added all 3 |
| 13 | Login endpoint had no rate limiting — brute-force possible | 5 attempts per 5 min per IP |
| 14 | Trades API had no `mode` filter (paper vs live) | Added `mode` query param |

---

## New Features

- **Daily Telegram Summary** — end-of-day P&L summary sent automatically at squareoff time
- **Logs page** — colour-coded log entries by event type, filter by level (SIGNAL/TRADE/RISK/DATA), search bar, auto-refresh every 5s
- **Dashboard auto-refresh** — polls summary + signals every 30 seconds
- **Sidebar engine panel** — shows active trade count, next scan time, CPR day type, P&L in colour
- **PreMarket refresh** — Refresh button now calls live API instead of no-op

---

## Quick Start

### Backend
```bash
cd apps/backend
pip install -r requirements.txt
cp .env.example .env  # Fill in MONGO_URI, SECRET_KEY, ADMIN_PASSWORD
uvicorn app.main:app --reload --port 8000
```

### Web App
```bash
cd apps/web
npm install && npm run dev
```

### Mobile
```bash
cd apps/mobile
npm install && npx expo start
```

## Environment Variables (backend/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `SECRET_KEY` | ✅ | JWT secret (min 32 chars) |
| `ADMIN_PASSWORD` | ✅ | Default admin account password |
| `ALLOWED_ORIGINS` | Production | Comma-separated frontend URLs |
| `PORT` | Optional | API port (default 8000) |

## Risk Rules (Hardcoded)
- Lot sizes: NIFTY=75, BANKNIFTY=30, SENSEX=10
- Max 2 trades per index per day
- Max daily loss: 2% of capital  
- Stop after 2 consecutive losses
- Auto squareoff at configurable time (default 3:10 PM IST)
- VIX > 22: No trading | VIX 18–22: VWAP only after 10:30 AM

## Default Login
- **Email:** admin@algotrader.pro
- **Password:** admin123 *(change immediately in production)*
