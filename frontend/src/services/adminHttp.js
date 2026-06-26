import axios from "axios";
import { useAuthStore } from "../context/authStore";
import { useStaffAuthStore } from "../context/staffAuthStore";
import { refreshAuthSessionRequest } from "./api";
import { attachCsrfHeader } from "./csrf";

function resolveAuthContext() {
  const authState = useAuthStore.getState();
  const role = String(authState?.user?.role || "").trim().toLowerCase();
  const isLegacyAdmin = ["admin", "super_admin", "support_admin", "finance_admin"].includes(role);

  if (authState.user && isLegacyAdmin) {
    return { type: "legacy", ...authState };
  }

  const staffState = useStaffAuthStore.getState();
  if (staffState.user) {
    return { type: "staff", ...staffState };
  }

  if (authState.user) {
    return { type: "legacy", ...authState };
  }

  return { type: "legacy", ...authState };
}

export const adminHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
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
  return `${config.baseURL || adminHttp.defaults.baseURL || ""}|${url}|${stableSerialize(config.params)}`;
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

installGetRequestDedupe(adminHttp);

adminHttp.interceptors.request.use(async (config) => {
  config.metadata = { ...(config.metadata || {}), startedAt: performance.now() };
  const auth = resolveAuthContext();
  config.headers = config.headers || {};
  config.__authType = auth.type;
  return attachCsrfHeader(config);
});

let refreshPromise = null;

adminHttp.interceptors.response.use(
  (response) => {
    const startedAt = response?.config?.metadata?.startedAt;
    if (typeof startedAt === "number") {
      response.durationMs = Math.round(performance.now() - startedAt);
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestPath = originalRequest?.url || "";
    const isAuthEndpoint =
      requestPath.includes("/api/auth/refresh") ||
      requestPath.includes("/api/staff/auth/refresh") ||
      requestPath.includes("/api/auth/logout") ||
      requestPath.includes("/api/staff/auth/logout");

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (originalRequest.__authType === "staff") {
        const { setAuth, logout } = useStaffAuthStore.getState();

        try {
          refreshPromise =
            refreshPromise ||
            adminHttp.post("/api/staff/auth/refresh", {}, { __authType: "staff_refresh" });

          const response = await refreshPromise;
          refreshPromise = null;
          setAuth(response.data.data);
          return adminHttp(originalRequest);
        } catch (refreshError) {
          refreshPromise = null;
          logout();
          return Promise.reject(refreshError);
        }
      }

      const { setAuth, logout } = useAuthStore.getState();

      try {
        const response = await refreshAuthSessionRequest();
        setAuth(response.data.data);
        return adminHttp(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
