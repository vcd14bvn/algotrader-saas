# AlgoTrader Pro — Deployment Guide

Stack: **FastAPI backend** → Render · **React frontend** → Vercel · **Database** → MongoDB Atlas

---

## Step 1 — MongoDB Atlas (Free, 5 minutes)

1. Go to **https://cloud.mongodb.com** → Create free account
2. Create a **Free M0 cluster** (select region closest to India — Singapore or Mumbai)
3. **Database Access** → Add user → set username + password → **Built-in Role: Atlas Admin**
4. **Network Access** → Add IP → **0.0.0.0/0** (allow all — needed for Render)
5. **Connect** → **Drivers** → copy the connection string
   - Looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`
   - Replace `<password>` with your actual password
   - Add database name: `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/algotrader`
6. Save this — you need it in the next step

---

## Step 2 — Deploy Backend on Render (Free, 10 minutes)

1. Push this repo to **GitHub** (or GitLab)
2. Go to **https://render.com** → New → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `algotrader-backend`
   - **Root Directory:** `apps/backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free (or Starter $7/mo for always-on)

5. **Environment Variables** (Add all of these):

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | Your Atlas connection string |
   | `SECRET_KEY` | Generate: `openssl rand -hex 32` |
   | `ADMIN_PASSWORD` | Your chosen admin password |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

6. Click **Deploy** → Wait ~3 minutes
7. Copy your backend URL: `https://algotrader-backend.onrender.com`
8. Test it: visit `https://algotrader-backend.onrender.com/health` → should return `{"status":"ok"}`

---

## Step 3 — Deploy Frontend on Vercel (Free, 5 minutes)

1. Go to **https://vercel.com** → New Project
2. Import your GitHub repo
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. **Environment Variables:**

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://algotrader-backend.onrender.com` |
   | `VITE_WS_URL` | `wss://algotrader-backend.onrender.com` |

5. Click **Deploy** → Wait ~2 minutes
6. Your app is live at `https://your-app.vercel.app`

---

## Step 4 — Update CORS on Render

1. Go back to Render → your backend service → Environment
2. Update `ALLOWED_ORIGINS` to your actual Vercel URL:
   ```
   https://your-app.vercel.app
   ```
3. Redeploy (takes ~1 min)

---

## Step 5 — First Login

- **URL:** `https://your-app.vercel.app`
- **Email:** `admin@algotrader.pro`
- **Password:** whatever you set in `ADMIN_PASSWORD`

---

## Step 6 — Configure Broker (for LIVE trading)

1. Go to **Settings** in the app
2. Under **Broker Configuration**, enter your Angel One credentials:
   - API Key (from Angel One developer portal)
   - Client ID
   - Trading password
   - TOTP secret
3. Click **Test Connection**
4. If connected, the LIVE mode toggle in the sidebar becomes active

---

## Step 7 — Configure Telegram (optional but recommended)

1. Message **@BotFather** on Telegram → `/newbot`
2. Copy the bot token
3. Message your bot once → get your chat ID from `https://api.telegram.org/bot<token>/getUpdates`
4. Add both to Render environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

---

## Custom Domain (optional)

**Vercel:** Settings → Domains → Add → follow DNS instructions
**Render:** Settings → Custom Domains → Add domain

Typical setup:
- `app.yourdomain.com` → Vercel frontend
- `api.yourdomain.com` → Render backend

---

## Free Tier Limits

| Service | Free Limit | Notes |
|---------|-----------|-------|
| MongoDB Atlas | 512MB storage | Enough for ~2 years of trades |
| Render | 750 hrs/month | **Spins down after 15min idle** — use Starter $7/mo for always-on |
| Vercel | Unlimited | No limits for personal projects |

> **Important:** Free Render spins down after 15 minutes of inactivity. First request after sleep takes ~30 seconds. Upgrade to Starter ($7/mo) for always-on — recommended for live trading.

---

## Keeping Backend Alive on Free Tier

If you stay on free Render, add a cron job to ping the health endpoint every 10 minutes:

Use **https://cron-job.org** (free):
- URL: `https://algotrader-backend.onrender.com/health`
- Schedule: every 10 minutes
- This prevents the backend from sleeping during market hours

---

## Environment Variables Reference

### Backend (Render)
```
MONGO_URI           = mongodb+srv://...
SECRET_KEY          = 64-char random hex
ADMIN_PASSWORD      = your admin password
ALLOWED_ORIGINS     = https://your-app.vercel.app
ANGEL_API_KEY       = (optional, for live trading)
ANGEL_CLIENT_ID     = (optional)
ANGEL_PASSWORD      = (optional)
ANGEL_TOTP_SECRET   = (optional)
TELEGRAM_BOT_TOKEN  = (optional)
TELEGRAM_CHAT_ID    = (optional)
```

### Frontend (Vercel)
```
VITE_API_URL = https://algotrader-backend.onrender.com
VITE_WS_URL  = wss://algotrader-backend.onrender.com
```
