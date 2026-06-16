import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import * as vendorService from "../services/vendorService";

function StepIndicator({ stepNum, title, status, description }) {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isUpcoming = status === "upcoming";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm ${
            isCompleted
              ? "bg-emerald-100 text-emerald-700"
              : isActive
              ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {isCompleted ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            stepNum
          )}
        </div>
        {stepNum < 4 && <div className="h-16 w-0.5 bg-slate-200 mt-2"></div>}
      </div>
      <div className="pb-8 flex-1">
        <h3 className={`font-semibold ${isActive ? "text-indigo-700" : isCompleted ? "text-emerald-700" : "text-slate-500"}`}>
          {title}
        </h3>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
}

export function VendorStatusPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchVendor = async () => {
    try {
      setRefreshing(true);
      const res = await vendorService.getVendorMe();
      setVendor(res.data);
      if (res.data.status === "approved") nav("/dashboard/vendor", { replace: true });
    } catch (e) {
      if (e?.response?.status === 404) {
        nav("/vendor/onboarding", { replace: true });
        return;
      }
      setError(e?.response?.data?.message || "Failed to load vendor status");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const res = await vendorService.getVendorMe();
        if (!alive) return;
        setVendor(res.data);
        if (res.data.status === "approved") return nav("/dashboard/vendor", { replace: true });
      } catch (e) {
        if (!alive) return;
        if (e?.response?.status === 404) {
          nav("/vendor/onboarding", { replace: true });
          return;
        }
        setError(e?.response?.data?.message || "Failed to load vendor status");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nav]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto"></div>
          <p className="mt-2 text-sm text-slate-600">Loading vendor status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Status</h1>
          <BackButton />
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="text-sm font-semibold text-rose-900">Error Loading Status</h2>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <div className="mt-4 flex gap-3">
            <Link
              to="/vendor/onboarding"
              className="inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Start onboarding
            </Link>
            <button
              onClick={fetchVendor}
              className="inline-flex rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = vendor?.status || "draft";
  const stepCompleted = vendor?.stepCompleted ?? 0;
  const progressPercent = (stepCompleted / 4) * 100;

  const steps = [
    {
      num: 1,
      title: "Basic Info",
      description: "Company details and location information",
      status: stepCompleted >= 1 ? "completed" : stepCompleted === 0 ? "active" : "completed",
      details: vendor?.companyName || "Pending",
    },
    {
      num: 2,
      title: "GST & Documents",
      description: "Tax identification and verification documents",
      status: stepCompleted >= 2 ? "completed" : stepCompleted === 1 ? "active" : "upcoming",
      details: vendor?.gstNumber ? `GST: ${vendor.gstNumber}` : vendor?.noGst ? "No GST" : "Pending",
    },
    {
      num: 3,
      title: "Bank Details",
      description: "Payout account information",
      status: stepCompleted >= 3 ? "completed" : stepCompleted === 2 ? "active" : "upcoming",
      details: vendor?.bankDetails?.holderName || vendor?.upiId || "Pending",
    },
    {
      num: 4,
      title: "Shop Setup",
      description: "Shop display name and storefront images",
      status: stepCompleted >= 4 ? "completed" : stepCompleted === 3 ? "active" : "upcoming",
      details: vendor?.shopName || vendor?.companyName || "Pending",
    },
  ];

  const statusConfig = {
    draft: {
      label: "Draft",
      badge: "bg-slate-100 text-slate-700",
      icon: "📝",
      message: "Your onboarding is in progress. Continue filling out the remaining steps.",
    },
    pending: {
      label: "Pending",
      badge: "bg-amber-100 text-amber-700",
      icon: "⏳",
      message: "All steps completed! We're reviewing your information. This typically takes 1-3 business days.",
    },
    rejected: {
      label: "Rejected",
      badge: "bg-rose-100 text-rose-700",
      icon: "❌",
      message: "Your application was not approved. Please review the feedback and resubmit.",
    },
    approved: {
      label: "Approved",
      badge: "bg-emerald-100 text-emerald-700",
      icon: "✅",
      message: "Congratulations! Your vendor account is approved and ready to use.",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Status</h1>
          <p className="mt-1 text-slate-600">Track your onboarding progress</p>
        </div>
        <BackButton />
      </div>

      {/* Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{config.icon}</span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Status</div>
                <div className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${config.badge} mt-1`}>
                  {config.label}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">{config.message}</p>
          </div>
        </div>

        {/* Rejection Reason */}
        {status === "rejected" && vendor?.rejectionReason ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase text-rose-700">Rejection Reason</div>
            <p className="mt-1 text-sm text-rose-800">{vendor.rejectionReason}</p>
          </div>
        ) : null}

        {/* Progress */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Onboarding Progress</span>
            <span className="text-sm font-semibold text-indigo-600">{stepCompleted}/4 Steps</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Timeline of Steps */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-6">Onboarding Steps</h2>
        <div>
          {steps.map((step) => (
            <StepIndicator
              key={step.num}
              stepNum={step.num}
              title={step.title}
              status={step.status}
              description={step.description}
            />
          ))}
        </div>
      </div>

      {/* Company Info Summary */}
      {vendor?.companyName && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Company Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {vendor.companyName ? (
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Company Name</div>
                <p className="mt-1 text-sm font-medium text-slate-900">{vendor.companyName}</p>
              </div>
            ) : null}
            {vendor.address ? (
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Address</div>
                <p className="mt-1 text-sm font-medium text-slate-900">{vendor.address}</p>
              </div>
            ) : null}
            {vendor.shopName ? (
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Shop Name</div>
                <p className="mt-1 text-sm font-medium text-slate-900">{vendor.shopName}</p>
              </div>
            ) : null}
            {vendor.gstNumber ? (
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">GST Number</div>
                <p className="mt-1 text-sm font-medium text-slate-900">{vendor.gstNumber}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* FAQ/Help Section */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-blue-900">What Happens Next?</h2>
        <div className="mt-4 space-y-3 text-sm text-blue-800">
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-lg">📋</div>
            <div>
              <strong>Pending Status:</strong> Once all steps are complete, your application enters review. Our team verifies all information within 1-3 business days.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-lg">📧</div>
            <div>
              <strong>Notifications:</strong> You'll receive email updates when your status changes. Keep your email inbox checked.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-lg">🔄</div>
            <div>
              <strong>Make Changes:</strong> While in draft status, you can go back to any step and edit your information.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-lg">📞</div>
            <div>
              <strong>Need Help?</strong> Contact our support team at support@example.com for any questions.
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {status === "draft" || status === "rejected" ? (
          <Link
            to="/vendor/onboarding"
            className="inline-flex rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Continue Onboarding
          </Link>
        ) : null}
        <button
          onClick={fetchVendor}
          disabled={refreshing}
          className="inline-flex rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>
    </div>
  );
}

