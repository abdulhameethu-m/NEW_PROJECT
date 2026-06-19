const DEFAULT_API_URL = "http://localhost:5000";

function isLoopbackHost(hostname = "") {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(String(hostname).toLowerCase());
}

export function getApiBaseUrl() {
  const configured = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

  if (typeof window === "undefined") return configured;

  try {
    const url = new URL(configured);
    const browserHost = window.location.hostname;

    if (isLoopbackHost(url.hostname) && browserHost && !isLoopbackHost(browserHost)) {
      url.hostname = browserHost;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return configured;
  }

  return configured;
}
