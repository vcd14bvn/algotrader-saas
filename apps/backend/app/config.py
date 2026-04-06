"""AlgoTrader Pro — Backend Configuration"""
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/algotrader")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
PORT = int(os.getenv("PORT", "8000"))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
DB_NAME = "algotrader"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
