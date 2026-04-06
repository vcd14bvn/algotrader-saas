import { useEffect, useState } from 'react';
import { dashboardAPI, engineAPI } from '../lib/api';
import useStore from '../lib/store';


const STRATEGIES = [
  { key: 'ORB', name: 'ORB Breakout', time: '9:30 – 10:15 AM', desc: 'Opening Range Breakout with 5-point confluence', color: '#6366F1' },
  { key: 'VWAP', name: 'VWAP Bounce', time: '10:00 AM – 1:00 PM', desc: 'Volume-weighted average price support/rejection', color: '#10B981' },
  { key: 'CPR', name: 'CPR Filter', time: 'Pre-Market', desc: 'Central Pivot Range day classification', color: '#F59E0B' },
];

export default function Dashboard() {
  const { engineStatus } = useStore();
  const [summary, setSummary] = useState({ todays_pnl: 0, win_rate: 0, trades_today: 0, capital: 200000, daily_risk_used: 0 });
  const [signals, setSignals] = useState([]);
  const [marketOpen, setMarketOpen] = useState(false);
  const [activeTrades, setActiveTrades] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await dashboardAPI.getSummary();
        setSummary(data);
      } catch {}
      try {
        const { data } = await dashboardAPI.getMarketStatus();
        setMarketOpen(data.market_open);
      } catch {}
      try {
        const { data } = await dashboardAPI.getSignals();
        if (data.length > 0) setSignals(data);
      } catch {}
      try {
        const { data } = await engineAPI.getActiveTrades();
        setActiveTrades(data.active_trades || []);
      } catch {}
    })();
  }, []);

  const metrics = [
    { label: "Today's P&L", value: `₹${summary.todays_pnl.toLocaleString()}`, color: summary.todays_pnl >= 0 ? '#34D399' : '#EF4444' },
    { label: 'Win Rate', value: `${summary.win_rate}%`, color: '#818CF8' },
    { label: 'Trades Today', value: summary.trades_today, color: '#FCD34D' },
    { label: 'Capital', value: `₹${summary.capital.toLocaleString()}`, color: '#F1F5F9' },
    { label: 'Daily Risk Used', value: `${summary.daily_risk_used}%`, color: summary.daily_risk_used > 70 ? '#EF4444' : '#34D399' },
  ];

  return (
    <div>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {metrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Strategy Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {STRATEGIES.map((s) => {
          const stratSignals = signals.filter(sig => sig.strategy === s.key);
          const wins = stratSignals.filter(sig => sig.confluence >= 4).length;
          return (
            <div key={s.key} className={`strategy-card ${s.key.toLowerCase()}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{s.time}</div>
                </div>
                <span className={`badge ${engineStatus.running ? 'badge-active' : 'badge-off'}`}>
                  {engineStatus.running ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>{s.desc}</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>Win Rate</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{stratSignals.length ? Math.round((wins / stratSignals.length) * 100) : 0}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>Trades</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{stratSignals.length}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Signals — Option Premium based */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Recent Signals</span>
          <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{signals.length} signals • Greeks Equilibrium</span>
        </div>
        {signals.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
            No signals yet. Engine scans every 5 min during market hours.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Strategy</th><th>Option</th><th>Side</th><th>Lots</th><th>Premium</th><th>SL</th>
                <th>T1</th><th>T2</th><th>Δ Delta</th><th>Γ Gamma</th><th>Θ Theta</th><th>P&L</th><th>Conf</th><th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s, i) => (
                <tr key={i} className={`signal-row ${s.direction.toLowerCase()} animate-slide-in`}>
                  <td><span style={{ color: s.strategy === 'ORB' ? '#818CF8' : '#34D399', fontWeight: 700, fontSize: 12 }}>{s.strategy}</span></td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      <div style={{ fontWeight: 600 }}>{s.option_symbol || `${s.index} ${s.strike}${s.option_type}`}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>Spot: {s.index_entry?.toLocaleString() || s.entry?.toLocaleString()}</div>
                    </div>
                  </td>
                  <td><span className={`badge badge-${s.direction.toLowerCase()}`}>{s.direction}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{s.lots ?? 1}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{s.qty ?? '-'} qty</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F1F5F9' }}>₹{s.option_premium ?? s.entry}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#EF4444', fontSize: 12 }}>₹{s.sl_premium ?? s.sl}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#34D399', fontSize: 12 }}>₹{s.t1_premium ?? s.t1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#10B981', fontSize: 12 }}>₹{s.t2_premium ?? s.t2}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#818CF8' }}>{s.greeks?.delta?.toFixed(4) ?? '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#A78BFA' }}>{s.greeks?.gamma ? (s.greeks.gamma * 1000).toFixed(2) + 'e-3' : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FCA5A5' }}>{s.greeks?.theta?.toFixed(1) ?? '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: (s.pnl ?? 0) >= 0 ? '#34D399' : '#EF4444' }}>₹{(s.pnl ?? 0).toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.confluence >= 4 ? '#FCD34D' : 'var(--color-muted)' }}>{s.confluence}/5</td>
                  <td><span className={`badge badge-${s.mode === 'paper' ? 'paper' : 'live'}`}>{s.mode?.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Active Positions Panel */}
      {activeTrades.length > 0 && (
        <div style={{ background: 'var(--color-card)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#FCD34D' }}>⚡ Active Positions ({activeTrades.length})</span>
            <button onClick={async () => { if(window.confirm('Square off ALL positions?')) { await engineAPI.squareoffAll(); } }}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#EF4444', cursor: 'pointer' }}>
              ⏹ Square Off All
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Symbol</th><th>Strategy</th><th>Direction</th><th>Entry ₹</th><th>SL ₹</th><th>T1 ₹</th><th>Qty</th><th>Mode</th></tr>
            </thead>
            <tbody>
              {activeTrades.map((t, i) => (
                <tr key={i} className="signal-row">
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12 }}>{t.option_symbol}</td>
                  <td><span style={{ color: t.strategy === 'ORB' ? '#818CF8' : '#34D399', fontWeight: 700, fontSize: 12 }}>{t.strategy}</span></td>
                  <td><span className={`badge badge-${t.direction?.toLowerCase()}`}>{t.direction}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>₹{t.entry_price}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#EF4444' }}>₹{t.sl}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#34D399' }}>₹{t.t1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{t.quantity}</td>
                  <td><span className={`badge badge-${t.mode === 'paper' ? 'paper' : 'live'}`}>{t.mode?.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Market Banner */}
      <div className="market-banner">
        <div className={`dot ${marketOpen ? 'dot-green' : 'dot-red'}`} />
        {marketOpen
          ? 'Market Open — Engine actively scanning for signals'
          : 'Market Closed — Engine activates at 9:15 AM IST on weekdays'
        }
        {engineStatus.vix && engineStatus.vix > 18 && (
          <span style={{ marginLeft: 'auto', color: '#FCD34D', fontSize: 12 }}>
            ⚠️ High VIX ({engineStatus.vix}) — ORB disabled, VWAP only after 10:30 AM
          </span>
        )}
      </div>
    </div>
  );
}
