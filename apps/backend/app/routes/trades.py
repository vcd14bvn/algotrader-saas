"""AlgoTrader Pro — Trade Routes"""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime
from zoneinfo import ZoneInfo
from app.database import get_db
from app.auth import get_current_user
import io, csv

router = APIRouter(prefix="/trades", tags=["Trades"])

IST = ZoneInfo("Asia/Kolkata")


@router.get("/")
async def get_trades(
    strategy: str = None,
    index: str = None,
    result: str = None,
    mode: str = None,
    date_from: str = None,
    date_to: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
):
    db = get_db()
    query = {}
    if strategy:
        query["strategy"] = strategy
    if index:
        query["index"] = index
    if result:
        query["result"] = result
    if mode:
        query["mode"] = mode
    if date_from:
        query["entry_time"] = {"$gte": date_from}
    if date_to:
        query.setdefault("entry_time", {})["$lte"] = date_to

    skip = (page - 1) * limit
    total = await db.trades.count_documents(query)
    trades = await db.trades.find(query).sort("entry_time", -1).skip(skip).limit(limit).to_list(limit)

    for t in trades:
        t["_id"] = str(t["_id"])

    return {"trades": trades, "total": total, "page": page, "limit": limit}


@router.get("/export/csv")
async def export_csv(user=Depends(get_current_user)):
    db = get_db()
    trades = await db.trades.find().sort("entry_time", -1).to_list(1000)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "date", "strategy", "index", "direction", "option_symbol",
        "entry_price", "exit_price", "sl", "t1", "t2", "quantity",
        "pnl", "result", "mode", "exit_reason"
    ])
    writer.writeheader()

    for t in trades:
        writer.writerow({
            "date": t.get("entry_time", ""),
            "strategy": t.get("strategy", ""),
            "index": t.get("index", ""),
            "direction": t.get("direction", ""),
            "option_symbol": t.get("option_symbol", ""),
            "entry_price": t.get("entry_price", ""),
            "exit_price": t.get("exit_price", ""),
            "sl": t.get("sl", ""),
            "t1": t.get("t1", ""),
            "t2": t.get("t2", ""),
            "quantity": t.get("quantity", ""),
            "pnl": t.get("pnl", ""),
            "result": t.get("result", ""),
            "mode": t.get("mode", ""),
            "exit_reason": t.get("exit_reason", ""),
        })

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=trades_{datetime.now(IST).strftime('%Y%m%d')}.csv"},
    )


@router.get("/analytics")
async def get_analytics(user=Depends(get_current_user)):
    db = get_db()
    trades = await db.trades.find({"result": {"$ne": "OPEN"}}).sort("entry_time", 1).to_list(5000)

    if not trades:
        return {
            "total_trades": 0, "win_rate": 0, "profit_factor": 0,
            "max_drawdown": 0, "best_day": 0, "total_pnl": 0,
            "pnl_curve": [], "win_rate_by_strategy": [],
            "drawdown_curve": [], "best_trades": [], "worst_trades": [],
        }

    total_pnl = 0
    peak = 0
    max_dd = 0
    gross_profit = 0
    gross_loss = 0
    wins = 0
    daily_pnl = {}
    strategy_stats = {}
    pnl_curve = []
    drawdown_curve = []

    for t in trades:
        pnl = t.get("pnl", 0) or 0
        total_pnl += pnl
        if pnl > 0:
            gross_profit += pnl
            wins += 1
        else:
            gross_loss += abs(pnl)

        date_str = t.get("entry_time", "")[:10]
        daily_pnl[date_str] = daily_pnl.get(date_str, 0) + pnl

        strat = t.get("strategy", "UNKNOWN")
        if strat not in strategy_stats:
            strategy_stats[strat] = {"wins": 0, "total": 0, "pnl": 0}
        strategy_stats[strat]["total"] += 1
        strategy_stats[strat]["pnl"] += pnl
        if pnl > 0:
            strategy_stats[strat]["wins"] += 1

    cumulative = 0
    for date, dpnl in sorted(daily_pnl.items()):
        cumulative += dpnl
        peak = max(peak, cumulative)
        dd = ((peak - cumulative) / peak * 100) if peak > 0 else 0
        max_dd = max(max_dd, dd)
        pnl_curve.append({"date": date, "daily_pnl": round(dpnl, 2), "cumulative_pnl": round(cumulative, 2)})
        drawdown_curve.append({"date": date, "drawdown_pct": round(-dd, 2)})

    total = len(trades)
    sorted_trades = sorted(trades, key=lambda x: x.get("pnl", 0) or 0, reverse=True)
    for t in sorted_trades:
        t["_id"] = str(t["_id"])

    return {
        "total_trades": total,
        "win_rate": round((wins / total) * 100, 1) if total else 0,
        "profit_factor": round(gross_profit / gross_loss, 2) if gross_loss > 0 else 0,
        "max_drawdown": round(max_dd, 2),
        "best_day": max(daily_pnl.values()) if daily_pnl else 0,
        "total_pnl": round(total_pnl, 2),
        "pnl_curve": pnl_curve,
        "win_rate_by_strategy": [
            {"strategy": k, "win_rate": round(v["wins"] / v["total"] * 100, 1) if v["total"] else 0, "trades": v["total"], "pnl": round(v["pnl"], 2)}
            for k, v in strategy_stats.items()
        ],
        "drawdown_curve": drawdown_curve,
        "best_trades": sorted_trades[:5],
        "worst_trades": sorted_trades[-5:][::-1],
    }


@router.get("/{trade_id}")
async def get_trade(trade_id: str, user=Depends(get_current_user)):
    db = get_db()
    trade = await db.trades.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    trade["_id"] = str(trade["_id"])
    return trade
