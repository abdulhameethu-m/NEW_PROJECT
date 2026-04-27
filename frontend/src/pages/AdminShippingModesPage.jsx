import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Truck } from "lucide-react";
import { getShippingModes, updateShippingModes } from "../services/adminApi";

function Toggle({ checked, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
        checked ? "bg-slate-900 dark:bg-white" : "bg-slate-300 dark:bg-slate-700"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white transition dark:bg-slate-950 ${
          checked ? "translate-x-7 dark:bg-slate-950" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function AdminShippingModesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modes, setModes] = useState({ selfShipping: true, platformShipping: true });

  useEffect(() => {
    let cancelled = false;
    getShippingModes()
      .then((response) => {
        if (cancelled) return;
        setModes(response.data?.value || response.value || { selfShipping: true, platformShipping: true });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load shipping modes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function save(nextModes) {
    setSaving(true);
    setError("");
    try {
      const response = await updateShippingModes(nextModes);
      setModes(response.data?.value || response.value || nextModes);
      setMessage("Shipping access updated.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update shipping modes.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(key) {
    const nextModes = { ...modes, [key]: !modes[key] };
    if (!nextModes.selfShipping && !nextModes.platformShipping) {
      setError("At least one shipping mode must stay enabled.");
      return;
    }
    await save(nextModes);
  }

  return (
    <div className="grid gap-4">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Vendor Shipping Access</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Admin controls available modes. Vendors can only choose from enabled options.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            Final flow = available modes intersect vendor selection.
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          {[
            {
              key: "selfShipping",
              title: "Self Shipping",
              description: "Vendor packs and enters courier name plus tracking ID.",
              icon: ShieldCheck,
            },
            {
              key: "platformShipping",
              title: "Platform Shipping",
              description: "Vendor requests pickup and the platform pushes the order through logistics.",
              icon: Truck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="grid gap-4 border-b border-slate-200 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-950 dark:text-white">{item.title}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {modes[item.key] ? "ON" : "OFF"}
                  </span>
                  <Toggle checked={Boolean(modes[item.key])} disabled={loading || saving} onClick={() => toggle(item.key)} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {loading || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {loading ? "Loading shipping controls..." : saving ? "Saving shipping controls..." : "Changes apply immediately to vendor selection and order actions."}
        </div>
      </section>
    </div>
  );
}
