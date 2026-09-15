import { useCallback, useEffect, useState } from "react";

import * as paymentService from "../services/paymentService";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function AdminPaymentsPage() {

  const [overview, setOverview] = useState(null);
  const [codAnalytics, setCodAnalytics] = useState(null);
  const [codSettings, setCodSettings] = useState(null);
  const [razorpaySettings, setRazorpaySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [savingCodSettings, setSavingCodSettings] = useState(false);
  const [savingRazorpaySettings, setSavingRazorpaySettings] = useState(false);
  const [razorpaySuccessMessage, setRazorpaySuccessMessage] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [response, analyticsResponse, settingsResponse] = await Promise.all([
        paymentService.listPayments({}),
        paymentService.getCodAnalytics().catch(() => null),
        paymentService.getCodSettings().catch(() => null),
      ]);
      const razorpaySettingsResponse = await paymentService.getRazorpaySettings().catch(() => null);
      setOverview(response?.overview || null);
      setCodAnalytics(analyticsResponse || null);
      setCodSettings(settingsResponse || null);
      setRazorpaySettings(razorpaySettingsResponse || null);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  async function handleSaveCodSettings() {
    if (!codSettings) return;
    setSavingCodSettings(true);
    setError("");
    try {
      const payload = {
        ...codSettings,
        minOrderValue: Number(codSettings.minOrderValue) || 0,
        maxOrderValue: Number(codSettings.maxOrderValue) || 0,
        defaultFeeValue: Number(codSettings.defaultFeeValue) || 0,
        vendorHoldDays: Number(codSettings.vendorHoldDays) || 0,
      };
      const response = await paymentService.updateCodSettings(payload);
      setCodSettings(response || null);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSavingCodSettings(false);
    }
  }

  async function handleSaveRazorpaySettings() {
    if (!razorpaySettings) return;
    setSavingRazorpaySettings(true);
    setError("");
    setRazorpaySuccessMessage("");
    try {
      const payload = {
        ...razorpaySettings,
        sessionTimeoutMinutes: Number(razorpaySettings.sessionTimeoutMinutes) || 15,
        gatewayFeePercentage: Number(razorpaySettings.gatewayFeePercentage) || 0,
        gatewayFeeFixed: Number(razorpaySettings.gatewayFeeFixed) || 0,
        prepaidDiscountPercentage: Number(razorpaySettings.prepaidDiscountPercentage) || 0,
        prepaidDiscountFixed: Number(razorpaySettings.prepaidDiscountFixed) || 0,
      };
      const response = await paymentService.updateRazorpaySettings(payload);
      setRazorpaySettings(response || null);
      setRazorpaySuccessMessage("Razorpay settings updated successfully!");
      setTimeout(() => setRazorpaySuccessMessage(""), 4000);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSavingRazorpaySettings(false);
    }
  }

  function handleCopyWebhookUrl(url) {
    if (!url) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2500);
      }).catch(() => {});
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-950">Payments</h1>
        <p className="mt-1 text-sm text-slate-600">Track captured payments, failed attempts, verification state, and refund controls.</p>
      </section>



      {overview ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total volume", value: overview.totalAmount },
            { label: "Paid", value: overview.paidAmount },
            { label: "Failed", value: overview.failedAmount },
            { label: "Refunded", value: overview.refundedAmount },
            { label: "Gateway fee revenue", value: overview.gatewayFeeRevenue },
          ].map((card) => (
            <div key={card.label} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">Rs {Number(card.value || 0).toFixed(2)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {codAnalytics ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "COD success", value: `${Number(codAnalytics.successRate || 0).toFixed(2)}%` },
            { label: "COD failure", value: `${Number(codAnalytics.failureRate || 0).toFixed(2)}%` },
            { label: "COD RTO", value: `${Number(codAnalytics.rtoPercentage || 0).toFixed(2)}%` },
            { label: "COD volume", value: `Rs ${Number(codAnalytics.totalAmount || 0).toFixed(2)}` },
          ].map((card) => (
            <div key={card.label} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {codSettings ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">COD settings</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-5 items-end">
            <label className="flex h-11 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(codSettings.isEnabled)}
                onChange={(event) => setCodSettings((current) => ({ ...current, isEnabled: event.target.checked }))}
              />
              Enable COD
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">Minimum order value</span>
              <input
                type="number"
                value={codSettings.minOrderValue ?? 0}
                onChange={(event) => setCodSettings((current) => ({ ...current, minOrderValue: event.target.value === "" ? "" : Number(event.target.value) }))}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                placeholder="Minimum order value"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">Maximum order value</span>
              <input
                type="number"
                value={codSettings.maxOrderValue ?? 50000}
                onChange={(event) => setCodSettings((current) => ({ ...current, maxOrderValue: event.target.value === "" ? "" : Number(event.target.value) }))}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                placeholder="Maximum order value (0 for no limit)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">Default COD fee</span>
              <input
                type="number"
                value={codSettings.defaultFeeValue ?? 0}
                onChange={(event) => setCodSettings((current) => ({ ...current, defaultFeeValue: event.target.value === "" ? "" : Number(event.target.value) }))}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                placeholder="Default COD fee"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500">Vendor hold days</span>
              <input
                type="number"
                value={codSettings.vendorHoldDays ?? 3}
                onChange={(event) => setCodSettings((current) => ({ ...current, vendorHoldDays: event.target.value === "" ? "" : Number(event.target.value) }))}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                placeholder="Vendor hold days"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveCodSettings}
            disabled={savingCodSettings}
            className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingCodSettings ? "Saving..." : "Save COD settings"}
          </button>
        </section>
      ) : null}

      {razorpaySettings ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Razorpay Payment Gateway</h2>
              <p className="text-xs text-slate-500">Configure online payment rules, discounts, and webhook integration.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                razorpaySettings.isEnabled ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              }`}>
                {razorpaySettings.isEnabled ? "Gateway Active" : "Gateway Disabled"}
              </span>
            </div>
          </div>

          {/* Subsection 1: Core Controls */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Core Gateway Controls</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={Boolean(razorpaySettings.isEnabled)}
                  onChange={(event) => setRazorpaySettings((current) => ({ ...current, isEnabled: event.target.checked }))}
                />
                Enable Razorpay Checkout
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">Session Timeout (minutes)</span>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={razorpaySettings.sessionTimeoutMinutes ?? 15}
                  onChange={(event) => setRazorpaySettings((current) => ({ ...current, sessionTimeoutMinutes: event.target.value === "" ? "" : Number(event.target.value) }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                  placeholder="e.g. 15"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">Internal Memo / Notes</span>
                <input
                  type="text"
                  value={razorpaySettings.notes ?? ""}
                  onChange={(event) => setRazorpaySettings((current) => ({ ...current, notes: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                  placeholder="e.g. Production / Test sandbox"
                />
              </div>
            </div>
          </div>

          {/* Subsection 2: Prepaid Promotion & Fee Controls (Phase 1) */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">Prepaid Discounts & Fee Controls</h3>
                <p className="mt-0.5 text-xs text-slate-500">Incentivize customers to choose online payment over COD with instant checkout discounts.</p>
              </div>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">Prepaid Discount (%)</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={razorpaySettings.prepaidDiscountPercentage ?? 0}
                    onChange={(event) => setRazorpaySettings((current) => ({ ...current, prepaidDiscountPercentage: event.target.value === "" ? "" : Number(event.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-8 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
                    placeholder="e.g. 5 for 5%"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">%</span>
                </div>
                <span className="text-[11px] text-slate-400">Deducted from subtotal at checkout</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">Prepaid Discount Fixed (₹)</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={razorpaySettings.prepaidDiscountFixed ?? 0}
                    onChange={(event) => setRazorpaySettings((current) => ({ ...current, prepaidDiscountFixed: event.target.value === "" ? "" : Number(event.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-8 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
                    placeholder="e.g. 50"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">₹</span>
                </div>
                <span className="text-[11px] text-slate-400">Flat discount for online orders</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">Gateway Fee (%)</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={razorpaySettings.gatewayFeePercentage ?? 0}
                    onChange={(event) => setRazorpaySettings((current) => ({ ...current, gatewayFeePercentage: event.target.value === "" ? "" : Number(event.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-8 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
                    placeholder="e.g. 2 for 2%"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">%</span>
                </div>
                <span className="text-[11px] text-slate-400">Optional customer processing fee</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">Gateway Fee Fixed (₹)</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={razorpaySettings.gatewayFeeFixed ?? 0}
                    onChange={(event) => setRazorpaySettings((current) => ({ ...current, gatewayFeeFixed: event.target.value === "" ? "" : Number(event.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-8 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
                    placeholder="e.g. 5"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">₹</span>
                </div>
                <span className="text-[11px] text-slate-400">Flat processing charge</span>
              </div>
            </div>
          </div>

          {/* Subsection 3: Webhook Setup & Copy Widget (Phase 2) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Razorpay Webhook Helper & Events</h3>
                <p className="mt-0.5 text-xs text-slate-500">Eliminate webhook setup errors by using the pre-configured endpoint and events list below.</p>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-2xs ${
                  razorpaySettings.webhookSecretConfigured 
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" 
                    : "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${razorpaySettings.webhookSecretConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {razorpaySettings.webhookSecretConfigured ? "Secret Configured in .env" : "Secret Missing in .env"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Read-Only Webhook URL with 1-Click Copy */}
              <div className="lg:col-span-7 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Webhook Endpoint URL <span className="text-slate-400 font-normal">(Read-only)</span>
                </label>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={
                        razorpaySettings.canonicalWebhookUrl ||
                        (razorpaySettings.webhookUrl && razorpaySettings.webhookUrl.trim() !== ""
                          ? razorpaySettings.webhookUrl.trim()
                          : `${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/razorpay`)
                      }
                      className="w-full font-mono text-xs text-slate-800 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xs cursor-default select-all focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Locked
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyWebhookUrl(
                        razorpaySettings.canonicalWebhookUrl ||
                        (razorpaySettings.webhookUrl && razorpaySettings.webhookUrl.trim() !== ""
                          ? razorpaySettings.webhookUrl.trim()
                          : `${window.location.origin}/api/webhooks/razorpay`)
                      )
                    }
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xs transition ${
                      copiedWebhook
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950"
                    }`}
                  >
                    {copiedWebhook ? "✓ Copied!" : "Copy Webhook URL"}
                  </button>
                </div>

                {/* Secret Security Status Box */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>Webhook Secret Status:</span>
                    <span className={razorpaySettings.webhookSecretConfigured ? "text-emerald-700" : "text-amber-700"}>
                      {razorpaySettings.webhookSecretConfigured ? "Active & Protected" : "Action Required"}
                    </span>
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    {razorpaySettings.webhookSecretConfigured
                      ? "Your server verifies HMAC SHA256 signatures using RAZORPAY_WEBHOOK_SECRET. When adding this webhook in Razorpay Dashboard, enter the exact same secret token."
                      : "RAZORPAY_WEBHOOK_SECRET is missing from backend .env. Please define it to prevent unsigned spoofing."}
                  </p>
                </div>
              </div>

              {/* Right Column: Recommended Events Checklist */}
              <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Dashboard Events to Check</span>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">4 Essential</span>
                </div>
                
                <p className="text-[11px] text-slate-500">
                  In Razorpay Dashboard &rarr; <strong>Settings</strong> &rarr; <strong>Webhooks</strong>, paste the URL and select:
                </p>

                <div className="space-y-1.5">
                  {[
                    { event: "payment.captured", desc: "Confirms instant payment capture" },
                    { event: "order.paid", desc: "Auto-fulfills customer order in real time" },
                    { event: "payment.failed", desc: "Records declined & canceled card attempts" },
                    { event: "refund.processed", desc: "Synchronizes bank & wallet refunds" },
                  ].map(({ event, desc }) => (
                    <div key={event} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 border border-slate-100">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        ✓
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-semibold text-slate-800">{event}</div>
                        <div className="text-[11px] text-slate-500">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {razorpaySuccessMessage ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
              {razorpaySuccessMessage}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveRazorpaySettings}
              disabled={savingRazorpaySettings}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:bg-slate-900 disabled:opacity-60 transition"
            >
              {savingRazorpaySettings ? "Saving Settings..." : "Save Razorpay settings"}
            </button>
          </div>
        </section>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}


    </div>
  );
}
