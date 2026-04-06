import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../lib/api';
import useStore from '../lib/store';

const TABS = [
  { key: 'admin', label: '🔒 Admin Login' },
  { key: 'user', label: '👤 User Login' },
  { key: 'register', label: '📝 Register' },
];

export default function Login() {
  const [activeTab, setActiveTab] = useState('admin');
  const [email, setEmail] = useState('admin@algotrader.pro');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useStore();
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    if (tab === 'admin') {
      setEmail('admin@algotrader.pro');
      setPassword('admin123');
    } else {
      setEmail('');
      setPassword('');
    }
    setName('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.registerPublic({ email, password, name });
      // Store auth — App.jsx will detect approved=false and show pending screen
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  const isRegister = activeTab === 'register';

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #fff, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
            AlgoTrader Pro
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Indian equity options trading engine</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 12,
          padding: 4,
          border: '1px solid var(--color-border)',
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              style={{
                flex: 1,
                padding: '10px 8px',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? '#fff' : 'var(--color-muted)',
                background: activeTab === tab.key
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(129,140,248,0.3))'
                  : 'transparent',
                border: activeTab === tab.key
                  ? '1px solid rgba(129,140,248,0.3)'
                  : '1px solid transparent',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          {/* Name field — only for register */}
          {isRegister && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label>
              <input
                className="input-field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={activeTab === 'admin' ? 'admin@algotrader.pro' : 'you@example.com'}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#86EFAC' }}>
              {success}
            </div>
          )}

          <button
            className="btn-primary"
            type="submit"
            style={{ width: '100%', padding: '12px', fontSize: 15 }}
            disabled={loading}
          >
            {loading
              ? (isRegister ? 'Creating Account...' : 'Signing in...')
              : (isRegister ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        {/* Market hours */}
        <div style={{ marginTop: 16, padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            🟢 Market Hours: 9:15 AM – 3:30 PM IST
          </div>
        </div>
      </div>
    </div>
  );
}
