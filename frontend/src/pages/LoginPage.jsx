import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { useStaffAuthStore } from "../context/staffAuthStore";
import { PasswordField } from "../components/PasswordField";
import * as authService from "../services/authService";
import * as staffAuthService from "../services/staffAuthService";
import { validateAuthForm } from "../utils/authValidation";
import { consumeRedirectAfterLogin } from "../utils/loginRedirect";
import { continueAfterPrimaryAuth } from "../utils/postAuthContinuation";
import { BrandLogo } from "../components/BrandLogo";
import { useBranding } from "../context/BrandingContext";

function normalizeError(err) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    "Something went wrong"
  );
}

function isAllowedStaffTarget(target) {
  const pathname = target?.startsWith("http://") || target?.startsWith("https://")
    ? new URL(target).pathname
    : target || "";
  return pathname.startsWith("/staff");
}
function isAuthPageTarget(target) {
  const pathname = target?.startsWith("http://") || target?.startsWith("https://")
    ? new URL(target).pathname
    : target || "";
  return ["/login", "/register", "/role", "/staff/login"].includes(pathname);
}

export function LoginPage() {
  const { branding } = useBranding();
  const nav = useNavigate();
  const location = useLocation();
  const from = useMemo(() => location.state?.from?.pathname, [location.state]);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.logout);
  const setStaffAuth = useStaffAuthStore((s) => s.setAuth);
  const clearStaffAuth = useStaffAuthStore((s) => s.logout);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const submitInFlightRef = useRef(false);

  async function navigateAfterPrimaryLogin(result, attemptedFrom) {
    return continueAfterPrimaryAuth({ result, attemptedFrom, nav });
  }

  async function navigateAfterStaffLogin(attemptedFrom) {
    const redirect = consumeRedirectAfterLogin();
    if (redirect && isAllowedStaffTarget(redirect) && !isAuthPageTarget(redirect)) {
      return window.location.assign(redirect);
    }
    if (attemptedFrom && isAllowedStaffTarget(attemptedFrom) && !isAuthPageTarget(attemptedFrom)) {
      return nav(attemptedFrom, { replace: true });
    }
    return nav("/staff/dashboard", { replace: true });
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitInFlightRef.current) return;
    setError("");
    const nextErrors = validateAuthForm({ identifier, password });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    submitInFlightRef.current = true;
    setLoading(true);
    const normalizedIdentifier = identifier.trim();
    const normalizedPassword = password;

    try {
      const primaryResponse = await authService.login({
        identifier: normalizedIdentifier,
        password: normalizedPassword,
      });
      clearStaffAuth();
      setAuth(primaryResponse.data);
      return navigateAfterPrimaryLogin(primaryResponse, from);
    } catch (primaryError) {
      const isEmailLogin = normalizedIdentifier.includes("@");
      const primaryStatus = primaryError?.response?.status;
      const shouldSkipStaffFallback = primaryStatus === 429 || primaryStatus >= 500;

      if (!isEmailLogin || shouldSkipStaffFallback) {
        setError(normalizeError(primaryError));
        setLoading(false);
        return;
      }

      try {
        const staffResponse = await staffAuthService.login({
          email: normalizedIdentifier,
          password: normalizedPassword,
        });
        clearAuth();
        setStaffAuth(staffResponse.data);
        return navigateAfterStaffLogin(from);
      } catch (staffError) {
        setError(normalizeError(staffError?.response ? staffError : primaryError));
      }
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <BrandLogo showName={false} className="mb-5 text-slate-950" imgClassName="h-12 w-auto object-contain" />
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      <p className="mt-2 text-slate-600">
        {branding?.tagline || "Users can login with phone; vendors, admin, and staff can use email."}
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-medium">
          Email or phone
          <div className="relative">
            <input
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.identifier
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              }`}
              value={identifier}
              onChange={(e) => {
                const value = e.target.value.trim();
                setIdentifier(value);
                setFieldErrors((current) => ({ ...current, identifier: "" }));
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value) {
                  const nextErrors = validateAuthForm({ identifier: value });
                  if (nextErrors.identifier) {
                    setFieldErrors((current) => ({ ...current, identifier: nextErrors.identifier }));
                  }
                }
              }}
              type="text"
              autoComplete="username"
              placeholder="10-digit phone or Gmail"
              required
            />
          </div>
          {fieldErrors.identifier && (
            <div className="mt-1.5 text-xs text-rose-600 flex items-start gap-1">
              <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{fieldErrors.identifier}</span>
            </div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            💡 Use 10-digit phone (1234567890) or Gmail (@gmail.com)
          </div>
        </label>

        <label className="mt-4 block text-sm font-medium">
          Password
          <PasswordField
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${
              fieldErrors.password
                ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            }`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((current) => ({ ...current, password: "" }));
            }}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
          {fieldErrors.password && (
            <div className="mt-1.5 text-xs text-rose-600 flex items-start gap-1">
              <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{fieldErrors.password}</span>
            </div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            💡 Minimum 6 characters
          </div>
        </label>

        <div className="mt-4 flex gap-3 text-xs">
          <Link to="/forgot-password" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Forgot password?
          </Link>
          <span className="text-slate-300">•</span>
          <Link to="/forgot-username" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Forgot email/phone?
          </Link>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          type="submit"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-4 text-center text-sm text-slate-600">
          No account?{" "}
          <Link className="text-indigo-600 hover:underline" to="/role" state={location.state}>
            Register
          </Link>
        </div>
      </form>
    </div>
  );
}
