import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const signup = (email: string, password: string) => api.post('/auth/signup', { email, password });

export const login = (email: string, password: string) => api.post('/auth/login', { email, password });

export const getEligibilityStatus = () => api.get('/eligibility/status');

export const evaluateEligibility = (monthBalances: number[]) =>
  api.post('/eligibility/evaluate', { monthBalances });

export default api;
