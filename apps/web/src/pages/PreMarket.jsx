import { useState, useEffect } from 'react';

const DEMO_PREMARKET = {
  vix: 15.2, vix_status: 'Normal market', vix_color: 'green',
  cpr: { tc: 23285, pivot: 23210, bc: 23135, width_pct: 0.32, day_type: 'NORMAL' },
  gap: { prev_close: 23180, today_open: 23220, gap_amount: 40, gap_pct: 0.17, direction: 'GAP_UP' },
  recommendation: 'ORB + VWAP strategies active — Normal day, CPR width 0.32%. Trade normally.',
  key_levels: [
    { index: 'NIFTY', pivot: 23210, r1: 23370, r2: 23530, s1: 23050, s2: 22890, prev_high: 23340, prev_low: 23080 },
    { index: 'BANKNIFTY', pivot: 49480, r1: 49760, r2: 50040, s1: 49200, s2: 48920, prev_high: 49720, prev_low: 49240 },
    { index: 'SENSEX', pivot: 76820, r1: 77100, r2: 77380, s1: 76540, s2: 76260, prev_high: 77060, prev_low: 76580 },
  ],
};

export default function PreMarket() {
  const [data, setData] = useState(DEMO_PREMARKET);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data: status } = await import('../lib/api').then(m => m.dashboardAPI.getMarketStatus());
      if (status.vix) {
        setData(prev => ({ ...prev, vix: status.vix,
          vix_status: status.vix < 13 ? 'Low volatility' : status.vix < 18 ? 'Normal market' : status.vix < 22 ? 'High VIX — caution' : 'Extreme VIX — no trade',
          vix_color: status.vix < 18 ? 'green' : 'red' }));
      }
    } catch {}
    setLoading(false);
  };

  const vixColor = data.vix < 13 ? '#34D399' : data.vix < 17 ? '#34D399' : data.vix < 20 ? '#FCD34D' : data.vix < 25 ? '#EF4444' : '#EF4444';
  const cprColor = { TRENDING: '#34D399', NORMAL: '#818CF8', WEAK: '#FCD34D', RANGING: '#EF4444' }[data.cpr.day_type] || '#94A3B8';
  const gapColor = data.gap.direction === 'GAP_UP' ? '#34D399' : data.gap.direction === 'GAP_DOWN' ? '#EF4444' : '#94A3B8';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Pre-Market Check</h1>
        <button className="btn-primary" onClick={refresh} disabled={loading}>{loading ? 'Loading...' : '🔄 Refresh'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* VIX */}
        <div className="metric-card">
          <div style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>India VIX</div>
          <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-mono)', color: vixColor }}>{data.vix}</div>
          <div style={{ fontSize: 13, color: vixColor, marginTop: 6 }}>{data.vix_status}</div>
        </div>

        {/* CPR */}
        <div className="metric-card">
          <div style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>CPR Analysis</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', display: 'grid', gap: 4, marginBottom: 8 }}>
            <div>TC: <span style={{ color: '#34D399' }}>{data.cpr.tc}</span></div>
            <div>Pivot: <span style={{ color: '#818CF8' }}>{data.cpr.pivot}</span></div>
            <div>BC: <span style={{ color: '#EF4444' }}>{data.cpr.bc}</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <div style={{ width: `${Math.min(data.cpr.width_pct / 0.6 * 100, 100)}%`, height: '100%', background: cprColor, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: cprColor }}>{data.cpr.width_pct}%</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: cprColor, marginTop: 6 }}>{data.cpr.day_type}</div>
        </div>

        {/* Gap */}
        <div className="metric-card">
          <div style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Gap Analysis</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: gapColor }}>{data.gap.gap_pct}%</span>
            <span className={`badge`} style={{ background: `${gapColor}22`, color: gapColor }}>{data.gap.direction.replace('_', ' ')}</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', marginTop: 8 }}>
            Prev Close: {data.gap.prev_close} → Open: {data.gap.today_open}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Today's Trade Plan</div>
        <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>{data.recommendation}</div>
      </div>

      {/* Key Levels */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Key Levels</span>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Index</th><th>S2</th><th>S1</th><th>Pivot</th><th>R1</th><th>R2</th><th>Prev Low</th><th>Prev High</th></tr>
          </thead>
          <tbody>
            {data.key_levels.map((l, i) => (
              <tr key={i} className="signal-row">
                <td style={{ fontWeight: 700 }}>{l.index}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#EF4444' }}>{l.s2}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#FCA5A5' }}>{l.s1}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#818CF8', fontWeight: 700 }}>{l.pivot}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#6EE7B7' }}>{l.r1}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#34D399' }}>{l.r2}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{l.prev_low}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{l.prev_high}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {data.key_levels.map((l, i) => {
            const range = l.prev_high - l.prev_low;
            const fibs = [
              { name: '62%', price: Math.round(l.prev_low + range * 0.618), color: '#FCD34D' },
              { name: '50%', price: Math.round(l.prev_low + range * 0.50), color: '#FCD34D' },
              { name: '38%', price: Math.round(l.prev_low + range * 0.382), color: '#818CF8' },
              { name: '23%', price: Math.round(l.prev_low + range * 0.236), color: '#60A5FA' },
              { name: '78%', price: Math.round(l.prev_low + range * 0.786), color: '#F97316' },
              { name: '127%', price: Math.round(l.prev_low + range * 1.272), color: '#A78BFA' },
            ];
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#F97316' }}>{l.index}</div>
                {fibs.map(f => (
                  <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: f.color, fontWeight: 600 }}>{f.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{f.price.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
