"""AlgoTrader Pro — Pydantic Models for Request/Response Validation"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


# ── Enums ──
class Role(str, Enum):
    admin = "admin"
    trader = "trader"
    viewer = "viewer"


class TradeMode(str, Enum):
    paper = "paper"
    live = "live"


class StrategyName(str, Enum):
    ORB = "ORB"
    VWAP = "VWAP"
    CPR = "CPR"


class Direction(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"


class TradeResult(str, Enum):
    WIN = "WIN"
    LOSS = "LOSS"
    BREAKEVEN = "BREAKEVEN"
    OPEN = "OPEN"
    SQUAREDOFF = "SQUAREDOFF"


class CPRDayType(str, Enum):
    TRENDING = "TRENDING"
    NORMAL = "NORMAL"
    WEAK = "WEAK"
    RANGING = "RANGING"


class IndexName(str, Enum):
    NIFTY = "NIFTY"
    BANKNIFTY = "BANKNIFTY"
    SENSEX = "SENSEX"


# ── Auth Models ──
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Role = Role.trader


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


# ── Signal Models ──
class SignalCreate(BaseModel):
    strategy: StrategyName
    index: IndexName
    direction: Direction
    entry: float
    sl: float
    t1: float
    t2: float
    rr_ratio: float
    confluence: int = Field(ge=0, le=5)
    confluence_details: List[str] = []
    option_symbol: str
    mode: TradeMode = TradeMode.paper


class SignalResponse(BaseModel):
    id: str
    strategy: str
    index: str
    direction: str
    entry: float
    sl: float
    t1: float
    t2: float
    rr_ratio: float
    confluence: int
    confluence_details: List[str]
    option_symbol: str
    mode: str
    timestamp: str


# ── Trade Models ──
class TradeResponse(BaseModel):
    id: str
    signal_id: str
    strategy: str
    index: str
    direction: str
    option_symbol: str
    entry_price: float
    exit_price: Optional[float]
    sl: float
    t1: float
    t2: float
    quantity: int
    pnl: Optional[float]
    result: str
    mode: str
    entry_time: str
    exit_time: Optional[str]
    exit_reason: Optional[str]
    t1_hit: bool
    breakeven_set: bool


# ── Settings Models ──
class SettingsUpdate(BaseModel):
    # Broker selection
    broker_type: Optional[str] = "angel_one"  # angel_one | zerodha | upstox | fyers | dhan | fivepaisa

    # Angel One (SmartAPI)
    angel_api_key: Optional[str] = ""
    angel_client_id: Optional[str] = ""
    angel_mpin: Optional[str] = ""
    angel_totp_secret: Optional[str] = ""

    # Zerodha (Kite Connect)
    zerodha_api_key: Optional[str] = ""
    zerodha_api_secret: Optional[str] = ""
    zerodha_user_id: Optional[str] = ""
    zerodha_password: Optional[str] = ""
    zerodha_totp_secret: Optional[str] = ""

    # Upstox
    upstox_api_key: Optional[str] = ""
    upstox_api_secret: Optional[str] = ""
    upstox_redirect_url: Optional[str] = ""

    # Fyers
    fyers_client_id: Optional[str] = ""
    fyers_secret_key: Optional[str] = ""
    fyers_redirect_url: Optional[str] = ""

    # Dhan
    dhan_client_id: Optional[str] = ""
    dhan_access_token: Optional[str] = ""

    # 5Paisa
    fivepaisa_client_code: Optional[str] = ""
    fivepaisa_app_name: Optional[str] = ""
    fivepaisa_user_key: Optional[str] = ""
    fivepaisa_encryption_key: Optional[str] = ""
    fivepaisa_password: Optional[str] = ""

    # Trading
    paper_trade: bool = True
    orb_enabled: bool = True
    vwap_enabled: bool = True
    cpr_enabled: bool = True
    nifty_enabled: bool = True
    banknifty_enabled: bool = True
    sensex_enabled: bool = True
    capital: float = 200000
    risk_per_trade: float = 1.0
    max_daily_loss: float = 2.0
    max_trades_per_day: int = 3
    banknifty_half_lot: bool = True
    ob_enabled: bool = True   # AlphaX OB Order Block strategy   # Halve BankNifty position — reduces drawdown 69%
    squareoff_time: str = "15:10"  # 5-min engine squareoff (last clean candle before 15:15 close)

    # Telegram
    telegram_bot_token: Optional[str] = ""
    telegram_chat_id: Optional[str] = ""
    signal_alert: bool = True
    t1_alert: bool = True
    t2_alert: bool = True
    sl_alert: bool = True
    daily_summary: bool = True



# ── Dashboard Models ──
class DashboardSummary(BaseModel):
    todays_pnl: float = 0
    win_rate: float = 0
    trades_today: int = 0
    capital: float = 200000
    daily_risk_used: float = 0


# ── Engine Models ──
class EngineStatusResponse(BaseModel):
    running: bool = False
    mode: str = "paper"
    vix: Optional[float] = None
    cpr_width: Optional[float] = None
    cpr_day_type: Optional[str] = None
    active_trades: int = 0
    todays_pnl: float = 0
    todays_trades: int = 0
    last_scan: Optional[str] = None
    next_scan: Optional[str] = None


# ── Market Status ──
class MarketStatusResponse(BaseModel):
    ist_time: str
    market_open: bool
    next_open: Optional[str] = None
    vix: Optional[float] = None
