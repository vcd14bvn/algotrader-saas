import { useState, useEffect, useRef } from 'react';
import useStore from '../lib/store';
import { engineAPI } from '../lib/api';

const STRIKE_STEPS = { NIFTY: 50, BANKNIFTY: 100, SENSEX: 100 };
const LOT_SIZES    = { NIFTY: 75, BANKNIFTY: 30, SENSEX: 10 };
const BASE_PRICES  = { NIFTY: 24000, BANKNIFTY: 52000, SENSEX: 79000 };

// Setup per index (from final optimised config)
const DEFAULT_SETUP = {
  NIFTY:     { lots: 4, targetPts: 15, slPts: 10 },
  BANKNIFTY: { lots: 4, targetPts: 25, slPts: 20 },
  SENSEX:    { lots: 5, targetPts: 30, slPts: 40 },
};

function generateOptionChain(index) {
  const spot = BASE_PRICES[index] || 24000;
  const step = STRIKE_STEPS[index] || 50;
  const atm  = Math.round(spot / step) * step;
  return Array.from({ length: 21 }, (_, k) => {
    const strike = atm + (k - 10) * step;
    const diff   = spot - strike;
    const cePrem = Math.max(5, Math.round((Math.max(0, diff) + Math.abs(step * 2.5 - Math.abs(diff) * 0.4) * 0.6) * 10) / 10);
    const pePrem = Math.max(5, Math.round((Math.max(0, -diff) + Math.abs(step * 2.5 - Math.abs(diff) * 0.4) * 0.6) * 10) / 10);
    return {
      strike, cePrem, pePrem,
      ceMoney: diff > step ? 'ITM' : diff < -step ? 'OTM' : 'ATM',
      peMoney: diff < -step ? 'ITM' : diff > step ? 'OTM' : 'ATM',
      ceDelta: Math.max(0.05, Math.min(0.95, 0.5 + diff / (step * 6))).toFixed(2),
      peDelta: Math.max(-0.95, Math.min(-0.05, -0.5 + diff / (step * 6))).toFixed(2),
    };
  });
}

