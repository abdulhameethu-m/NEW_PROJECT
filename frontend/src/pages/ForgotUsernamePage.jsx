import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as authService from "../services/authService";
import { validateAuthForm } from "../utils/authValidation";
import { BrandLogo } from "../components/BrandLogo";
import { useBranding } from "../context/BrandingContext";

function normalizeError(err) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    "Something went wrong"
  );
}

function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  return `${name?.substring(0, 2)}${"*".repeat(Math.max(0, name?.length - 2))}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return "";
  return `${phone.substring(0, 2)}${"*".repeat(Math.max(0, phone.length - 6))}${phone.substring(phone.length - 2)}`;
}

export function ForgotUsernamePage() {
  const { branding } = useBranding();
  const nav = useNavigate();

  const [step, setStep] = useState("search"); // "search" | "found"
  const [identifier, setIdentifier] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSearch(e) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setFieldErrors({});

    const nextErrors = validateAuthForm({ identifier });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const normalizedIdentifier = identifier.trim();
      const result = await authService.findUserForRecovery(normalizedIdentifier);
      
      if (result) {
        setFoundUser({
          name: result.name || "User",
          email: result.email || null,
          phone: result.phone || null,
        });
        setStep("found");
      }
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <BrandLogo showName={false} className="mb-5 text-slate-950" imgClassName="h-12 w-auto object-contain" />
      <h1 className="text-2xl font-semibold tracking-tight">Recover Username/Email</h1>
      <p className="mt-2 text-slate-600">
        Enter your phone or one of your email addresses to find your account details.
      </p>

      {step === "search" && (
        <form onSubmit={handleSearch} className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
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
                  setIdentifier(e.target.value.trim());
                  setFieldErrors((current) => ({ ...current, identifier: "" }));
                }}
                type="text"
                placeholder="10-digit phone or Gmail"
                required
              />
            </div>
            {fieldErrors.identifier && (
              <div className="mt-1.5 text-xs text-rose-600">
                {fieldErrors.identifier}
              </div>
            )}
            <div className="mt-1 text-xs text-slate-500">
              💡 Use 10-digit phone (1234567890) or Gmail (@gmail.com)
            </div>
          </label>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search Account"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600">
            Don't remember any email or phone?{" "}
            <Link to="/contact-support" className="font-medium text-indigo-600 hover:text-indigo-700">
              Contact support
            </Link>
          </p>
        </form>
      )}

      {step === "found" && foundUser && (
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 mb-6">
            <h2 className="font-medium text-green-900">Account Found</h2>
            <p className="mt-1 text-sm text-green-800">
              We found an account under the following information:
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{foundUser.name}</p>
            </div>

            {foundUser.email && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</p>
                <p className="mt-1 text-sm font-mono text-slate-700">
                  {maskEmail(foundUser.email)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  A password reset link can be sent to this email
                </p>
              </div>
            )}

            {foundUser.phone && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</p>
                <p className="mt-1 text-sm font-mono text-slate-700">
                  {maskPhone(foundUser.phone)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  You can use this to reset your password
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center font-medium text-white transition hover:bg-indigo-700"
            >
              Reset Password
            </Link>

            <button
              type="button"
              onClick={() => {
                setStep("search");
                setIdentifier("");
                setFoundUser(null);
                setError("");
              }}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-center font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Search for Another Account
            </button>

            <Link
              to="/login"
              className="block w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
