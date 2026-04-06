# Update Existing Render + Vercel Deployment

You already have Render (backend) and Vercel (frontend) running the original app.
This guide shows how to push our enhanced version to the **same accounts** — no new accounts needed.

---

## What you need
- Your existing GitHub repo (the one connected to Render + Vercel)
- Your existing Render service URL
- Your existing Vercel project URL

---

## Step 1 — Replace files in your GitHub repo

Download the new ZIP → extract it → copy **only the changed files** into your existing repo:

### Backend files to replace (in `apps/backend/`):
```
app/main.py
app/config.py
app/database.py
app/auth.py
app/models/schemas.py
app/routes/engine.py
app/routes/auth.py
app/routes/trades.py
app/services/engine.py
Dockerfile          ← new file
Procfile            ← new file
```

### Frontend files to replace (in `apps/web/`):
```
src/components/Sidebar.jsx
src/pages/ManualTrade.jsx
src/pages/Dashboard.jsx
src/pages/Logs.jsx
src/pages/Settings.jsx
src/lib/store.js
src/lib/api.js
vite.config.js
vercel.json         ← new file
```

### Root level:
```
render.yaml         ← new file (optional, for reference)
```

---

## Step 2 — Add 1 new environment variable on Render

Go to your Render service → **Environment** → Add:

| Key | Value |
|-----|-------|
| `ALLOWED_ORIGINS` | Your Vercel frontend URL e.g. `https://your-app.vercel.app` |

Your existing `MONGO_URI`, `SECRET_KEY`, `ADMIN_PASSWORD` stay the same — don't touch them.

---

## Step 3 — Push to GitHub → auto-redeploy

```bash
git add .
git commit -m "feat: Paper/Live toggle, ManualTrade rebuild, engine optimisations"
git push origin main
```

Render auto-deploys on push (~2 min).
Vercel auto-deploys on push (~1 min).

---

## Step 4 — Verify

1. Visit your Render URL + `/health` → should return `{"status":"ok"}`
2. Open your Vercel frontend → login
3. Check Sidebar shows **PAPER / LIVE** toggle
4. Check Manual Trade page shows full option chain
5. Start engine → verify Paper mode signals appear

---

## Nothing else changes

- Same MongoDB Atlas cluster — no data loss, existing trades preserved
- Same users/login credentials
- Same Telegram bot (if configured)
- Same Angel One broker settings

---

## If Render auto-deploy is off

Go to Render → your service → **Manual Deploy** → click **Deploy latest commit**.

