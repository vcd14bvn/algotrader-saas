// ── AlgoTrader Pro — Shared Type Definitions ──

export type Role = 'admin' | 'trader' | 'viewer';
export type TradeMode = 'paper' | 'live';
export type StrategyName = 'ORB' | 'VWAP' | 'CPR';
export type Direction = 'LONG' | 'SHORT';
export type TradeResult = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN' | 'SQUAREDOFF';
export type CPRDayType = 'TRENDING' | 'NORMAL' | 'WEAK' | 'RANGING';
export type IndexName = 'NIFTY' | 'BANKNIFTY' | 'SENSEX';

// ── User ──
export interface User {
  _id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

// ── Auth ──
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ── Signal ──
export interface Signal {
  _id: string;
  strategy: StrategyName;
  index: IndexName;
  direction: Direction;
  entry: number;
  sl: number;
  t1: number;
  t2: number;
  rr_ratio: number;
  confluence: number;
  confluence_details: string[];
  option_symbol: string;
  mode: TradeMode;
  timestamp: string;
}

// ── Trade ──
export interface Trade {
  _id: string;
  signal_id: string;
  strategy: StrategyName;
  index: IndexName;
  direction: Direction;
  option_symbol: string;
  entry_price: number;
  exit_price: number | null;
  sl: number;
  t1: number;
  t2: number;
  quantity: number;
  pnl: number | null;
  result: TradeResult;
  mode: TradeMode;
  entry_time: string;
  exit_time: string | null;
  exit_reason: string | null;
  t1_hit: boolean;
  breakeven_set: boolean;
}

// ── Engine Status ──
export interface EngineStatus {
  running: boolean;
  mode: TradeMode;
  vix: number | null;
  cpr_width: number | null;
  cpr_day_type: CPRDayType | null;
  active_trades: number;
  todays_pnl: number;
  todays_trades: number;
  last_scan: string | null;
  next_scan: string | null;
}

// ── Dashboard Summary ──
export interface DashboardSummary {
  todays_pnl: number;
  win_rate: number;
  trades_today: number;
  capital: number;
  daily_risk_used: number;
}

// ── Settings ──
export interface Settings {
  // Broker
  angel_api_key: string;
  angel_client_id: string;
  angel_mpin: string;
  angel_totp_secret: string;

  // Trading mode
  paper_trade: boolean;

  // Strategies
  orb_enabled: boolean;
  vwap_enabled: boolean;
  cpr_enabled: boolean;

  // Instruments
  nifty_enabled: boolean;
  banknifty_enabled: boolean;
  sensex_enabled: boolean;

  // Risk
  capital: number;
  risk_per_trade: number;
  max_daily_loss: number;
  max_trades_per_day: number;
  squareoff_time: string;

  // Notifications
  telegram_bot_token: string;
  telegram_chat_id: string;
  signal_alert: boolean;
  t1_alert: boolean;
  t2_alert: boolean;
  sl_alert: boolean;
  daily_summary: boolean;
}

// ── Pre-Market ──
export interface PreMarketData {
  vix: number;
  vix_status: string;
  vix_color: 'green' | 'amber' | 'red';
  cpr: { tc: number; pivot: number; bc: number; width_pct: number; day_type: CPRDayType };
  gap: { prev_close: number; today_open: number; gap_amount: number; gap_pct: number; direction: 'GAP_UP' | 'GAP_DOWN' | 'FLAT' };
  recommendation: string;
  key_levels: { index: IndexName; pivot: number; r1: number; r2: number; s1: number; s2: number; prev_high: number; prev_low: number }[];
}

// ── Analytics ──
export interface Analytics {
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
  best_day: number;
  total_pnl: number;
  pnl_curve: { date: string; daily_pnl: number; cumulative_pnl: number }[];
  win_rate_by_strategy: { strategy: StrategyName; win_rate: number; trades: number; pnl: number }[];
  drawdown_curve: { date: string; drawdown_pct: number }[];
  best_trades: Trade[];
  worst_trades: Trade[];
}

// ── API Error ──
export interface ApiError {
  error: string;
  code: number;
}

// ── Market Status ──
export interface MarketStatus {
  ist_time: string;
  market_open: boolean;
  next_open: string | null;
  vix: number | null;
}
