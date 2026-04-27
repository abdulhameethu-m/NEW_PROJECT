import { useEffect, useState } from "react";
import { VendorSection } from "../components/VendorPanel";
import * as vendorDashboardService from "../services/vendorDashboardService";

const defaultForm = {
  companyName: "",
  shopName: "",
  storeSlug: "",
  storeDescription: "",
  supportEmail: "",
  supportPhone: "",
  logoUrl: "",
  bannerUrl: "",
  payoutSchedule: "weekly",
  defaultCourier: "",
  lowStockThreshold: 10,
  address: "",
  bankDetails: {
    accountNumber: "",
    IFSC: "",
    holderName: "",
  },
  notificationPreferences: {
    emailOrders: true,
    emailPayouts: true,
    pushOrders: true,
    pushSystem: true,
  },
  shippingSettings: {
    allowedShippingModes: ["SELF", "PLATFORM"],
    effectiveShippingModes: ["SELF", "PLATFORM"],
    defaultShippingMode: "SELF",
    preferredPickupLocation: "Primary",
  },
  adminShippingModes: {
    selfShipping: true,
    platformShipping: true,
  },
};

export function VendorSettingsPage() {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    vendorDashboardService
      .getVendorSettings()
      .then((response) => {
        const vendor = response.data;
        setForm({
          ...defaultForm,
          ...vendor,
          bankDetails: { ...defaultForm.bankDetails, ...(vendor.bankDetails || {}) },
          notificationPreferences: {
            ...defaultForm.notificationPreferences,
            ...(vendor.notificationPreferences || {}),
          },
        });
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load settings."));
  }, []);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    try {
      await vendorDashboardService.updateVendorSettings(form);
      await vendorDashboardService.updateVendorShippingSettings(form.shippingSettings);
      setMessage("Settings updated successfully.");
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save vendor settings.");
    }
  }

  return (
    <div className="grid gap-6">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <VendorSection title="Store Profile" description="Public storefront information for your vendor account.">
        <div className="grid gap-4 md:grid-cols-2">
          <input value={form.companyName || ""} onChange={(e) => setField("companyName", e.target.value)} placeholder="Company name" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.shopName || ""} onChange={(e) => setField("shopName", e.target.value)} placeholder="Shop name" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.storeSlug || ""} onChange={(e) => setField("storeSlug", e.target.value)} placeholder="Store slug" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.supportEmail || ""} onChange={(e) => setField("supportEmail", e.target.value)} placeholder="Support email" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.supportPhone || ""} onChange={(e) => setField("supportPhone", e.target.value)} placeholder="Support phone" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.defaultCourier || ""} onChange={(e) => setField("defaultCourier", e.target.value)} placeholder="Default courier" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.logoUrl || ""} onChange={(e) => setField("logoUrl", e.target.value)} placeholder="Logo URL" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.bannerUrl || ""} onChange={(e) => setField("bannerUrl", e.target.value)} placeholder="Banner URL" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <textarea value={form.storeDescription || ""} onChange={(e) => setField("storeDescription", e.target.value)} placeholder="Store description" className="md:col-span-2 min-h-28 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <textarea value={form.address || ""} onChange={(e) => setField("address", e.target.value)} placeholder="Business address" className="md:col-span-2 min-h-24 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
        </div>
      </VendorSection>

      <VendorSection title="Payout & Alerts" description="Banking details, payout schedule, and vendor notification policy.">
        <div className="grid gap-4 md:grid-cols-2">
          <select value={form.payoutSchedule || "weekly"} onChange={(e) => setField("payoutSchedule", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input value={form.lowStockThreshold || 10} onChange={(e) => setField("lowStockThreshold", Number(e.target.value))} type="number" min="0" placeholder="Low stock threshold" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.bankDetails?.holderName || ""} onChange={(e) => setField("bankDetails", { ...form.bankDetails, holderName: e.target.value })} placeholder="Account holder" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.bankDetails?.accountNumber || ""} onChange={(e) => setField("bankDetails", { ...form.bankDetails, accountNumber: e.target.value })} placeholder="Account number" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <input value={form.bankDetails?.IFSC || ""} onChange={(e) => setField("bankDetails", { ...form.bankDetails, IFSC: e.target.value })} placeholder="IFSC" className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
          <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Role & Security</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">JWT-protected seller workspace with ownership enforcement on products, orders, payouts, and support data.</div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Object.entries(form.notificationPreferences || {}).map(([key, value]) => (
            <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) =>
                  setField("notificationPreferences", {
                    ...form.notificationPreferences,
                    [key]: event.target.checked,
                  })
                }
              />
              <span>{key}</span>
            </label>
          ))}
        </div>
      </VendorSection>

      <VendorSection title="Shipping Settings" description="Choose your default fulfillment mode from the options enabled by admin.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-700">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Available modes</div>
            <div className="mt-3 grid gap-3">
              {[
                { key: "SELF", label: "Self Shipping", adminEnabled: form.adminShippingModes?.selfShipping },
                { key: "PLATFORM", label: "Platform Shipping", adminEnabled: form.adminShippingModes?.platformShipping },
              ].map((mode) => {
                const checked = (form.shippingSettings?.allowedShippingModes || []).includes(mode.key);
                return (
                  <label key={mode.key} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${mode.adminEnabled ? "border-slate-200 dark:border-slate-700" : "border-slate-100 opacity-60 dark:border-slate-800"}`}>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{mode.label}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {mode.adminEnabled ? "Enabled by admin" : "Disabled by admin"}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!mode.adminEnabled}
                      onChange={(event) => {
                        const current = new Set(form.shippingSettings?.allowedShippingModes || []);
                        if (event.target.checked) current.add(mode.key);
                        else current.delete(mode.key);
                        setField("shippingSettings", {
                          ...form.shippingSettings,
                          allowedShippingModes: Array.from(current),
                          defaultShippingMode: current.has(form.shippingSettings?.defaultShippingMode)
                            ? form.shippingSettings.defaultShippingMode
                            : Array.from(current)[0] || "",
                        });
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <select
              value={form.shippingSettings?.defaultShippingMode || "SELF"}
              onChange={(e) => setField("shippingSettings", { ...form.shippingSettings, defaultShippingMode: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"
            >
              {(form.shippingSettings?.allowedShippingModes || []).map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "SELF" ? "Self Shipping" : "Platform Shipping"}
                </option>
              ))}
            </select>
            <input
              value={form.shippingSettings?.preferredPickupLocation || "Primary"}
              onChange={(e) => setField("shippingSettings", { ...form.shippingSettings, preferredPickupLocation: e.target.value })}
              placeholder="Preferred pickup location"
              className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"
            />
            <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Orders default to your selected mode, and each order is still enforced against the current admin-enabled marketplace modes.
            </div>
          </div>
        </div>
      </VendorSection>

      <div>
        <button onClick={save} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
          Save Settings
        </button>
      </div>
    </div>
  );
}
