import axios from "axios";
import { useAuthStore } from "../context/authStore";
import { attachCsrfHeader } from "./csrf";
import { getApiBaseUrl } from "../config/apiBaseUrl";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return attachCsrfHeader(config);
});

let refreshPromise = null;
let refreshUnavailable = false;

export async function refreshAuthSessionRequest() {
  refreshPromise = refreshPromise || api.post("/api/auth/refresh", {});
  try {
    const response = await refreshPromise;
    refreshUnavailable = false;
    return response;
  } finally {
    refreshPromise = null;
  }
}

api.interceptors.response.use(
  (res) => {
    const requestPath = res?.config?.url || "";
    if (
      requestPath.includes("/api/auth/login") ||
      requestPath.includes("/api/auth/register") ||
      requestPath.includes("/api/auth/refresh")
    ) {
      refreshUnavailable = false;
    }
    return res;
  },
  async (err) => {
    const status = err?.response?.status;
    const originalRequest = err?.config;
    const requestPath = originalRequest?.url || "";

    // Don't retry logout/logout-all requests - let them fail naturally
    // These endpoints now handle 401 gracefully
    const isAuthEndpoint =
      requestPath.includes("/api/auth/login") ||
      requestPath.includes("/api/auth/register") ||
      requestPath.includes("/api/auth/refresh") ||
      requestPath.includes("/api/auth/logout");
    if (isAuthEndpoint) {
      return Promise.reject(err);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const { setAuth, logout } = useAuthStore.getState();

      if (refreshUnavailable) {
        logout();
        return Promise.reject(err);
      }

      originalRequest._retry = true;

      try {
        const response = await refreshAuthSessionRequest();
        setAuth(response.data.data);
        return api(originalRequest);
      } catch (refreshError) {
        refreshUnavailable = true;
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);
