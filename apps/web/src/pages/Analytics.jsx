import { useState, useEffect } from 'react';
import { tradesAPI } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F97316', '#EF4444'];
const STRATEGY_COLORS = { ORB: '#6366F1', VWAP: '#10B981', CPR: '#F59E0B' };

const DEMO_ANALYTICS = {
  total_trades: 47, win_rate: 63.8, profit_factor: 2.14, max_drawdown: 4.2, best_day: 12500, total_pnl: 38750,
  pnl_curve: [
    { date: '2026-03-01', daily_pnl: 2500, cumulative_pnl: 2500 },
    { date: '2026-03-04', daily_pnl: -1200, cumulative_pnl: 1300 },
    { date: '2026-03-05', daily_pnl: 4800, cumulative_pnl: 6100 },
    { date: '2026-03-06', daily_pnl: 3200, cumulative_pnl: 9300 },
    { date: '2026-03-07', daily_pnl: -800, cumulative_pnl: 8500 },
    { date: '2026-03-10', daily_pnl: 5600, cumulative_pnl: 14100 },
    { date: '2026-03-11', daily_pnl: -2100, cumulative_pnl: 12000 },
    { date: '2026-03-12', daily_pnl: 7200, cumulative_pnl: 19200 },
    { date: '2026-03-13', daily_pnl: 4500, cumulative_pnl: 23700 },
    { date: '2026-03-14', daily_pnl: -1500, cumulative_pnl: 22200 },
    { date: '2026-03-17', daily_pnl: 8300, cumulative_pnl: 30500 },
    { date: '2026-03-18', daily_pnl: 4950, cumulative_pnl: 35450 },
    { date: '2026-03-19', daily_pnl: 3300, cumulative_pnl: 38750 },
  ],
  win_rate_by_strategy: [
    { strategy: 'ORB', win_rate: 68, trades: 25, pnl: 28500 },
    { strategy: 'VWAP', win_rate: 58, trades: 22, pnl: 10250 },
    { strategy: win_rate: 65, trades: 18, pnl: 14200 },
  ],
  drawdown_curve: [
    { date: '2026-03-01', drawdown_pct: 0 }, { date: '2026-03-04', drawdown_pct: -2.1 },
    { date: '2026-03-07', drawdown_pct: -1.5 }, { date: '2026-03-11', drawdown_pct: -4.2 },
    { date: '2026-03-14', drawdown_pct: -3.0 }, { date: '2026-03-19', drawdown_pct: 0 },
  ],
  pnl_by_index: [
    { index: 'NIFTY', pnl: 22800 },
    { index: 'BANKNIFTY', pnl: 9450 },
    { index: 'SENSEX', pnl: 6500 },
  ],
  best_trades: [
    { date: '2026-03-17', index: 'NIFTY', strategy: 'ORB', option_symbol: 'NIFTY20MAR23200CE', entry: 23185, exit: 23522, pnl: 16850 },
    { date: '2026-03-12', index: 'BANKNIFTY', strategy: 'ORB', option_symbol: 'BANKNIFTY20MAR49500CE', entry: 49200, exit: 49680, pnl: 7200 },
    { date: '2026-03-06', index: 'NIFTY', strategy: 'VWAP', option_symbol: 'NIFTY20MAR23000CE', entry: 23010, exit: 23280, pnl: 5400 },
    { date: '2026-03-18', index: 'SENSEX', strategy: 'ORB', option_symbol: 'SENSEX20MAR76900CE', entry: 76850, exit: 77225, pnl: 3750 },
    { date: '2026-03-10', index: 'NIFTY', strategy: 'VWAP', option_symbol: 'NIFTY20MAR23100PE', entry: 23280, exit: 23080, pnl: 3200 },
  ],
  worst_trades: [
    { date: '2026-03-11', index: 'BANKNIFTY', strategy: 'VWAP', option_symbol: 'BANKNIFTY20MAR49200PE', entry: 49520, exit: 49700, pnl: -2700 },
    { date: '2026-03-04', index: 'NIFTY', strategy: 'ORB', option_symbol: 'NIFTY20MAR23100CE', entry: 23180, exit: 23050, pnl: -2600 },
    { date: '2026-03-14', index: 'SENSEX', strategy: 'VWAP', option_symbol: 'SENSEX20MAR77000PE', entry: 77050, exit: 77200, pnl: -1500 },
    { date: '2026-03-07', index: 'BANKNIFTY', strategy: 'ORB', option_symbol: 'BANKNIFTY20MAR49800CE', entry: 49800, exit: 49700, pnl: -1500 },
    { date: '2026-03-13', index: 'NIFTY', strategy: 'VWAP', option_symbol: 'NIFTY20MAR23300CE', entry: 23310, exit: 23250, pnl: -1200 },
  ],
};