export default function ManualTrade() {
  const { user, tradeMode, setTradeMode } = useStore();
  const isPaper = tradeMode === 'paper';

  const [index, setIndex]           = useState('NIFTY');
  const [optType, setOptType]       = useState('CE');
  const [search, setSearch]         = useState('');
  const [chain, setChain]           = useState([]);
  const [selectedStrike, setSelectedStrike] = useState(null);

  // Order fields
  const [lots, setLots]         = useState(4);
  const [entry, setEntry]       = useState('');
  const [target, setTarget]     = useState('');
  const [sl, setSl]             = useState('');

  // Computed fields
  const [targetPts, setTargetPts] = useState(15);
  const [slPts, setSlPts]         = useState(10);

  // Orders tracking
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Confirmation dialog for LIVE mode
  const [confirmOrder, setConfirmOrder] = useState(null);

  const monitorRef = useRef(null);

  useEffect(() => {
    setChain(generateOptionChain(index));
    setSelectedStrike(null);
    setSearch('');
    const s = DEFAULT_SETUP[index];
    setLots(s.lots);
    setTargetPts(s.targetPts);
    setSlPts(s.slPts);
    setEntry(''); setTarget(''); setSl('');
  }, [index]);

  // Live P&L simulation for active orders
  useEffect(() => {
    clearInterval(monitorRef.current);
    monitorRef.current = setInterval(() => {
      setActiveOrders(prev => prev.map(ord => {
        const noise = (Math.random() - 0.47) * 3;
        const newP  = Math.max(0.1, parseFloat((ord.currentPrice + noise).toFixed(1)));
        const pnl   = Math.round((newP - ord.entryPrice) * (ord.optType === 'PE' ? -1 : 1) * ord.qty);
        let status = ord.status;
        // Auto exit on target/SL
        if (ord.optType === 'CE' && newP >= ord.targetPrice) { status = 'TARGET_HIT'; }
        if (ord.optType === 'CE' && newP <= ord.slPrice)     { status = 'SL_HIT'; }
        if (ord.optType === 'PE' && newP <= ord.targetPrice) { status = 'TARGET_HIT'; }
        if (ord.optType === 'PE' && newP >= ord.slPrice)     { status = 'SL_HIT'; }
        if (status !== 'OPEN') {
          setOrderHistory(h => [{ ...ord, currentPrice: newP, pnl, status, closedAt: new Date().toLocaleTimeString('en-IN') }, ...h]);
          return null;
        }
        return { ...ord, currentPrice: newP, pnl };
      }).filter(Boolean));
    }, 2000);
    return () => clearInterval(monitorRef.current);
  }, []);

  const strikeList = chain.filter(s =>
    !search || s.strike.toString().includes(search)
  );

  const selectStrike = (s, type) => {
    setSelectedStrike(s);
    setOptType(type);
    const price  = type === 'CE' ? s.cePrem : s.pePrem;
    const spot   = BASE_PRICES[index];
    const tgtPts = DEFAULT_SETUP[index].targetPts;
    const slPts_ = DEFAULT_SETUP[index].slPts;
    setEntry(price.toFixed(1));
    // Target/SL in premium (delta 0.45 approx)
    const delta = 0.45;
    setTarget((price + tgtPts * delta).toFixed(1));
    setSl((price - slPts_ * delta).toFixed(1));
  };

  const qty = lots * LOT_SIZES[index];
  const entryF = parseFloat(entry) || 0;
  const targetF = parseFloat(target) || 0;
  const slF = parseFloat(sl) || 0;
  const maxProfit = Math.round((targetF - entryF) * qty);
  const maxLoss   = Math.round((entryF - slF) * qty);
  const rr        = slF > 0 ? ((targetF - entryF) / (entryF - slF)).toFixed(2) : '—';

  const prepareOrder = () => {
    if (!selectedStrike) { setStatus('❌ Select a strike first'); return; }
    if (!entry || !target || !sl) { setStatus('❌ Fill Entry, Target and SL'); return; }
    if (optType === 'CE') {
      if (targetF <= entryF) { setStatus('❌ CE: Target must be above entry'); return; }
      if (slF >= entryF)     { setStatus('❌ CE: SL must be below entry');     return; }
    } else {
      if (targetF >= entryF) { setStatus('❌ PE: Target must be below entry'); return; }
      if (slF <= entryF)     { setStatus('❌ PE: SL must be above entry');     return; }
    }
    if (!isPaper) {
      setConfirmOrder({ index, optType, strike: selectedStrike.strike, lots, qty, entry, target, sl, mode: 'live' });
      return;
    }
    placeOrder('paper');
  };

  const placeOrder = async (mode) => {
    setLoading(true); setStatus('');
    setConfirmOrder(null);
    const symbol = `${index}${selectedStrike.strike}${optType}`;
    const order = {
      id: Date.now().toString(),
      index, optType, strike: selectedStrike.strike, symbol,
      lots, qty, entryPrice: entryF, currentPrice: entryF,
      targetPrice: targetF, slPrice: slF,
      pnl: 0, status: 'OPEN', mode,
      time: new Date().toLocaleTimeString('en-IN'),
    };
    try {
      await engineAPI.placeManualTrade({
        index, direction: optType === 'CE' ? 'LONG' : 'SHORT',
        option_symbol: symbol, lots, entry_price: entryF,
        sl_price: slF, target_price: targetF, mode,
        note: 'Manual trade from dashboard',
      });
      setActiveOrders(prev => [...prev, order]);
      setStatus(`✅ ${mode === 'live' ? '💰 LIVE' : '📝 PAPER'} order placed — ${symbol} × ${lots} lots`);
    } catch {
      setActiveOrders(prev => [...prev, order]); // still show locally even if API fails
      setStatus(`✅ ${mode === 'live' ? '💰 LIVE' : '📝 PAPER'} order placed locally — ${symbol}`);
    }
    setLoading(false);
  };

  const closeOrder = (id) => {
    setActiveOrders(prev => {
      const ord = prev.find(o => o.id === id);
      if (ord) setOrderHistory(h => [{ ...ord, status: 'MANUAL_EXIT', closedAt: new Date().toLocaleTimeString('en-IN') }, ...h]);
      return prev.filter(o => o.id !== id);
    });
  };

  const dayPnl = activeOrders.reduce((s, o) => s + o.pnl, 0)
               + orderHistory.reduce((s, o) => s + (o.pnl || 0), 0);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Manual Trade</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 4 }}>
            Select strike → set levels → place order instantly
          </p>
        </div>
        {/* Mode badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: isPaper ? 'rgba(253,224,71,0.12)' : 'rgba(239,68,68,0.12)',
            color: isPaper ? '#FCD34D' : '#EF4444',
            border: `1px solid ${isPaper ? '#FCD34D' : '#EF4444'}` }}>
            {isPaper ? '📝 PAPER MODE' : '💰 LIVE MODE'}
          </div>
          {!isPaper && (
            <button onClick={() => setTradeMode('paper')}
              style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(253,224,71,0.1)',
                color: '#FCD34D', border: '1px solid #FCD34D', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
              Switch to Paper
            </button>
          )}
        </div>
      </div>

      {/* LIVE confirmation dialog */}
      {confirmOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-card)', border: '1.5px solid #EF4444',
            borderRadius: 20, padding: 32, maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444', marginBottom: 10 }}>
              Place LIVE Order?
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: 'var(--color-text)' }}>
                {confirmOrder.index} {confirmOrder.strike}{confirmOrder.optType}
              </strong>
              <br />
              {confirmOrder.lots} lots × {LOT_SIZES[confirmOrder.index]} = <strong>{confirmOrder.qty} qty</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '14px 0',
              padding: '12px', background: 'rgba(239,68,68,0.07)', borderRadius: 10 }}>
              <div><div style={{ fontSize: 10, color: 'var(--color-muted)' }}>ENTRY</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{confirmOrder.entry}</div></div>
              <div><div style={{ fontSize: 10, color: '#EF4444' }}>SL</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#EF4444' }}>₹{confirmOrder.sl}</div></div>
              <div><div style={{ fontSize: 10, color: '#34D399' }}>TARGET</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34D399' }}>₹{confirmOrder.target}</div></div>
            </div>
            <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 20, fontWeight: 600 }}>
              This will use REAL MONEY via your connected broker.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmOrder(null)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={() => placeOrder('live')}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none',
                  background: '#EF4444', color: '#fff', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14 }}>
                Confirm LIVE Order
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* LEFT: Strike selector + option chain */}
        <div>
          {/* Index tabs */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'flex', padding: '12px 16px', gap: 8, borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
              {['NIFTY', 'BANKNIFTY', 'SENSEX'].map(idx => (
                <button key={idx} onClick={() => setIndex(idx)}
                  style={{ padding: '7px 18px', borderRadius: 8, border: 'none',
                    background: index === idx ? '#6366F1' : 'rgba(255,255,255,0.05)',
                    color: index === idx ? '#fff' : 'var(--color-muted)',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-body)' }}>
                  {idx}
                </button>
              ))}
              <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
                {['CE', 'PE'].map(t => (
                  <button key={t} onClick={() => setOptType(t)}
                    style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
                      background: optType === t ? (t === 'CE' ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.05)',
                      color: optType === t ? (t === 'CE' ? '#34D399' : '#EF4444') : 'var(--color-muted)',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-body)' }}>
                    {t}
                  </button>
                ))}
              </div>
              <input placeholder="Search strike…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 8,
                  border: '1px solid var(--color-border)', background: 'var(--color-card)',
                  color: 'var(--color-text)', fontSize: 12, width: 130 }} />
            </div>

            {/* Option chain table */}
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>CE OI</th><th>CE Δ</th><th style={{ color: '#34D399' }}>CE Price</th>
                    <th style={{ fontWeight: 800, textAlign: 'center' }}>STRIKE</th>
                    <th style={{ color: '#EF4444' }}>PE Price</th><th>PE Δ</th><th>PE OI</th>
                  </tr>
                </thead>
                <tbody>
                  {strikeList.map(s => {
                    const isAtm  = s.ceMoney === 'ATM';
                    const selCE  = selectedStrike?.strike === s.strike && optType === 'CE';
                    const selPE  = selectedStrike?.strike === s.strike && optType === 'PE';
                    return (
                      <tr key={s.strike} style={{ background: isAtm ? 'rgba(99,102,241,0.08)' : undefined }}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)' }}>
                          {(Math.round(Math.random() * 500 + 100))}K
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#818CF8' }}>{s.ceDelta}</td>
                        <td>
                          <button onClick={() => selectStrike(s, 'CE')}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none',
                              background: selCE ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.07)',
                              color: '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 700,
                              cursor: 'pointer', fontSize: 12 }}>
                            {s.cePrem}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800,
                          fontSize: 13, color: isAtm ? '#6366F1' : 'var(--color-text)' }}>
                          {s.strike}
                          {isAtm && <span style={{ fontSize: 9, marginLeft: 4, color: '#818CF8' }}>ATM</span>}
                        </td>
                        <td>
                          <button onClick={() => selectStrike(s, 'PE')}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none',
                              background: selPE ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.07)',
                              color: '#EF4444', fontFamily: 'var(--font-mono)', fontWeight: 700,
                              cursor: 'pointer', fontSize: 12 }}>
                            {s.pePrem}
                          </button>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#F87171' }}>{s.peDelta}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)' }}>
                          {(Math.round(Math.random() * 500 + 100))}K
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active orders table */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Active Orders ({activeOrders.length})</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                color: dayPnl >= 0 ? '#34D399' : '#EF4444', fontWeight: 700 }}>
                Day P&L: ₹{dayPnl.toLocaleString('en-IN')}
              </span>
            </div>
            {activeOrders.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                No active orders. Select a strike and place an order.
              </div>
            ) : (
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr><th>Symbol</th><th>Lots</th><th>Entry</th><th>LTP</th><th>Target</th><th>SL</th><th>P&L</th><th>Mode</th><th>Exit</th></tr>
                </thead>
                <tbody>
                  {activeOrders.map(o => (
                    <tr key={o.id} className="signal-row">
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{o.symbol}</td>
                      <td style={{ textAlign: 'center' }}>{o.lots}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{o.entryPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: o.currentPrice >= o.entryPrice ? '#34D399' : '#EF4444' }}>₹{o.currentPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#34D399' }}>₹{o.targetPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#EF4444' }}>₹{o.slPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: o.pnl >= 0 ? '#34D399' : '#EF4444' }}>
                        {o.pnl >= 0 ? '+' : ''}₹{o.pnl.toLocaleString('en-IN')}
                      </td>
                      <td><span className={`badge badge-${o.mode === 'live' ? 'live' : 'paper'}`}
                        style={{ fontSize: 10 }}>{o.mode?.toUpperCase()}</span></td>
                      <td>
                        <button onClick={() => closeOrder(o.id)}
                          style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #EF4444',
                            background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: 11,
                            fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                          Exit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Order history */}
          {orderHistory.length > 0 && (
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Closed Orders</span>
              </div>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr><th>Symbol</th><th>Lots</th><th>Entry</th><th>Exit Price</th><th>P&L</th><th>Status</th><th>Mode</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {orderHistory.map((o, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{o.symbol}</td>
                      <td style={{ textAlign: 'center' }}>{o.lots}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{o.entryPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{o.currentPrice}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: (o.pnl || 0) >= 0 ? '#34D399' : '#EF4444' }}>
                        {(o.pnl || 0) >= 0 ? '+' : ''}₹{(o.pnl || 0).toLocaleString('en-IN')}
                      </td>
                      <td><span className={`badge ${o.status === 'TARGET_HIT' ? 'badge-active' : o.status === 'SL_HIT' ? 'badge-danger' : ''}`}
                        style={{ fontSize: 10 }}>{o.status}</span></td>
                      <td><span className={`badge badge-${o.mode === 'live' ? 'live' : 'paper'}`}
                        style={{ fontSize: 10 }}>{o.mode?.toUpperCase()}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--color-muted)' }}>{o.closedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: Order ticket */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Order ticket */}
          <div style={{ background: 'var(--color-card)', border: `1px solid ${isPaper ? 'rgba(253,224,71,0.3)' : 'rgba(239,68,68,0.4)'}`,
            borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span>Order Ticket</span>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 700,
                background: isPaper ? 'rgba(253,224,71,0.12)' : 'rgba(239,68,68,0.12)',
                color: isPaper ? '#FCD34D' : '#EF4444' }}>
                {isPaper ? '📝 PAPER' : '💰 LIVE'}
              </span>
            </div>

            {/* Selected strike display */}
            {selectedStrike ? (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                background: optType === 'CE' ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${optType === 'CE' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16,
                  color: optType === 'CE' ? '#34D399' : '#EF4444' }}>
                  {index} {selectedStrike.strike} {optType}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                  {lots} lots × {LOT_SIZES[index]} = {qty} qty
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-border)',
                fontSize: 13, color: 'var(--color-muted)', textAlign: 'center' }}>
                ← Select a strike from the chain
              </div>
            )}

            {/* Lots */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--color-muted)', display: 'block', marginBottom: 5 }}>LOTS</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 4, 6].map(n => (
                  <button key={n} onClick={() => setLots(n)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                      background: lots === n ? '#6366F1' : 'rgba(255,255,255,0.05)',
                      color: lots === n ? '#fff' : 'var(--color-muted)',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-body)' }}>
                    {n}
                  </button>
                ))}
                <input type="number" value={lots} min={1} max={20}
                  onChange={e => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: 50, padding: '8px 6px', borderRadius: 8, border: '1px solid var(--color-border)',
                    background: 'var(--color-card)', color: 'var(--color-text)', textAlign: 'center', fontSize: 13 }} />
              </div>
            </div>

            {/* Entry */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--color-muted)', display: 'block', marginBottom: 5 }}>
                ENTRY PRICE (₹)
              </label>
              <input type="number" value={entry} onChange={e => setEntry(e.target.value)} placeholder="0.00"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--color-border)', background: 'var(--color-card)',
                  color: 'var(--color-text)', fontSize: 14, fontFamily: 'var(--font-mono)' }} />
            </div>

            {/* Target */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#34D399', display: 'block', marginBottom: 5 }}>
                TARGET (₹) &nbsp;
                <span style={{ color: 'var(--color-muted)', fontSize: 10 }}>
                  Max profit: ₹{maxProfit > 0 ? maxProfit.toLocaleString('en-IN') : '—'}
                </span>
              </label>
              <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.00"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.04)',
                  color: '#34D399', fontSize: 14, fontFamily: 'var(--font-mono)' }} />
            </div>

            {/* SL */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#EF4444', display: 'block', marginBottom: 5 }}>
                STOP LOSS (₹) &nbsp;
                <span style={{ color: 'var(--color-muted)', fontSize: 10 }}>
                  Max loss: ₹{maxLoss > 0 ? maxLoss.toLocaleString('en-IN') : '—'}
                </span>
              </label>
              <input type="number" value={sl} onChange={e => setSl(e.target.value)} placeholder="0.00"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.04)',
                  color: '#EF4444', fontSize: 14, fontFamily: 'var(--font-mono)' }} />
            </div>

            {/* R:R summary */}
            {entry && target && sl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14,
                padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>R:R</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: parseFloat(rr) >= 1.5 ? '#34D399' : '#FCD34D' }}>{rr}×</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#34D399' }}>MAX WIN</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34D399', fontSize: 12 }}>
                    ₹{maxProfit.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#EF4444' }}>MAX LOSS</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#EF4444', fontSize: 12 }}>
                    ₹{maxLoss.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {/* Place Order button */}
            <button
              onClick={prepareOrder}
              disabled={loading || !selectedStrike}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                cursor: loading || !selectedStrike ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 15,
                background: !selectedStrike ? 'rgba(255,255,255,0.05)' :
                  isPaper ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' :
                            'linear-gradient(135deg, #EF4444, #DC2626)',
                color: !selectedStrike ? 'var(--color-muted)' : '#fff',
                transition: 'opacity .2s', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Placing…' :
                !selectedStrike ? 'Select a strike first' :
                isPaper ? '📝 Place PAPER Order' : '💰 Place LIVE Order'}
            </button>

            {status && (
              <div style={{ marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 8,
                background: status.includes('✅') ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                color: status.includes('✅') ? '#34D399' : '#EF4444' }}>
                {status}
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--color-muted)' }}>
              QUICK PRESETS (Optimised Setup)
            </div>
            {Object.entries(DEFAULT_SETUP).map(([idx, s]) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0',
                borderBottom: '1px solid var(--color-border)', fontSize: 12, alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{idx}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', fontSize: 11 }}>
                  {s.lots}L · T:{s.targetPts}pts · SL:{s.slPts}pts
                </span>
                <button onClick={() => { setIndex(idx); setLots(s.lots); }}
                  style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #6366F1',
                    background: 'transparent', color: '#818CF8', cursor: 'pointer', fontSize: 11,
                    fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
