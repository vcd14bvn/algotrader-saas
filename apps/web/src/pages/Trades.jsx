import { useState, useEffect } from 'react';
import { tradesAPI } from '../lib/api';

export default function Trades() {
  const [trades, setTrades] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStrategy, setFilterStrategy] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterStrategy) params.strategy = filterStrategy;
      const { data } = await tradesAPI.getAll(params);
      setTrades(data.trades || []);
      setTotal(data.total || 0);
    } catch {
      // Demo data
      setTrades([
        { _id: '1', strategy: 'ORB', index: 'NIFTY', direction: 'LONG', option_symbol: 'NIFTY20MAR23200CE', entry_price: 23185, exit_price: 23388, sl: 23050, t1: 23388, t2: 23522, quantity: 50, pnl: 10150, result: 'WIN', mode: 'paper', entry_time: '2026-03-19T09:45:00', exit_time: '2026-03-19T10:30:00', exit_reason: 'T2_HIT', t1_hit: true, breakeven_set: true },
        { _id: '2', strategy: 'VWAP', index: 'BANKNIFTY', direction: 'SHORT', option_symbol: 'BANKNIFTY20MAR49500PE', entry_price: 49520, exit_price: 49700, sl: 49700, t1: 49250, t2: 49060, quantity: 15, pnl: -2700, result: 'LOSS', mode: 'paper', entry_time: '2026-03-19T10:15:00', exit_time: '2026-03-19T10:45:00', exit_reason: 'SL_HIT', t1_hit: false, breakeven_set: false },
        { _id: '3', strategy: 'ORB', index: 'SENSEX', direction: 'LONG', option_symbol: 'SENSEX20MAR76900CE', entry_price: 76850, exit_price: 77225, sl: 76600, t1: 77225, t2: 77475, quantity: 10, pnl: 3750, result: 'WIN', mode: 'paper', entry_time: '2026-03-18T09:50:00', exit_time: '2026-03-18T11:00:00', exit_reason: 'T1_HIT', t1_hit: true, breakeven_set: true },
      ]);
      setTotal(3);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrades(); }, [page, filterStrategy]);

  const handleExport = async () => {
    try {
      const { data } = await tradesAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch {}
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Trade History</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>{total} total trades</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="input-field" style={{ width: 'auto' }} value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)}>
            <option value="">All Strategies</option>
            <option value="ORB">ORB</option>
            <option value="VWAP">VWAP</option>
          </select>
          <button className="btn-primary" onClick={handleExport}>📥 Export CSV</button>
        </div>
      </div>

      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Strategy</th><th>Index</th><th>Side</th><th>Entry</th>
              <th>Exit</th><th>P&L</th><th>Result</th><th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t._id} className="signal-row">
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.entry_time?.slice(0, 16).replace('T', ' ')}</td>
                <td><span style={{ color: t.strategy === 'ORB' ? '#818CF8' : '#34D399', fontWeight: 700, fontSize: 12 }}>{t.strategy}</span></td>
                <td>{t.index}</td>
                <td><span className={`badge badge-${t.direction?.toLowerCase()}`}>{t.direction}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{t.entry_price?.toLocaleString()}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{t.exit_price?.toLocaleString() || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: (t.pnl || 0) >= 0 ? '#34D399' : '#EF4444' }}>
                  {(t.pnl || 0) >= 0 ? '+' : ''}₹{(t.pnl || 0).toLocaleString()}
                </td>
                <td>
                  <span className={`badge ${t.result === 'WIN' ? 'badge-active' : t.result === 'LOSS' ? 'badge-stopped' : 'badge-paper'}`}>
                    {t.result}
                  </span>
                </td>
                <td><span className={`badge badge-${t.mode === 'paper' ? 'paper' : 'live'}`}>{t.mode}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Page {page}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} disabled={trades.length < 20} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