export default function Analytics() {
  const [data, setData] = useState(DEMO_ANALYTICS);
  const [dateRange, setDateRange] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await tradesAPI.getAnalytics();
        if (res.total_trades > 0) setData(res);
      } catch {}
    })();
  }, []);

  const overviewMetrics = [
    { label: 'Total Trades', value: data.total_trades, color: '#F1F5F9' },
    { label: 'Win Rate', value: `${data.win_rate}%`, color: '#34D399' },
    { label: 'Profit Factor', value: data.profit_factor, color: '#818CF8' },
    { label: 'Max Drawdown', value: `${data.max_drawdown}%`, color: '#EF4444' },
    { label: 'Best Day', value: `₹${data.best_day?.toLocaleString()}`, color: '#FCD34D' },
    { label: 'Total P&L', value: `₹${data.total_pnl?.toLocaleString()}`, color: data.total_pnl >= 0 ? '#10B981' : '#EF4444' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
        <div style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? `₹${p.value.toLocaleString()}` : p.value}
          </div>
        ))}
      </div>
    );
  };

  const TradeTable = ({ trades, label }) => (
    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Date</th><th>Index</th><th>Strategy</th><th>Option</th><th>Entry</th><th>Exit</th><th>P&L</th></tr>
        </thead>
        <tbody>
          {(trades || []).map((t, i) => (
            <tr key={i} className="signal-row">
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.date?.slice(5)}</td>
              <td style={{ fontWeight: 600 }}>{t.index}</td>
              <td><span style={{ fontSize: 12, fontWeight: 700, color: t.strategy === 'ORB' ? '#818CF8' : t.strategy === 'VWAP' ? '#F97316' : '#34D399' }}>{t.strategy}</span></td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)' }}>{t.option_symbol}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{t.entry?.toLocaleString()}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{t.exit?.toLocaleString()}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.pnl >= 0 ? '#34D399' : '#EF4444' }}>
                {t.pnl >= 0 ? '+' : ''}₹{t.pnl?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Analytics</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {['1W', '1M', '3M', 'All'].map((r) => (
            <button key={r} onClick={() => setDateRange(r)} style={{
              background: dateRange === r ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${dateRange === r ? 'rgba(99,102,241,0.4)' : 'var(--color-border)'}`,
              borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: dateRange === r ? '#818CF8' : 'var(--color-muted)', fontFamily: 'var(--font-body)',
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {overviewMetrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* P&L Curve */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Cumulative P&L</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.pnl_curve}>
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" fontSize={11} stroke="#475569" tickFormatter={(v) => v.slice(5)} />
            <YAxis fontSize={11} stroke="#475569" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="cumulative_pnl" stroke="#10B981" fill="url(#pnlGrad)" strokeWidth={2} name="Cumulative P&L" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Win Rate by Strategy */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Win Rate by Strategy</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.win_rate_by_strategy}>
              <XAxis dataKey="strategy" fontSize={12} stroke="#475569" />
              <YAxis fontSize={11} stroke="#475569" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="win_rate" name="Win Rate %" radius={[6, 6, 0, 0]}>
                {data.win_rate_by_strategy.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Drawdown */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Drawdown %</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.drawdown_curve}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" fontSize={11} stroke="#475569" tickFormatter={(v) => v.slice(5)} />
              <YAxis fontSize={11} stroke="#475569" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="drawdown_pct" stroke="#EF4444" fill="url(#ddGrad)" strokeWidth={2} name="Drawdown %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L by Index */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>P&L by Index</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.pnl_by_index || []}>
            <XAxis dataKey="index" fontSize={12} stroke="#475569" />
            <YAxis fontSize={11} stroke="#475569" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pnl" name="P&L" radius={[6, 6, 0, 0]}>
              {(data.pnl_by_index || []).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Best & Worst Trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <TradeTable trades={data.best_trades} label="🏆 Top 5 Wins" />
        <TradeTable trades={data.worst_trades} label="📉 Bottom 5 Losses" />
      </div>
    </div>
  );
}
