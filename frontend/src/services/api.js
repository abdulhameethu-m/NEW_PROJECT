import axios from "axios";
import { useAuthStore } from "../context/authStore";
import { attachCsrfHeader } from "./csrf";
import { getApiBaseUrl } from "../config/apiBaseUrl";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  withCredentials: true,
});

const inFlightGetRequests = new Map();

function stableSerialize(value) {
  if (!value || typeof value !== "object") return String(value || "");
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableSerialize(value[key])}`)
    .join("|");
}

function getRequestKey(url, config = {}) {
  return `${config.baseURL || api.defaults.baseURL || ""}|${url}|${stableSerialize(config.params)}`;
}

function installGetRequestDedupe(instance) {
  const rawGet = instance.get.bind(instance);
  instance.get = (url, config = {}) => {
    if (config.dedupe === false || config.responseType === "blob") {
      return rawGet(url, config);
    }

    const key = getRequestKey(url, config);
    if (inFlightGetRequests.has(key)) {
      return inFlightGetRequests.get(key);
    }

    const request = rawGet(url, config).finally(() => {
      inFlightGetRequests.delete(key);
    });
    inFlightGetRequests.set(key, request);
    return request;
  };
}

installGetRequestDedupe(api);

api.interceptors.request.use(async (config) => {
  config.metadata = { ...(config.metadata || {}), startedAt: performance.now() };
  return attachCsrfHeader(config);
});

let refreshPromise = null;
let refreshUnavailable = false;

export async function refreshAuthSessionRequest() {
  const authState = useAuthStore.getState();
  if (!authState.isAuthenticated) {
    authState.setRefreshing?.();
  }
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
    const startedAt = res?.config?.metadata?.startedAt;
    if (typeof startedAt === "number") {
      res.durationMs = Math.round(performance.now() - startedAt);
    }
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
      const { setAuth, logout, markGuest } = useAuthStore.getState();

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
        markGuest?.();
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);
