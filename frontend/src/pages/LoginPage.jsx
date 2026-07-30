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
    const staffLoginOnly = location.pathname === "/staff/login";

    try {
      if (staffLoginOnly) {
        const staffResponse = await staffAuthService.login({
          email: normalizedIdentifier,
          password: normalizedPassword,
        });
        await authService.logout().catch(() => {});
        clearAuth();
        setStaffAuth(staffResponse.data);
        return navigateAfterStaffLogin(from);
      }

      const primaryResponse = await authService.login({
        identifier: normalizedIdentifier,
        password: normalizedPassword,
      });
      await staffAuthService.logout().catch(() => {});
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
        await authService.logout().catch(() => {});
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
    <div className="flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo showName={false} className="text-slate-950" imgClassName="h-14 w-auto object-contain drop-shadow-sm" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-3 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {branding?.tagline || "Users can login with phone; vendors, admin, and staff can use email."}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40 sm:p-10"
        >
          <div className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Email or phone
              <div className="relative mt-1.5">
                <input
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors ${
                    fieldErrors.identifier
                      ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                      : "border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                  }`}
                  value={identifier}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    setIdentifier(value);
                    setError("");
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
                <div className="mt-2 flex items-start gap-1 text-xs font-medium text-rose-600">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.identifier}</span>
                </div>
              )}
              <div className="mt-2 text-[11px] font-medium text-slate-400">
                Use 10-digit phone (1234567890) or Gmail (@gmail.com)
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <div className="relative mt-1.5">
                <PasswordField
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors ${
                    fieldErrors.password
                      ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                      : "border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setFieldErrors((current) => ({ ...current, password: "" }));
                  }}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
              </div>
              {fieldErrors.password && (
                <div className="mt-2 flex items-start gap-1 text-xs font-medium text-rose-600">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.password}</span>
                </div>
              )}
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between text-xs font-medium">
            <Link to="/forgot-password" className="text-indigo-600 transition-colors hover:text-indigo-700">
              Forgot password?
            </Link>
            <Link to="/forgot-username" className="text-indigo-600 transition-colors hover:text-indigo-700">
              Forgot email/phone?
            </Link>
          </div>

          {error ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 disabled:opacity-50"
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            No account?{" "}
            <Link className="text-indigo-600 transition-colors hover:text-indigo-700 hover:underline" to="/role" state={location.state}>
              Register now
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
