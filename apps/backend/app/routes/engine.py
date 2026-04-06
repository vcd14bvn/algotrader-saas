"""AlgoTrader Pro — Engine Routes"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/engine", tags=["Engine"])

# Global engine reference — set by main.py on startup
_engine = None


def set_engine(engine):
    global _engine
    _engine = engine


def get_engine():
    return _engine


@router.post("/start")
async def start_engine(user=Depends(require_role("admin", "trader"))):
    engine = get_engine()
    if engine and engine.running:
        return {"message": "Engine is already running", "status": engine.get_status()}
    if engine:
        engine.start()
    return {"message": "Engine started", "status": engine.get_status() if engine else {}}


@router.post("/stop")
async def stop_engine(user=Depends(require_role("admin", "trader"))):
    engine = get_engine()
    if engine and engine.running:
        engine.stop()
        return {"message": "Engine stopped", "status": engine.get_status()}
    return {"message": "Engine is not running"}


@router.get("/status")
async def engine_status(user=Depends(get_current_user)):
    engine = get_engine()
    if engine:
        return engine.get_status()
    return {
        "running": False, "mode": "paper", "vix": None, "cpr_width": None,
        "cpr_day_type": None, "active_trades": 0, "todays_pnl": 0,
        "todays_trades": 0, "last_scan": None, "next_scan": None,
    }


@router.get("/logs")
async def engine_logs(user=Depends(get_current_user)):
    engine = get_engine()
    if engine and engine.logs:
        # Return in-memory logs (most recent first) — faster than DB
        return [{"message": l, "source": "engine"} for l in reversed(engine.logs[-100:])]
    db = get_db()
    logs = await db.engine_logs.find().sort("timestamp", -1).limit(100).to_list(100)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs


@router.post("/mode/{mode}")
async def set_engine_mode(mode: str, user=Depends(require_role("admin"))):
    """Switch engine between paper and live mode."""
    if mode not in ("paper", "live"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Mode must be 'paper' or 'live'")
    engine = get_engine()
    if engine:
        engine.mode = mode
        engine._log("MODE SWITCH", f"Engine switched to {mode.upper()} mode by admin")
        return {"message": f"Engine mode set to {mode}", "mode": mode}
    return {"message": "Engine not initialized"}


@router.get("/active-trades")
async def get_active_trades(user=Depends(get_current_user)):
    """Return currently open trades from engine memory (real-time)."""
    engine = get_engine()
    if engine:
        return {"active_trades": list(engine.active_trades.values()), "count": len(engine.active_trades)}
    return {"active_trades": [], "count": 0}


@router.post("/squareoff-all")
async def squareoff_all(user=Depends(require_role("admin", "trader"))):
    """Manually force squareoff of all active positions."""
    engine = get_engine()
    if not engine:
        return {"message": "Engine not running"}
    count = len(engine.active_trades)
    engine._square_off_all()
    engine._log("MANUAL SQUAREOFF", f"Admin triggered squareoff of {count} positions")
    return {"message": f"Squared off {count} positions", "count": count}


@router.post("/manual-trade")
async def place_manual_trade(data: dict, user=Depends(require_role("admin", "trader"))):
    """Place a manual trade — goes through the engine so SL/Target monitoring applies."""
    from datetime import datetime
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
    engine = get_engine()
    db = get_db()

    index        = data.get("index", "NIFTY").upper()
    direction    = data.get("direction", "LONG").upper()  # LONG or SHORT
    option_symbol= data.get("option_symbol", "")
    lots         = int(data.get("lots", 1))
    entry_price  = float(data.get("entry_price", 0))
    sl_price     = float(data.get("sl_price", 0))
    target_price = float(data.get("target_price", 0))
    mode         = data.get("mode", engine.mode if engine else "paper")
    note         = data.get("note", "")

    from app.services.engine import LOT_SIZES
    lot_size = LOT_SIZES.get(index, 75)
    qty = lots * lot_size

    trade = {
        "index": index, "strategy": "MANUAL", "direction": direction,
        "option_symbol": option_symbol, "entry_price": entry_price,
        "sl": sl_price, "t1": target_price, "t2": round(target_price * 1.3, 2),
        "index_at_entry": entry_price, "quantity": qty, "lots": lots,
        "mode": mode, "t1_hit": False, "timeframe": "manual",
        "entry_time": datetime.now(IST).isoformat(),
        "status": "OPEN", "pnl": 0, "note": note,
        "placed_by": user.get("email", "manual"),
    }

    result = await db.trades.insert_one(trade)
    trade["_id"] = str(result.inserted_id)

    # Register with engine for monitoring if running
    if engine and engine.running:
        engine.active_trades[index + "_MANUAL_" + str(result.inserted_id)[:6]] = {
            **trade, "_db_id": result.inserted_id, "entry_price": entry_price,
            "sl": sl_price, "t1": target_price, "t2": round(target_price * 1.3, 2),
            "quantity": qty, "lots": lots, "scan_count": 0,
        }
        engine._log("MANUAL TRADE", f"{'📝' if mode=='paper' else '💰'} [{mode.upper()}] {direction} {option_symbol} × {lots} lots @ ₹{entry_price} | SL ₹{sl_price} | Target ₹{target_price}")

    return {"message": "Manual trade placed", "trade": trade, "mode": mode}
