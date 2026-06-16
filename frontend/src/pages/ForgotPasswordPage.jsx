import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordField } from "../components/PasswordField";
import * as authService from "../services/authService";
import * as staffAuthService from "../services/staffAuthService";
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

export function ForgotPasswordPage() {
  const { branding } = useBranding();
  const nav = useNavigate();

  const [step, setStep] = useState("identifier"); // "identifier" | "code" | "reset"
  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [userType, setUserType] = useState(null); // "user" | "staff"
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRequestReset(e) {
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
      
      // Try primary auth first
      try {
        const result = await authService.requestPasswordReset(normalizedIdentifier);
        if (result?.resetToken) {
          // Development mode - token is returned
          setResetToken(result.resetToken);
          setUserType("user");
          setStep("reset");
          setSuccessMessage(`Reset token: ${result.resetToken}. (In production, check your email/SMS)`);
        } else {
          // Production mode - token sent via email/SMS
          setStep("code");
          setUserType("user");
          setSuccessMessage("Check your email or SMS for the reset code.");
        }
      } catch (primaryError) {
        // Try staff auth if email
        if (normalizedIdentifier.includes("@")) {
          try {
            const staffResult = await staffAuthService.requestPasswordReset(normalizedIdentifier);
            if (staffResult?.resetToken) {
              setResetToken(staffResult.resetToken);
              setUserType("staff");
              setStep("reset");
              setSuccessMessage(`Reset token: ${staffResult.resetToken}. (In production, check your email)`);
            } else {
              setStep("code");
              setUserType("staff");
              setSuccessMessage("Check your email for the reset code.");
            }
          } catch (staffError) {
            setError(normalizeError(primaryError));
          }
        } else {
          setError(normalizeError(primaryError));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setFieldErrors({});

    const nextErrors = validateAuthForm({ password: password });
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const token = resetToken || identifier;
    setLoading(true);
    try {
      const resetFunc = userType === "staff" ? staffAuthService.resetPassword : authService.resetPassword;
      await resetFunc(token, password);
      
      setSuccessMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        nav("/login", { replace: true });
      }, 2000);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleTokenInput(e) {
    const token = e.target.value.trim();
    setResetToken(token);
    setFieldErrors((current) => ({ ...current, token: "" }));
  }

  return (
    <div className="mx-auto max-w-md">
      <BrandLogo showName={false} className="mb-5 text-slate-950" imgClassName="h-12 w-auto object-contain" />
      <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
      <p className="mt-2 text-slate-600">
        Enter your email or phone to receive a password reset code.
      </p>

      {step === "identifier" && (
        <form onSubmit={handleRequestReset} className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
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
            {loading ? "Sending..." : "Send Reset Code"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600">
            Remember your password?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Back to login
            </Link>
          </p>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleResetPassword} className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {successMessage}
            </div>
          )}

          <label className="block text-sm font-medium">
            Reset Code
            <input
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.token
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              }`}
              value={resetToken}
              onChange={handleTokenInput}
              type="text"
              placeholder="Enter the code from your email/SMS"
              required
            />
            {fieldErrors.token && (
              <div className="mt-1.5 text-xs text-rose-600">
                {fieldErrors.token}
              </div>
            )}
          </label>

          <label className="mt-4 block text-sm font-medium">
            New Password
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
              placeholder="Enter new password"
              required
            />
            {fieldErrors.password && (
              <div className="mt-1.5 text-xs text-rose-600">
                {fieldErrors.password}
              </div>
            )}
          </label>

          <label className="mt-4 block text-sm font-medium">
            Confirm Password
            <PasswordField
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.confirmPassword
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              }`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((current) => ({ ...current, confirmPassword: "" }));
              }}
              placeholder="Confirm new password"
              required
            />
            {fieldErrors.confirmPassword && (
              <div className="mt-1.5 text-xs text-rose-600">
                {fieldErrors.confirmPassword}
              </div>
            )}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("identifier");
              setError("");
              setResetToken("");
            }}
            className="mt-2 w-full text-sm text-indigo-600 hover:text-indigo-700"
          >
            Try a different email/phone
          </button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetPassword} className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          {successMessage && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              {successMessage}
            </div>
          )}

          <label className="block text-sm font-medium">
            New Password
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
              placeholder="Enter new password"
              required
            />
            {fieldErrors.password && (
              <div className="mt-1.5 text-xs text-rose-600">
                {fieldErrors.password}
              </div>
            )}
          </label>

          <label className="mt-4 block text-sm font-medium">
            Confirm Password
            <PasswordField
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                fieldErrors.confirmPassword
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              }`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((current) => ({ ...current, confirmPassword: "" }));
              }}
              placeholder="Confirm new password"
              required
            />
            {fieldErrors.confirmPassword && (
              <div className="mt-1.5 text-xs text-rose-600">
                {fieldErrors.confirmPassword}
              </div>
            )}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
