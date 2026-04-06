import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Inject auth token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
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
};

// Trades
export const tradesAPI = {
  getAll: (params) => api.get('/trades', { params }),
  getAnalytics: () => api.get('/trades/analytics'),
};

// Engine
export const engineAPI = {
  start: () => api.post('/engine/start'),
  stop: () => api.post('/engine/stop'),
  getStatus: () => api.get('/engine/status'),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  save: (data) => api.put('/settings', data),
  testBroker: () => api.post('/settings/test-broker'),
};

export default api;
