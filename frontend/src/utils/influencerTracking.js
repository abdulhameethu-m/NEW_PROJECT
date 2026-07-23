const TRACKING_STORAGE_KEY = "grm_influencer_tracking";

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

function isValidTrackingToken(token) {
  if (typeof token !== "string" || token.split(".").length !== 3) return false;
  if (typeof window === "undefined") return true;

  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1]));
    if (payload.typ && payload.typ !== "tracking") return false;
    if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function saveTrackingContext(context) {
  if (typeof window === "undefined" || !isValidTrackingToken(context?.trackingToken)) return;
  const payload = {
    ...context,
    savedAt: Date.now(),
    expiresAt: context.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  window.sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(payload));
  window.localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(payload));
  document.cookie = `${TRACKING_STORAGE_KEY}=${encodeURIComponent(context.trackingToken)}; max-age=${30 * 24 * 60 * 60}; path=/; samesite=lax`;
}

export function loadTrackingContext() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TRACKING_STORAGE_KEY) || window.localStorage.getItem(TRACKING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidTrackingToken(parsed.trackingToken) || (parsed.expiresAt && Number(parsed.expiresAt) < Date.now())) {
      clearTrackingContext();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearTrackingContext() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TRACKING_STORAGE_KEY);
  window.localStorage.removeItem(TRACKING_STORAGE_KEY);
  document.cookie = `${TRACKING_STORAGE_KEY}=; max-age=0; path=/; samesite=lax`;
}
