"""AlgoTrader Pro — Dashboard Routes"""
from fastapi import APIRouter, Depends
from datetime import datetime
from zoneinfo import ZoneInfo
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

IST = ZoneInfo("Asia/Kolkata")


@router.get("/summary")
async def get_summary(user=Depends(get_current_user)):
    db = get_db()
    now = datetime.now(IST)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    trades = await db.trades.find({"entry_time": {"$gte": today_start}}).to_list(100)
    settings = await db.settings.find_one({"user_id": user["_id"]}) or {}

    total_pnl = sum(t.get("pnl", 0) or 0 for t in trades)
    wins = sum(1 for t in trades if t.get("result") == "WIN")
    total = len(trades)
    capital = settings.get("capital", 200000)
    max_loss = capital * settings.get("max_daily_loss", 2.0) / 100

    return {
        "todays_pnl": round(total_pnl, 2),
        "win_rate": round((wins / total) * 100, 1) if total > 0 else 0,
        "trades_today": total,
        "capital": capital,
        "daily_risk_used": round(abs(min(total_pnl, 0)) / max_loss * 100, 1) if max_loss > 0 else 0,
    }


@router.get("/signals")
async def get_recent_signals(user=Depends(get_current_user)):
    db = get_db()
    signals = await db.signals.find().sort("timestamp", -1).limit(20).to_list(20)
    for s in signals:
        s["_id"] = str(s["_id"])
    return signals


@router.get("/market-status")
async def get_market_status(user=Depends(get_current_user)):
    now = datetime.now(IST)
    market_open_time = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close_time = now.replace(hour=15, minute=30, second=0, microsecond=0)
    is_weekday = now.weekday() < 5
    is_market_hours = market_open_time <= now <= market_close_time
    market_open = is_weekday and is_market_hours

    return {
        "ist_time": now.strftime("%Y-%m-%d %H:%M:%S IST"),
        "market_open": market_open,
        "next_open": None if market_open else (now + __import__("datetime").timedelta(days=1)).replace(hour=9, minute=15).strftime("%Y-%m-%d %H:%M:%S IST") if is_weekday else None,
        "vix": None,  # Populated by engine when running
    }
