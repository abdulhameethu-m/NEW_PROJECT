const REDIRECT_AFTER_LOGIN_KEY = "redirectAfterLogin";

export function saveRedirectAfterLogin(url) {
  if (typeof window === "undefined" || !url) return;
  window.sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, url);
}

export function consumeRedirectAfterLogin() {
  if (typeof window === "undefined") return "";
  const redirect = window.sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || "";
  if (redirect) {
    window.sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
  }
  return redirect;
}
