import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useStore from './lib/store';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trades from './pages/Trades';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import PreMarket from './pages/PreMarket';
import Logs from './pages/Logs';
import Users from './pages/Users';
import ManualTrade from './pages/ManualTrade';
import Backtester from './pages/Backtester';
import './index.css';

const queryClient = new QueryClient();

function PendingApproval() {
  const { logout, user } = useStore();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg, #0F1117)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-card, #1A1D2E)', border: '1px solid var(--color-border, rgba(255,255,255,0.08))', borderRadius: 24, padding: 48, maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
        <h1 style={{ fontFamily: 'var(--font-heading, sans-serif)', fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
          Awaiting Admin Approval
        </h1>
        <p style={{ color: 'var(--color-muted, #9CA3AF)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
          Hi <strong style={{ color: '#818CF8' }}>{user?.name}</strong>, your account has been created successfully.
        </p>
        <p style={{ color: 'var(--color-muted, #9CA3AF)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          An admin will review and approve your account shortly. You'll have full access once approved.
        </p>
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 28, fontSize: 13, color: 'rgba(129,140,248,0.9)' }}>
          📧 {user?.email}
        </div>
        <button
          onClick={logout}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border, rgba(255,255,255,0.08))', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 600, color: 'var(--color-muted, #9CA3AF)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { token, user } = useStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.approved === false) return <PendingApproval />;
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function AdminRoute({ children }) {
  const { user } = useStore();
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pre-market" element={<PreMarket />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="/manual-trade" element={<ManualTrade />} />
              <Route path="/backtester" element={<Backtester />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
