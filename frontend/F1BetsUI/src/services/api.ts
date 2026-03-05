import axios from "axios";
import type { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth interceptor (JWT token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Auth endpoints
export const authApi = {
  login(credentials: { username: string; password: string }) {
    return api.post('/auth/login', credentials);
  },

  register(credentials: { username: string; password: string }) {
    return api.post('/auth/register', credentials);
  },
};