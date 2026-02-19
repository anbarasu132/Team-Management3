import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: normalizedBaseUrl
});

export const apiOrigin = normalizedBaseUrl.replace(/\/api$/, '');

export function buildFileUrl(filePath = '') {
  if (!filePath) return '#';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const safePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${apiOrigin}${safePath}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
