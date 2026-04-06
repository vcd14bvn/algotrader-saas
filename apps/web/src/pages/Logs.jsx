import { useState, useEffect, useRef } from 'react';
import { engineAPI } from '../lib/api';

const LOG_COLORS = {
  'SIGNAL':    '#818CF8', 'ORB':       '#818CF8', 'VWAP':      '#10B981',
  'T1 HIT':   '#FCD34D', 'T2 HIT':   '#34D399',  'WIN':       '#34D399',
  'LOSS':     '#EF4444', 'SL_HIT':   '#EF4444',  'RISK BLOCK':'#EF4444',
  'VIX BLOCK':'#EF4444', 'SQUAREOFF':'#F97316',  'TRADE OPENED':'#60A5FA',
  'ENGINE STARTED':'#34D399','ENGINE STOPPED':'#EF4444',
  'STRIKE SELECTED':'#A78BFA','DATA':'#94A3B8',
};

function logColor(msg) {
  for (const [key, color] of Object.entries(LOG_COLORS)) {
    if (msg?.includes(key)) return color;
  }
  return 'var(--color-muted)';
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState('ALL');
  const containerRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const { data } = await engineAPI.getLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([{ _id: '1', message: '[09:15:00] ENGINE: Waiting for market hours...', source: 'engine' }]);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const t = setInterval(fetchLogs, 5000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const LEVEL_KEYWORDS = {
    'SIGNAL': ['SIGNAL','ORB','VWAP','CPR'],
    'TRADE':  ['TRADE','T1 HIT','T2 HIT','WIN','LOSS','SQUAREOFF','STRIKE'],
    'RISK':   ['RISK','VIX','BLOCK','WARN'],
    'DATA':   ['DATA','DB','SCAN','LOOP'],
  };

  const filtered = logs.filter(log => {
    const msg = log.message || log.msg || '';
    if (filter && !msg.toLowerCase().includes(filter.toLowerCase())) return false;
    if (level !== 'ALL') {
      const keys = LEVEL_KEYWORDS[level] || [];
      return keys.some(k => msg.includes(k));
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>Live Logs</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Search logs..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'var(--color-card)', color: 'var(--color-text)', fontSize: 12, width: 180 }}
          />
          {['ALL','SIGNAL','TRADE','RISK','DATA'].map(l => (
            <button key={l} onClick={() => setLevel(l)}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--color-border)',
                background: level === l ? '#6366F1' : 'var(--color-card)',
                color: level === l ? '#fff' : 'var(--color-muted)' }}>
              {l}
            </button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
          <button className="btn-primary" onClick={fetchLogs} style={{ fontSize: 12, padding: '6px 12px' }}>🔄 Refresh</button>
        </div>
      </div>

      {/* Log count */}
      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
        Showing {filtered.length} of {logs.length} entries
        {level !== 'ALL' && <span style={{ marginLeft: 8, color: '#818CF8' }}>filtered: {level}</span>}
      </div>

      {/* Log window */}
      <div ref={containerRef} style={{
        flex: 1, overflowY: 'auto', background: 'var(--color-card)',
        border: '1px solid var(--color-border)', borderRadius: 16,
        padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
      }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--color-muted)', padding: 20, textAlign: 'center' }}>
            No logs found. Start the engine to see activity.
          </div>
        ) : (
          filtered.map((log, i) => {
            const msg = log.message || log.msg || '';
            const color = logColor(msg);
            const isWin  = msg.includes('WIN') || msg.includes('T2_HIT');
            const isLoss = msg.includes('LOSS') || msg.includes('SL_HIT');
            return (
              <div key={i} style={{
                padding: '2px 0',
                borderLeft: `2px solid ${color}`,
                paddingLeft: 10,
                marginBottom: 2,
                background: isWin ? 'rgba(52,211,153,0.04)' : isLoss ? 'rgba(239,68,68,0.04)' : 'transparent',
                borderRadius: 2,
              }}>
                <span style={{ color }}>{msg}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
