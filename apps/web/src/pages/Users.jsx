import { useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import useStore from '../lib/store';

export default function Users() {
  const { user } = useStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'trader' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // user_id being acted on

  const fetchUsers = async () => {
    try {
      const { data } = await authAPI.getUsers();
      setUsers(data.users || []);
    } catch {
      // Fallback: keep empty if unauthorised
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    setError('');
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError('All fields are required');
      return;
    }
    setCreating(true);
    try {
      const { data } = await authAPI.register(newUser);
      setUsers(prev => [...prev, data.user]);
      setShowModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'trader' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
    setCreating(false);
  };

  const handleApprove = async (u) => {
    setActionLoading(u._id);
    try {
      await authAPI.approveUser(u._id);
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, approved: true } : x));
    } catch {}
    setActionLoading(null);
  };

  const handleReject = async (u) => {
    setActionLoading(u._id);
    try {
      await authAPI.rejectUser(u._id);
      setUsers(prev => prev.filter(x => x._id !== u._id));
    } catch {}
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authAPI.deleteUser(deleteTarget._id);
    } catch {}
    setUsers(prev => prev.filter(u => u._id !== deleteTarget._id));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const isAdmin = user?.role === 'admin';
  const isSelf = (u) => u.email === user?.email || u.email === 'admin@algotrader.pro';

  const pendingCount = users.filter(u => !u.approved).length;

  const roleBadge = (role) => {
    const colors = { admin: 'badge-live', trader: 'badge-paper', viewer: 'badge-stopped' };
    return <span className={`badge ${colors[role] || 'badge-paper'}`}>{role}</span>;
  };

  const statusBadge = (u) => {
    if (u.approved) {
      return (
        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
          ✓ Approved
        </span>
      );
    }
    return (
      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.15)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.3)' }}>
        ⏳ Pending
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>User Management</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
            {users.length} registered users
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.15)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.3)' }}>
                {pendingCount} pending approval
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add User</button>
        )}
      </div>

      {/* Pending Approvals — highlighted section at top if any */}
      {pendingCount > 0 && isAdmin && (
        <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#FCD34D', marginBottom: 14 }}>⏳ Pending Approvals</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.filter(u => !u.approved).map(u => (
              <div key={u._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#FCD34D' }}>
                    {u.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={actionLoading === u._id}
                    onClick={() => handleApprove(u)}
                    style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, color: '#34D399', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  >
                    {actionLoading === u._id ? '...' : '✓ Approve'}
                  </button>
                  <button
                    disabled={actionLoading === u._id}
                    onClick={() => handleReject(u)}
                    style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#FCA5A5', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users Table */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>Loading users...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th>
                {isAdmin && <th style={{ width: 80, textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="signal-row">
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.approved ? 'rgba(99,102,241,0.2)' : 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: u.approved ? '#818CF8' : '#FCD34D' }}>
                        {u.name?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td>{statusBadge(u)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      {!isSelf(u) ? (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '5px 12px', color: '#FCA5A5', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
                        >
                          Remove
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 32, width: 420, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚠️</div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>Remove User</h3>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>This action cannot be undone</p>
              </div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                Are you sure you want to remove <strong style={{ color: '#FCA5A5' }}>{deleteTarget.name}</strong> ({deleteTarget.email})?
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1 }}>
                {deleting ? 'Removing...' : '🗑 Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, paddingTop: '8vh', overflowY: 'auto' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 32, width: 420, maxWidth: '90vw', marginBottom: 40 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Add New User</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Full Name</label>
              <input className="input-field" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Ravi Kumar" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
              <input className="input-field" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="ravi@example.com" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Password</label>
              <input className="input-field" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Role</label>
              <select className="input-field" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                <option value="trader">Trader — can view signals and trades</option>
                <option value="viewer">Viewer — read only access</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#FCA5A5' }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={handleCreate} disabled={creating} style={{ flex: 1 }}>
                {creating ? 'Creating...' : 'Create User'}
              </button>
              <button className="btn-danger" onClick={() => setShowModal(false)} style={{ flex: 0 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
