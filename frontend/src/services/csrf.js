import axios from "axios";
import { getApiBaseUrl } from "../config/apiBaseUrl";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-TOKEN";
const SAFE_METHODS = new Set(["get", "head", "options"]);

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || ""
  );
}

let csrfPromise = null;

function isUnsafeMethod(method = "get") {
  return !SAFE_METHODS.has(String(method || "get").toLowerCase());
}

export async function ensureCsrfToken() {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) return decodeURIComponent(existing);

  csrfPromise =
    csrfPromise ||
    axios
      // This request runs before every state-changing API call.  It must be
      // bounded independently, otherwise a stalled bootstrap request leaves
      // cart and checkout actions waiting outside Axios' normal timeout.
      .get(`${getApiBaseUrl()}/api/auth/csrf`, { withCredentials: true, timeout: 5000 })
      .then((response) => response.data?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME))
      .finally(() => {
        csrfPromise = null;
      });

  return csrfPromise;
}

export async function attachCsrfHeader(config) {
  if (!isUnsafeMethod(config.method)) return config;
  const token = await ensureCsrfToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers[CSRF_HEADER_NAME] = token;
  }
  return config;
}
