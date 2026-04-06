"""AlgoTrader Pro — FastAPI Application Entry Point"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_db, close_db, get_db
from app.auth import hash_password
from app.config import ADMIN_PASSWORD, ALLOWED_ORIGINS
from app.routes import auth, dashboard, signals, trades, settings, engine as engine_routes
from app.services.engine import TradingEngine
import json

# Connected WebSocket clients
ws_clients: list[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    db = get_db()

    # Create default admin user if not exists
    admin = await db.users.find_one({"email": "admin@algotrader.pro"})
    if not admin:
        await db.users.insert_one({
            "email": "admin@algotrader.pro",
            "password": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "approved": True,
            "created_at": __import__("datetime").datetime.utcnow().isoformat(),
        })
        print("[INIT] Default admin user created: admin@algotrader.pro")

    # Initialize trading engine
    trading_engine = TradingEngine(db)
    engine_routes.set_engine(trading_engine)

    yield
    # Shutdown
    trading_engine.stop()
    await close_db()


app = FastAPI(
    title="AlgoTrader Pro API",
    description="Production-grade trading engine for Indian equity options",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Set ALLOWED_ORIGINS env var in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(signals.router)
app.include_router(trades.router)
app.include_router(settings.router)
app.include_router(engine_routes.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AlgoTrader Pro API", "version": "1.0.0"}


@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    await websocket.accept()
    ws_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Heartbeat / keep-alive
    except WebSocketDisconnect:
        ws_clients.remove(websocket)


async def broadcast_signal(signal: dict):
    """Broadcast new signal to all connected WebSocket clients.
    FIX: Copy list before iteration to prevent mutation-during-iteration crash.
    """
    message = json.dumps(signal)
    dead = []
    for client in list(ws_clients):
        try:
            await client.send_text(message)
        except Exception:
            dead.append(client)
    for client in dead:
        if client in ws_clients:
            ws_clients.remove(client)


async def send_telegram_alert(bot_token: str, chat_id: str, text: str):
    """Send a Telegram message. Called for signal/trade alerts."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            )
    except Exception:
        pass  # Non-critical — don't crash engine on Telegram failure
