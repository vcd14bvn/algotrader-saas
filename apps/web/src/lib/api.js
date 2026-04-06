import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  registerPublic: (data) => api.post('/auth/register-public', data),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (data) => api.post('/auth/change-password', data),
  // Admin user management
  getUsers: () => api.get('/auth/users'),
  approveUser: (id) => api.post(`/auth/approve/${id}`),
  rejectUser: (id) => api.post(`/auth/reject/${id}`),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getSignals: () => api.get('/dashboard/signals'),
  getMarketStatus: () => api.get('/dashboard/market-status'),
};

// Signals
export const signalsAPI = {
  getAll: (params) => api.get('/signals', { params }),
  getById: (id) => api.get(`/signals/${id}`),
  create: (data) => api.post('/signals', data),
};

// Trades
export const tradesAPI = {
  getAll: (params) => api.get('/trades', { params }),
  getById: (id) => api.get(`/trades/${id}`),
  exportCSV: () => api.get('/trades/export/csv', { responseType: 'blob' }),
  getAnalytics: () => api.get('/trades/analytics'),
};

// Engine
export const engineAPI = {
  start: () => api.post('/engine/start'),
  stop: () => api.post('/engine/stop'),
  getStatus: () => api.get('/engine/status'),
  getLogs: () => api.get('/engine/logs'),
  setMode: (mode) => api.post(`/engine/mode/${mode}`),
  getActiveTrades: () => api.get('/engine/active-trades'),
  squareoffAll: () => api.post('/engine/squareoff-all'),
  placeManualTrade: (data) => api.post('/engine/manual-trade', data),
};



// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  save: (data) => api.put('/settings', data),
  testBroker: () => api.post('/settings/test-broker'),
  testTelegram: () => api.post('/settings/test-telegram'),
};

// Pre-Market
export const preMarketAPI = {
  getStatus: () => api.get('/dashboard/market-status'),
  getPreMarketData: () => api.get('/dashboard/summary'),
};

export { api };
export default api;
