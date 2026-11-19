import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Resolve base URL from environment or fallback to relative path (leveraging Vite dev proxy)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Inject stored authentication token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('plateaucare_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Standardised error formatting and session eviction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string; error?: string }>) => {
    if (error.response?.status === 401) {
      // Clear token if rejected
      localStorage.removeItem('plateaucare_auth_token');
      // Dispatch custom event for auth listeners
      window.dispatchEvent(new Event('plateaucare:auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
