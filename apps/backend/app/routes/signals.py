"""AlgoTrader Pro — Signal Routes"""
from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from app.database import get_db
from app.auth import get_current_user
from app.models.schemas import SignalCreate

router = APIRouter(prefix="/signals", tags=["Signals"])


@router.get("/")
async def get_signals(
    strategy: str = None,
    index: str = None,
    direction: str = None,
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
    if direction:
        query["direction"] = direction

    skip = (page - 1) * limit
    total = await db.signals.count_documents(query)
    signals = await db.signals.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)

    for s in signals:
        s["_id"] = str(s["_id"])

    return {"signals": signals, "total": total, "page": page, "limit": limit}


@router.post("/")
async def create_signal(signal: SignalCreate, user=Depends(get_current_user)):
    db = get_db()
    from datetime import datetime
    from zoneinfo import ZoneInfo

    doc = signal.model_dump()
    doc["timestamp"] = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    doc["created_by"] = user["_id"]

    result = await db.signals.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/{signal_id}")
async def get_signal(signal_id: str, user=Depends(get_current_user)):
    db = get_db()
    signal = await db.signals.find_one({"_id": ObjectId(signal_id)})
    if not signal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Signal not found")
    signal["_id"] = str(signal["_id"])
    return signal
