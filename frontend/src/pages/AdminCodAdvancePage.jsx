import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { adminHttp } from "../services/adminHttp";
import {
  createCodAdvanceRule,
  deleteCodAdvanceRule,
  getCodSettings,
  listCodAdvanceRules,
  updateCodAdvanceRule,
  updateCodSettings,
} from "../services/paymentService";
import { formatCurrency } from "../utils/formatCurrency";

const ZONES = ["LOCAL", "REGIONAL", "REMOTE"];

const emptyRule = {
  name: "",
  state: "",
  district: "",
  shippingZone: "",
  shippingZones: [],
  advanceType: "FIXED",
  advanceValue: 0,
  minOrderValue: 0,
  maxOrderValue: 0,
  priority: 100,
  isActive: true,
  description: "",
};

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <input
        type="number"
        min="0"
        value={value ?? 0}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
    </label>
  );
}

function RuleField({ label, children, className = "" }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function getSelectedShippingZones(value = {}) {
  if (Array.isArray(value.shippingZones) && value.shippingZones.length) {
    return value.shippingZones.filter(Boolean);
  }
  return value.shippingZone ? [value.shippingZone] : [];
}

async function loadShippingOptions() {
  try {
    const response = await adminHttp.get("/api/admin/shipping-config/options");
    return response.data?.data || {};
  } catch {
    const statesResponse = await api.get("/api/shipping/locations/states");
    const states = statesResponse.data?.data?.states || [];
    const districtsByState = {};
    await Promise.all(
      states.map(async (state) => {
        const response = await api.get("/api/shipping/locations/districts", { params: { state } });
        districtsByState[state] = response.data?.data?.districts || [];
      })
    );
    return { states, districtsByState, zones: ZONES };
  }
}

export function AdminCodAdvancePage() {
  const [settings, setSettings] = useState(null);
  const [rules, setRules] = useState([]);
  const [shippingOptions, setShippingOptions] = useState({ states: [], districtsByState: {}, zones: ZONES });
  const [form, setForm] = useState(emptyRule);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeRules = useMemo(() => rules.filter((rule) => rule.isActive !== false), [rules]);
  const stateOptions = useMemo(
    () => Array.from(new Set([...(shippingOptions.states || []), ...rules.map((rule) => rule.state)].filter(Boolean))),
    [rules, shippingOptions.states]
  );
  const districtOptions = shippingOptions.districtsByState?.[form.state] || [];
  const advance = settings?.advance || {};
  const selectedShippingZones = getSelectedShippingZones(form);

  async function load() {
    setLoading(true);
    try {
      const [settingsResponse, rulesResponse, shippingResponse] = await Promise.all([
        getCodSettings(),
        listCodAdvanceRules(),
        loadShippingOptions(),
      ]);
      setSettings(settingsResponse || {});
      setRules(Array.isArray(rulesResponse) ? rulesResponse : []);
      setShippingOptions({
        states: shippingResponse.states || [],
        districtsByState: shippingResponse.districtsByState || {},
        zones: shippingResponse.zones || ZONES,
      });
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function patchAdvance(patch) {
    setSettings((current) => ({
      ...(current || {}),
      advance: {
        ...(current?.advance || {}),
        ...patch,
      },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await updateCodSettings(settings || {});
      await load();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveRule() {
    if (!String(form.name || "").trim()) {
      setError("Rule name is required");
      return;
    }
    setSaving(true);
    try {
      const shippingZones = getSelectedShippingZones(form);
      const payload = {
        ...form,
        shippingZone: shippingZones[0] || "",
        shippingZones,
      };
      if (editingId) await updateCodAdvanceRule(editingId, payload);
      else await createCodAdvanceRule(payload);
      setForm(emptyRule);
      setEditingId("");
      await load();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleShippingZone(zone) {
    setForm((current) => {
      const selected = getSelectedShippingZones(current);
      const next = selected.includes(zone) ? selected.filter((item) => item !== zone) : [...selected, zone];
      return {
        ...current,
        shippingZone: next[0] || "",
        shippingZones: next,
      };
    });
  }

  async function disableRule(id) {
    setSaving(true);
    try {
      await deleteCodAdvanceRule(id);
      await load();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">COD Advance Configuration</h1>
          <p className="mt-1 text-sm text-slate-600">Set only COD advance amounts. Shipping zones come from Shipping Configuration, and deductions come from Cancellation Policies.</p>
        </div>
        <button type="button" onClick={saveSettings} disabled={saving || loading} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Saving..." : "Save Advance Settings"}
        </button>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Link to="/admin/shipping" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
          Shipping source: states, districts, and zones
        </Link>
        <Link to="/admin/finance/cancellation-policies" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
          Cancellation source: refund deductions and approval rules
        </Link>
      </section>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Active Advance Rules", activeRules.length],
          ["Shipping States", stateOptions.length],
          ["Global Advance", advance.defaultAdvanceType === "PERCENTAGE" ? `${advance.defaultAdvanceValue || 0}%` : formatCurrency(advance.defaultAdvanceValue || 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Advance Defaults</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Toggle label="Enable COD Advance" checked={Boolean(advance.isEnabled)} onChange={(value) => patchAdvance({ isEnabled: value })} />
            <Toggle label="Require Advance Before Order" checked={advance.requireBeforeOrderCreation !== false} onChange={(value) => patchAdvance({ requireBeforeOrderCreation: value })} />
            <Toggle label="Include Shipping In Advance Basis" checked={advance.includeShippingInBasis !== false} onChange={(value) => patchAdvance({ includeShippingInBasis: value })} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Global Advance Type</span>
              <select value={advance.defaultAdvanceType || "FIXED"} onChange={(event) => patchAdvance({ defaultAdvanceType: event.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900">
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </label>
            <NumberInput label="Global Advance" value={advance.defaultAdvanceValue || 0} onChange={(value) => patchAdvance({ defaultAdvanceValue: value })} />
            <NumberInput label="Max Advance Cap" value={advance.maxAdvanceAmount || 0} onChange={(value) => patchAdvance({ maxAdvanceAmount: value })} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">{editingId ? "Edit Advance Rule" : "Create Advance Rule"}</div>
          <div className="mt-4 grid gap-3">
            <RuleField label="Rule Name">
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Rule name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </RuleField>
            <RuleField label="State">
              <select value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value, district: "" }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">Global default / any state</option>
                {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </RuleField>
            <RuleField label="District">
              <select value={form.district} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))} disabled={!form.state} className="rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100">
                <option value="">{form.state ? `All districts in ${form.state}` : "Select a state first"}</option>
                {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </RuleField>
            <RuleField label="Shipping Zone">
              <div className="rounded-xl border border-slate-300 bg-white p-2">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, shippingZone: "", shippingZones: [] }))}
                  className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${selectedShippingZones.length ? "bg-slate-50 text-slate-600" : "bg-slate-950 text-white"}`}
                >
                  Any shipping zone
                </button>
                <div className="grid gap-1">
                  {(shippingOptions.zones || ZONES).map((zone) => (
                    <label key={zone} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedShippingZones.includes(zone)}
                        onChange={() => toggleShippingZone(zone)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-950"
                      />
                      <span>{zone}</span>
                    </label>
                  ))}
                </div>
              </div>
            </RuleField>
            <div className="grid grid-cols-2 gap-3">
              <RuleField label="Advance Type">
                <select value={form.advanceType} onChange={(event) => setForm((current) => ({ ...current, advanceType: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="FIXED">Fixed</option>
                  <option value="PERCENTAGE">Percentage</option>
                </select>
              </RuleField>
              <RuleField label="Advance Amount">
                <input type="number" min="0" value={form.advanceValue} onChange={(event) => setForm((current) => ({ ...current, advanceValue: Number(event.target.value || 0) }))} placeholder="Advance" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </RuleField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <RuleField label="Min Order Value">
                <input type="number" min="0" value={form.minOrderValue} onChange={(event) => setForm((current) => ({ ...current, minOrderValue: Number(event.target.value || 0) }))} placeholder="Min order" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </RuleField>
              <RuleField label="Max Order Value">
                <input type="number" min="0" value={form.maxOrderValue} onChange={(event) => setForm((current) => ({ ...current, maxOrderValue: Number(event.target.value || 0) }))} placeholder="Max order" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </RuleField>
            </div>
            <RuleField label="Description">
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={3} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </RuleField>
            <div className="flex gap-2">
              <button type="button" onClick={saveRule} disabled={saving} className="flex-1 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {editingId ? "Update Rule" : "Create Rule"}
              </button>
              <button type="button" onClick={() => { setEditingId(""); setForm(emptyRule); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Clear
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Advance Rules</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Rule</th>
                <th className="px-5 py-3">Shipping Mapping</th>
                <th className="px-5 py-3">Advance</th>
                <th className="px-5 py-3">Order Range</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-5 py-6 text-slate-500" colSpan={6}>Loading rules...</td></tr>
              ) : rules.length ? (
                rules.map((rule) => (
                  <tr key={rule._id}>
                    <td className="px-5 py-4 font-medium text-slate-900">{rule.name}</td>
                    <td className="px-5 py-4 text-slate-600">{[rule.district, rule.state, getSelectedShippingZones(rule).join(" / ")].filter(Boolean).join(", ") || "Global"}</td>
                    <td className="px-5 py-4 text-slate-700">{rule.advanceType === "PERCENTAGE" ? `${rule.advanceValue}%` : formatCurrency(rule.advanceValue || 0)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatCurrency(rule.minOrderValue || 0)} - {rule.maxOrderValue ? formatCurrency(rule.maxOrderValue) : "No cap"}</td>
                    <td className="px-5 py-4 text-slate-600">{rule.isActive ? "Active" : "Disabled"}</td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => { setEditingId(rule._id); setForm({ ...emptyRule, ...rule, shippingZones: getSelectedShippingZones(rule) }); }} className="text-sm font-semibold text-slate-900">Edit</button>
                      <button type="button" onClick={() => disableRule(rule._id)} className="ml-4 text-sm font-semibold text-rose-600">Disable</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-5 py-6 text-slate-500" colSpan={6}>No COD advance rules created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
