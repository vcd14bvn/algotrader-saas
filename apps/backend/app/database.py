"""AlgoTrader Pro — MongoDB connection via Motor (async)"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI, DB_NAME

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.signals.create_index([("timestamp", -1)])
    await db.trades.create_index([("entry_time", -1)])
    await db.trades.create_index([("strategy", 1), ("result", 1)])
    await db.settings.create_index("user_id", unique=True)
    await db.signals.create_index([("strategy", 1), ("index", 1)])
    print(f"[DB] Connected to MongoDB: {DB_NAME}")


async def close_db():
    global client
    if client:
        client.close()
        print("[DB] MongoDB connection closed")


def get_db():
    return db
