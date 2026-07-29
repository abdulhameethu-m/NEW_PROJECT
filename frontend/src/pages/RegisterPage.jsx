import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { PasswordField } from "../components/PasswordField";
import * as authService from "../services/authService";
import { validateAuthForm } from "../utils/authValidation";
import { usePlatformFeatures } from "../context/PlatformFeaturesContext";
import { BrandLogo } from "../components/BrandLogo";
import { continueAfterPrimaryAuth } from "../utils/postAuthContinuation";
import pendingActionManager from "../utils/pendingActionManager";
import pendingCheckoutManager from "../utils/pendingCheckoutManager";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
}

export function RegisterPage() {
  const [params] = useSearchParams();
  const role = useMemo(() => params.get("role") || "user", [params]);
  const { influencerCommerceEnabled, loading: commerceLoading } = usePlatformFeatures();
  const nav = useNavigate();
  const location = useLocation();
  const from = useMemo(() => location.state?.from?.pathname, [location.state]);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (role === "influencer" && !commerceLoading && !influencerCommerceEnabled) {
      setError("Influencer registrations are paused by the administrator.");
      return;
    }
    const nextErrors = validateAuthForm({
      email,
      phone,
      password,
      requireEmail: role === "vendor" || role === "influencer",
    });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    try {
      const res = await authService.register({ name, email, phone, password, role });
      setAuth(res.data);
      if (pendingCheckoutManager.has() || pendingActionManager.hasPendingAction() || from) {
        return continueAfterPrimaryAuth({ result: res, attemptedFrom: from, nav });
      }
      if (role === "vendor") return nav("/vendor/onboarding", { replace: true });
      if (role === "influencer") return nav("/influencer/dashboard", { replace: true });
      return nav("/user/dashboard", { replace: true });
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo showName={false} className="text-slate-950" imgClassName="h-14 w-auto object-contain drop-shadow-sm" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Register as {role === "vendor" ? "Vendor" : role === "influencer" ? "Influencer" : "User"}
          </h1>
          <p className="mt-3 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Create your account. Vendors and influencers continue into onboarding next.
          </p>
        </div>

        {role === "influencer" && !commerceLoading && !influencerCommerceEnabled ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm">
            Influencer sign-ups are currently disabled.
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40 sm:p-10"
        >
          <div className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Name
              <div className="relative mt-1.5">
                <input
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors ${
                    fieldErrors.name
                      ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                      : "border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                  }`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors((current) => ({ ...current, name: "" }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) {
                      const nextErrors = validateAuthForm({ name: value });
                      if (nextErrors.name) {
                        setFieldErrors((current) => ({ ...current, name: nextErrors.name }));
                      }
                    }
                  }}
                  placeholder="Full name"
                  maxLength="50"
                  required
                />
              </div>
              {fieldErrors.name && (
                <div className="mt-2 flex items-start gap-1 text-xs font-medium text-rose-600">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.name}</span>
                </div>
              )}
              <div className="mt-2 text-[11px] font-medium text-slate-400">
                2-50 characters (letters, spaces, hyphens, apostrophes)
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email {role === "vendor" || role === "influencer" ? "" : <span className="text-slate-400">(optional)</span>}
              <div className="relative mt-1.5">
                <input
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors ${
                    fieldErrors.email
                      ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                      : "border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((current) => ({ ...current, email: "" }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) {
                      const nextErrors = validateAuthForm({ email: value, requireEmail: role === "vendor" || role === "influencer" });
                      if (nextErrors.email) {
                        setFieldErrors((current) => ({ ...current, email: nextErrors.email }));
                      }
                    }
                  }}
                  type="email"
                  required={role === "vendor" || role === "influencer"}
                  placeholder={role === "vendor" || role === "influencer" ? "name@gmail.com" : "Optional Gmail address"}
                />
              </div>
              {fieldErrors.email && (
                <div className="mt-2 flex items-start gap-1 text-xs font-medium text-rose-600">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.email}</span>
                </div>
              )}
              {(role === "vendor" || role === "influencer") && (
                <div className="mt-2 text-[11px] font-medium text-slate-400">
                  Gmail address is required (@gmail.com)
                </div>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Phone
              <div className="relative mt-1.5">
                <input
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors ${
                    fieldErrors.phone
                      ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                      : "border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                  }`}
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(value);
                    setFieldErrors((current) => ({ ...current, phone: "" }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) {
                      const nextErrors = validateAuthForm({ phone: value });
                      if (nextErrors.phone) {
                        setFieldErrors((current) => ({ ...current, phone: nextErrors.phone }));
                      }
                    }
                  }}
                  inputMode="numeric"
                  maxLength="10"
                  placeholder="1234567890"
                  required
                />
              </div>
              {fieldErrors.phone && (
                <div className="mt-2 flex items-start gap-1 text-xs font-medium text-rose-600">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.phone}</span>
                </div>
              )}
              <div className="mt-2 text-[11px] font-medium text-slate-400">
                10-digit number (digits only, auto-filled)
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
                    setFieldErrors((current) => ({ ...current, password: "" }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const nextErrors = validateAuthForm({ password: value });
                      if (nextErrors.password) {
                        setFieldErrors((current) => ({ ...current, password: nextErrors.password }));
                      }
                    }
                  }}
                  minLength={6}
                  placeholder="Strong password"
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
              <div className="mt-2 text-[11px] font-medium text-slate-400">
                Min 6 characters, must include uppercase, lowercase, and number
              </div>
            </label>
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
            {loading ? "Creating account..." : "Create account"}
          </button>

          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            Already have an account?{" "}
            <Link className="text-indigo-600 transition-colors hover:text-indigo-700 hover:underline" to="/login" state={location.state}>
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
