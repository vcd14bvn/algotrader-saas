import { NavLink, useNavigate } from 'react-router-dom';
import useStore from '../lib/store';
import { engineAPI } from '../lib/api';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/trades', label: 'Trades', icon: '📋' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/pre-market', label: 'Pre-Market', icon: '🌅' },
  { path: '/manual-trade', label: 'Manual Trade', icon: '🎯' },
  { path: '/backtester', label: 'OB Backtester', icon: '📊' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
  { path: '/logs', label: 'Live Logs', icon: '📡' },
];

const ADMIN_NAV_ITEMS = [
  { path: '/users', label: 'User Management', icon: '👥' },
];

export default function Sidebar() {
  const { user, logout, engineStatus, setEngineStatus, tradeMode, setTradeMode } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modeLoading, setModeLoading] = useState(false);
  const [showModeConfirm, setShowModeConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  // Poll engine status every 10s
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const { data } = await engineAPI.getStatus();
        setEngineStatus(data);
      } catch {}
    }, 10000);
    return () => clearInterval(poll);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data } = await engineAPI.start();
      if (data.status) setEngineStatus(data.status);
    } catch {}
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const { data } = await engineAPI.stop();
      if (data.status) setEngineStatus(data.status);
    } catch {}
    setLoading(false);
  };

  // Request mode switch — show confirmation for LIVE
  const requestModeSwitch = (mode) => {
    if (mode === tradeMode) return;
    if (mode === 'live') {
      setPendingMode('live');
      setShowModeConfirm(true);
    } else {
      confirmModeSwitch('paper');
    }
  };

  const confirmModeSwitch = async (mode) => {
    setShowModeConfirm(false);
    setPendingMode(null);
    setModeLoading(true);
    try {
      await engineAPI.setMode(mode);
      setTradeMode(mode);
      setEngineStatus({ ...engineStatus, mode });
    } catch (e) {
      alert('Failed to switch mode. Check broker credentials in Settings.');
    }
    setModeLoading(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const isPaper = tradeMode === 'paper';
  const statusColor = engineStatus.running
    ? (engineStatus.mode === 'live' ? 'dot-green' : 'dot-amber')
    : 'dot-red';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #818CF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AlgoTrader Pro
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: 4 }}>
          NIFTY · BANKNIFTY · SENSEX
        </div>
      </div>

      {/* ── TRADE MODE TOGGLE ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Trade Mode
        </div>
        <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
          {/* PAPER button */}
          <button
            onClick={() => requestModeSwitch('paper')}
            disabled={modeLoading}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700,
              fontSize: 13, transition: 'all 0.2s',
              background: isPaper ? 'rgba(253,224,71,0.18)' : 'rgba(255,255,255,0.05)',
              color: isPaper ? '#FCD34D' : 'var(--color-muted)',
              boxShadow: isPaper ? 'inset 0 0 0 1.5px #FCD34D' : 'inset 0 0 0 1px var(--color-border)',
            }}
          >
            📝 PAPER
          </button>
          {/* LIVE button */}
          <button
            onClick={() => requestModeSwitch('live')}
            disabled={modeLoading}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700,
              fontSize: 13, transition: 'all 0.2s',
              background: !isPaper ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
              color: !isPaper ? '#EF4444' : 'var(--color-muted)',
              boxShadow: !isPaper ? 'inset 0 0 0 1.5px #EF4444' : 'inset 0 0 0 1px var(--color-border)',
            }}
          >
            💰 LIVE
          </button>
        </div>
        {/* Mode description */}
        <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, padding: '6px 10px', borderRadius: 6,
          background: isPaper ? 'rgba(253,224,71,0.07)' : 'rgba(239,68,68,0.07)',
          color: isPaper ? '#FCD34D' : '#EF4444' }}>
          {isPaper
            ? '📝 Simulated trades · No real money · Safe to test'
            : '💰 REAL MONEY · Orders sent to broker · Trades are LIVE'}
        </div>
      </div>

      {/* ── LIVE MODE CONFIRM DIALOG ── */}
      {showModeConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 20, padding: 32, maxWidth: 360, textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginBottom: 12 }}>
              Switch to LIVE Trading?
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              This will connect to your broker and execute <strong>real trades with real money</strong>.<br />
              All signals and manual orders will place actual orders.<br />
              Make sure your broker credentials are configured in Settings.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowModeConfirm(false); setPendingMode(null); }}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmModeSwitch('live')}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: '#EF4444', color: '#fff', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14 }}
              >
                Yes, Go LIVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#818CF8' }}>
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user?.name || 'Admin'}</div>
            <span className="badge badge-live" style={{ fontSize: 9, padding: '2px 8px' }}>{user?.role || 'admin'}</span>
          </div>
        </div>
      </div>

      {/* Engine Status */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div className={`dot ${statusColor}`} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            Engine: {engineStatus.running ? (engineStatus.mode === 'live' ? 'LIVE' : 'PAPER') : 'STOPPED'}
          </span>
        </div>
        {engineStatus.running ? (
          <button className="btn-danger" style={{ width: '100%', fontSize: 13 }} onClick={handleStop} disabled={loading}>
            {loading ? '...' : '⏹ STOP ENGINE'}
          </button>
        ) : (
          <button className="btn-success" style={{ fontSize: 13 }} onClick={handleStart} disabled={loading}>
            {loading ? '...' : '▶ START ENGINE'}
          </button>
        )}
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, fontFamily: 'var(--font-mono)', lineHeight: 1.8 }}>
          {engineStatus.vix && <div>VIX: <span style={{ color: engineStatus.vix > 18 ? '#EF4444' : '#34D399' }}>{engineStatus.vix}</span></div>}
          <div>P&L: <span style={{ color: (engineStatus.todays_pnl || 0) >= 0 ? '#34D399' : '#EF4444' }}>₹{(engineStatus.todays_pnl || 0).toLocaleString('en-IN')}</span></div>
          {engineStatus.active_trades > 0 && <div>Open: <span style={{ color: '#FCD34D' }}>{engineStatus.active_trades} trade{engineStatus.active_trades > 1 ? 's' : ''}</span></div>}
          {engineStatus.next_scan && <div>Next: {engineStatus.next_scan}</div>}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '12px', flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <>
            <div style={{ margin: '12px 8px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin</div>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
        <button onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
          ← Logout
        </button>
      </div>
    </aside>
  );
}
