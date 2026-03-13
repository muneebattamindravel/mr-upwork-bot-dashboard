// src/apis/axios.js
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const instance = axios.create({
  baseURL: API,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach access token ──────────────────────────────────────────────
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: silently refresh on 401, retry once ─────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401, not on the refresh endpoint itself, not if already retried
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return instance(original);
        });
      }

      original._retry  = true;
      isRefreshing     = true;

      const refreshToken = localStorage.getItem('refreshToken');
      const userId       = localStorage.getItem('userId');

      if (!refreshToken || !userId) {
        // No refresh token → go to login
        isRefreshing = false;
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API}/auth/refresh`, { refreshToken, userId });
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return instance(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('user');
  localStorage.removeItem('token'); // legacy
  window.location.href = '/login';
}

export default instance;
