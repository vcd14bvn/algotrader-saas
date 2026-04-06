import { create } from 'zustand';

const useStore = create((set) => ({
  // Auth
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  // Engine
  engineStatus: {
    running: false, mode: 'paper', vix: null, cpr_width: null,
    cpr_day_type: null, active_trades: 0, todays_pnl: 0,
    todays_trades: 0, last_scan: null, next_scan: null,
  },
  setEngineStatus: (status) => set({ engineStatus: status }),

  // Trade Mode — PAPER or LIVE (global, persisted)
  tradeMode: localStorage.getItem('tradeMode') || 'paper',
  setTradeMode: (mode) => {
    localStorage.setItem('tradeMode', mode);
    set({ tradeMode: mode });
  },

  // Settings
  settings: null,
  setSettings: (settings) => set({ settings }),

  // Notifications
  notifications: [],
  addNotification: (msg, type = 'info') => set((state) => ({
    notifications: [...state.notifications.slice(-19),
      { id: Date.now(), msg, type, ts: new Date().toLocaleTimeString('en-IN') }]
  })),
  clearNotifications: () => set({ notifications: [] }),
}));

export default useStore;
