"""AlgoTrader Pro — Settings Routes"""
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.auth import get_current_user
from app.models.schemas import SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

# All sensitive fields that should be masked
SENSITIVE_FIELDS = [
    "angel_api_key", "angel_mpin", "angel_totp_secret",
    "zerodha_api_secret", "zerodha_password", "zerodha_totp_secret",
    "upstox_api_secret",
    "fyers_secret_key",
    "dhan_access_token",
    "fivepaisa_user_key", "fivepaisa_encryption_key", "fivepaisa_password",
]


@router.get("/")
async def get_settings(user=Depends(get_current_user)):
    db = get_db()
    settings = await db.settings.find_one({"user_id": user["_id"]})
    if settings:
        settings["_id"] = str(settings["_id"])
        for field in SENSITIVE_FIELDS:
            if settings.get(field):
                settings[field] = "••••" + settings[field][-4:] if len(settings[field]) > 4 else "••••"
    else:
        settings = SettingsUpdate().model_dump()
        settings["user_id"] = user["_id"]
    return settings


@router.put("/")
async def save_settings(data: SettingsUpdate, user=Depends(get_current_user)):
    db = get_db()
    doc = data.model_dump()
    doc["user_id"] = user["_id"]

    # Don't overwrite masked sensitive fields
    existing = await db.settings.find_one({"user_id": user["_id"]})
    if existing:
        for field in SENSITIVE_FIELDS:
            if doc.get(field, "").startswith("••••"):
                doc[field] = existing.get(field, "")

    await db.settings.update_one(
        {"user_id": user["_id"]},
        {"$set": doc},
        upsert=True,
    )
    return {"message": "Settings saved"}


@router.post("/test-broker")
async def test_broker(user=Depends(get_current_user)):
    db = get_db()
    settings = await db.settings.find_one({"user_id": user["_id"]})
    if not settings:
        raise HTTPException(status_code=400, detail="Broker credentials not configured")

    broker = settings.get("broker_type", "angel_one")
    broker_names = {
        "angel_one": "Angel One (SmartAPI)",
        "zerodha": "Zerodha (Kite Connect)",
        "upstox": "Upstox",
        "fyers": "Fyers",
        "dhan": "Dhan",
        "fivepaisa": "5Paisa",
    }

    # Check that at least one credential for the selected broker is set
    required = {
        "angel_one": "angel_api_key",
        "zerodha": "zerodha_api_key",
        "upstox": "upstox_api_key",
        "fyers": "fyers_client_id",
        "dhan": "dhan_client_id",
        "fivepaisa": "fivepaisa_client_code",
    }
    key = required.get(broker, "")
    if not settings.get(key):
        raise HTTPException(status_code=400, detail=f"{broker_names.get(broker, broker)} credentials not configured")

    return {"status": "success", "message": f"{broker_names.get(broker, broker)} connection simulated (paper mode)"}



@router.post("/test-telegram")
async def test_telegram(user=Depends(get_current_user)):
    db = get_db()
    settings = await db.settings.find_one({"user_id": user["_id"]})
    if not settings or not settings.get("telegram_bot_token"):
        raise HTTPException(status_code=400, detail="Telegram not configured")

    try:
        import httpx
        bot_token = settings["telegram_bot_token"]
        chat_id = settings["telegram_chat_id"]
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": "🟢 AlgoTrader Pro — Test message successful!"},
            )
            if resp.status_code == 200:
                return {"status": "success", "message": "Test message sent"}
            else:
                raise HTTPException(status_code=400, detail=f"Telegram error: {resp.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
