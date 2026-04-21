import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStaffAuthStore } from "../context/staffAuthStore";
import * as staffAuthService from "../services/staffAuthService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Unable to sign in";
}

export function StaffLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = useMemo(() => location.state?.from?.pathname, [location.state]);
  const setAuth = useStaffAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await staffAuthService.login({
        email: email.trim(),
        password: password.trim(),
      });
      setAuth(response.data);
      navigate(from || "/staff/dashboard", { replace: true });
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Staff Access
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Secure staff login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Separate staff authentication keeps internal operations isolated from customer and vendor accounts.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Work email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
              autoComplete="username"
              placeholder="staff@company.com"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login to staff workspace"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          Need customer or vendor access instead?{" "}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Use the main login
          </Link>
        </div>
      </div>
    </div>
  );
}
