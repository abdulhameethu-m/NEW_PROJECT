/* eslint-disable no-unused-vars */
import { useState, forwardRef, useEffect } from "react";

/**
 * PayoutAccountForm Component
 * Used in vendor onboarding and account management
 * Displays form for entering payout account details (bank or UPI)
 */
export const PayoutAccountForm = forwardRef(function PayoutAccountForm(
  {
    initialData = {},
    onSubmit,
    onChange,
    loading = false,
    showOptionalHint = true,
    submitLabel = "Save Account",
    hideSubmitButton = false,
  },
  ref
) {
  const [formData, setFormData] = useState({
    accountHolderName: initialData.accountHolderName || "",
    accountNumber: initialData.accountNumber || "",
    ifscCode: (initialData.ifscCode || "").toUpperCase(),
    bankName: initialData.bankName || "",
    upiId: initialData.upiId || "",
  });

  const [errors, setErrors] = useState({});

  // Form validation
  const validate = () => {
    const newErrors = {};

    const hasBankDetails =
      formData.accountHolderName &&
      formData.accountNumber &&
      formData.ifscCode;
    const hasUpi = formData.upiId;

    if (!hasBankDetails && !hasUpi) {
      newErrors.general =
        "Please provide either complete bank details or a UPI ID";
    }

    // Account Holder Name validation
    if (formData.accountHolderName) {
      if (formData.accountHolderName.length < 3) {
        newErrors.accountHolderName = "Account holder name must be at least 3 characters";
      } else if (!/^[a-zA-Z\s]+$/.test(formData.accountHolderName)) {
        newErrors.accountHolderName = "Account holder name can only contain letters and spaces";
      }
    } else if (hasBankDetails) {
      newErrors.accountHolderName = "Account holder name is required";
    }

    // Bank Name validation
    if (formData.bankName) {
      if (formData.bankName.length < 3) {
        newErrors.bankName = "Bank name must be at least 3 characters";
      } else if (!/^[a-zA-Z\s&.]+$/.test(formData.bankName)) {
        newErrors.bankName = "Bank name can only contain letters, spaces, & and .";
      }
    } else if (hasBankDetails) {
      newErrors.bankName = "Bank name is required";
    }

    // Account Number validation
    if (formData.accountNumber) {
      const accountNum = formData.accountNumber.replace(/\s/g, "");
      if (!/^\d+$/.test(accountNum)) {
        newErrors.accountNumber = "Account number must contain only digits";
      } else if (accountNum.length < 9 || accountNum.length > 18) {
        newErrors.accountNumber = "Account number must be between 9 and 18 digits";
      }
    } else if (hasBankDetails) {
      newErrors.accountNumber = "Account number is required";
    }

    // IFSC Code validation
    if (formData.ifscCode) {
      if (formData.ifscCode.length !== 11) {
        newErrors.ifscCode = "IFSC code must be exactly 11 characters";
      } else if (!/^[A-Z0-9]+$/.test(formData.ifscCode)) {
        newErrors.ifscCode = "IFSC code must contain only uppercase letters and digits";
      }
    } else if (hasBankDetails) {
      newErrors.ifscCode = "IFSC code is required";
    }

    // UPI ID validation
    if (
      formData.upiId &&
      !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]{2,}$/.test(formData.upiId)
    ) {
      newErrors.upiId = "UPI ID format must be like: name@bank (e.g., john@icici)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Call onChange callback whenever form data changes
  useEffect(() => {
    if (onChange) {
      onChange(formData);
    }
  }, [formData, onChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Input restrictions based on field type
    if (name === "accountHolderName") {
      // Only letters and spaces
      newValue = value.replace(/[^a-zA-Z\s]/g, "");
    } else if (name === "bankName") {
      // Only letters, spaces, &, and .
      newValue = value.replace(/[^a-zA-Z\s&.]/g, "");
    } else if (name === "accountNumber") {
      // Only digits
      newValue = value.replace(/\D/g, "");
    } else if (name === "ifscCode") {
      // Uppercase letters and digits only
      newValue = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    } else if (name === "upiId") {
      // Lowercase for consistency
      newValue = value.toLowerCase();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form ref={ref} onSubmit={handleSubmit} className="grid gap-4">
      {errors.general && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errors.general}
        </div>
      )}

      {showOptionalHint && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          💡 You can add payout details now or later from your account settings.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Account Holder Name
          <input
            type="text"
            name="accountHolderName"
            value={formData.accountHolderName}
            onChange={handleChange}
            placeholder="Full name as per bank"
            maxLength="50"
            autoComplete="off"
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              errors.accountHolderName
                ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            }`}
          />
          {errors.accountHolderName && (
            <div className="mt-1 text-xs text-rose-600">
              {errors.accountHolderName}
            </div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            Letters and spaces only. {formData.accountHolderName.length}/50
          </div>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Bank Name
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            placeholder="e.g., ICICI Bank"
            maxLength="40"
            autoComplete="off"
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              errors.bankName
                ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            }`}
          />
          {errors.bankName && (
            <div className="mt-1 text-xs text-rose-600">{errors.bankName}</div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            Bank name (e.g., ICICI, HDFC, Axis). {formData.bankName.length}/40
          </div>
        </label>
      </div>

      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Bank Transfer Details
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Account Number
            <input
              type="password"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="9-18 digits"
              maxLength="18"
              autoComplete="off"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono ${
                errors.accountNumber
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              }`}
            />
            {errors.accountNumber && (
              <div className="mt-1 text-xs text-rose-600">
                {errors.accountNumber}
              </div>
            )}
            <div className="mt-1 text-xs text-slate-500">
              Digits only: {formData.accountNumber.length} digits (9-18 required)
            </div>
          </label>

          <label className="text-sm font-medium text-slate-700">
            IFSC Code
            <input
              type="text"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              placeholder="11-CHAR CODE"
              maxLength="11"
              autoComplete="off"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase ${
                errors.ifscCode
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              }`}
            />
            {errors.ifscCode && (
              <div className="mt-1 text-xs text-rose-600">
                {errors.ifscCode}
              </div>
            )}
            <div className="mt-1 text-xs text-slate-500">
              11 characters: {formData.ifscCode.length}/11 (auto-uppercase)
            </div>
          </label>

          <div className="flex items-end text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
            <span>Format: BANKXXXX001</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-slate-600">OR</span>
        </div>
      </div>

      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          UPI Transfer Details
        </div>
        <label className="text-sm font-medium text-slate-700">
          UPI ID (Optional)
          <input
            type="text"
            name="upiId"
            value={formData.upiId}
            onChange={handleChange}
            placeholder="yourname@bank or yourname@upi"
            maxLength="60"
            autoComplete="off"
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              errors.upiId
                ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            }`}
          />
          {errors.upiId && (
            <div className="mt-1 text-xs text-rose-600">{errors.upiId}</div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            Format: yourname@bank (e.g., john@icici, mobile@googleplay). Auto-lowercase.
          </div>
        </label>
      </div>

      {!hideSubmitButton && (
        <button
          type="submit"
          disabled={loading}
          className={`rounded-lg font-semibold py-2 px-4 text-white transition ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
          }`}
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      )}
    </form>
  );
});

/**
 * VerificationStatus Component
 * Shows account verification status badge and details
 */
function VerificationStatus({ status = "PENDING", verifiedAt = null }) {
  const statusConfig = {
    PENDING: {
      label: "Pending Verification",
      icon: "⏳",
      color: "bg-amber-100 text-amber-800 border-amber-300",
      description:
        "Your account is pending admin verification. Payouts will be processed once verified.",
    },
    VERIFIED: {
      label: "Verified",
      icon: "✅",
      color: "bg-emerald-100 text-emerald-800 border-emerald-300",
      description: "Your account is verified. You can request payouts.",
    },
    REJECTED: {
      label: "Rejected",
      icon: "❌",
      color: "bg-rose-100 text-rose-800 border-rose-300",
      description: "Your account was rejected. Please update and resubmit.",
    },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <div className={`rounded-lg border p-3 text-sm ${config.color}`}>
      <div className="flex items-center gap-2 font-semibold">
        <span>{config.icon}</span>
        {config.label}
      </div>
      <div className="mt-1 text-xs opacity-90">{config.description}</div>
      {verifiedAt && (
        <div className="mt-1 text-xs opacity-75">
          Verified on {new Date(verifiedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
