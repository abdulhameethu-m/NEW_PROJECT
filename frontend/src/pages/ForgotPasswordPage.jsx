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

  // Steps: "identifier" | "otp" | "password"
  const [step, setStep] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [userType, setUserType] = useState(null); // "user" | "staff"
  const [deliveryMethod, setDeliveryMethod] = useState(null); // "email" | "sms"
  const [successMessage, setSuccessMessage] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  // Request OTP
  async function handleRequestOTP(e) {
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
        const response = await authService.requestPasswordResetOTP(normalizedIdentifier);
        setUserType("user");
        setDeliveryMethod(response?.deliveryMethod || "email");
        setStep("otp");
        
        // Show appropriate message based on delivery method
        if (response?.deliveryMethod === "sms") {
          setSuccessMessage(`OTP sent to your phone (${normalizedIdentifier}). Check your SMS.`);
        } else {
          setSuccessMessage(`OTP sent to your email (${normalizedIdentifier}). Check your inbox.`);
        }
        
        setOtpTimer(300); // 5 minutes
        startOtpTimer();
      } catch (primaryError) {
        // Try staff auth if email
        if (normalizedIdentifier.includes("@")) {
          try {
            const response = await staffAuthService.requestPasswordResetOTP(normalizedIdentifier);
            setUserType("staff");
            setDeliveryMethod(response?.deliveryMethod || "email");
            setStep("otp");
            setSuccessMessage(`OTP sent to your email (${normalizedIdentifier}). Check your inbox.`);
            setOtpTimer(300);
            startOtpTimer();
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

  // Timer for OTP
  function startOtpTimer() {
    let remaining = 300;
    const interval = setInterval(() => {
      remaining--;
      setOtpTimer(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
  }

  // Verify OTP
  async function handleVerifyOTP(e) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setFieldErrors({});

    if (!otp || otp.length !== 6) {
      setFieldErrors({ otp: "OTP must be 6 digits" });
      return;
    }

    setLoading(true);
    try {
      const verifyFunc =
        userType === "staff"
          ? staffAuthService.verifyPasswordResetOTP
          : authService.verifyPasswordResetOTP;

      const result = await verifyFunc(identifier, otp);

      if (result?.resetToken) {
        setResetToken(result.resetToken);
        setStep("password");
        setSuccessMessage("OTP verified! Now set your new password.");
      } else {
        setError("Failed to verify OTP. Please try again.");
      }
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  // Reset Password
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

    setLoading(true);
    try {
      const resetFunc =
        userType === "staff" ? staffAuthService.resetPassword : authService.resetPassword;
      await resetFunc(resetToken, password);

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

  return (
    <div className="mx-auto max-w-md">
      <BrandLogo
        showName={false}
        className="mb-5 text-slate-950"
        imgClassName="h-12 w-auto object-contain"
      />
      <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
      <p className="mt-2 text-slate-600">
        Enter your email or phone to receive a password reset code.
      </p>

      {/* STEP 1: Request OTP */}
      {step === "identifier" && (
        <form
          onSubmit={handleRequestOTP}
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
                  setIdentifier(e.target.value.trim());
                  setFieldErrors((current) => ({ ...current, identifier: "" }));
                }}
                type="text"
                placeholder="10-digit phone or Gmail"
                required
              />
            </div>
            {fieldErrors.identifier && (
              <div className="mt-1.5 text-xs text-rose-600">{fieldErrors.identifier}</div>
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

      {/* STEP 2: Verify OTP */}
      {step === "otp" && (
        <form
          onSubmit={handleVerifyOTP}
          className="mt-6 rounded-2xl border bg-white p-6 shadow-sm"
        >
          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {successMessage}
            </div>
          )}

          <p className="mb-4 text-sm text-slate-600">
            We've sent a 6-digit OTP to <strong>{identifier}</strong>
          </p>

          <label className="block text-sm font-medium">
            Enter OTP Code
            <input
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-center text-lg tracking-widest ${
                fieldErrors.otp
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              }`}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(val);
                setFieldErrors((current) => ({ ...current, otp: "" }));
              }}
              type="text"
              placeholder="000000"
              maxLength="6"
              inputMode="numeric"
              required
            />
            {fieldErrors.otp && (
              <div className="mt-1.5 text-xs text-rose-600">{fieldErrors.otp}</div>
            )}
          </label>

          {otpTimer > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              OTP expires in {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="mt-6 w-full rounded-lg bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("identifier");
              setOtp("");
              setError("");
              setSuccessMessage("");
              setDeliveryMethod(null);
            }}
            className="mt-2 w-full text-sm text-indigo-600 hover:text-indigo-700"
          >
            Back to email/phone
          </button>
        </form>
      )}

      {/* STEP 3: Set New Password */}
      {step === "password" && (
        <form
          onSubmit={handleResetPassword}
          className="mt-6 rounded-2xl border bg-white p-6 shadow-sm"
        >
          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
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
              <div className="mt-1.5 text-xs text-rose-600">{fieldErrors.password}</div>
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
              <div className="mt-1.5 text-xs text-rose-600">{fieldErrors.confirmPassword}</div>
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
              setIdentifier("");
              setOtp("");
              setResetToken("");
              setPassword("");
              setConfirmPassword("");
              setError("");
              setSuccessMessage("");
              setDeliveryMethod(null);
            }}
            className="mt-2 w-full text-sm text-indigo-600 hover:text-indigo-700"
          >
            Start Over
          </button>
        </form>
      )}
    </div>
  );
}
