import { useEffect, useState } from "react";
import {
  createCancellationPolicy,
  listCancellationPolicies,
  updateCancellationPolicy,
} from "../services/adminApi";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

function buildEmptyPolicy() {
  return {
    name: "Marketplace Cancellation Policy",
    description: "",
    isActive: true,
    priority: 100,
    defaultRefundMethod: "RAZORPAY",
    featureFlags: {
      codCancellationEnabled: true,
      razorpayCancellationEnabled: true,
      codRefundEnabled: false,
      razorpayRefundEnabled: true,
      manualRefundEnabled: true,
      walletRefundEnabled: true,
      autoRefundEnabled: true,
      partialRefundEnabled: true,
      stageBasedCancellationEnabled: true,
    },
    stages: [],
  };
}

function formatStageLabel(stageKey = "") {
  return String(stageKey || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

export function AdminCancellationPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(buildEmptyPolicy());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadPolicies() {
    setLoading(true);
    try {
      const response = await listCancellationPolicies();
      const rows = response.data?.policies || [];
      setPolicies(rows);
      const active = rows[0] || null;
      setSelectedId(active?._id || "");
      setForm(active || buildEmptyPolicy());
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      if (selectedId) {
        await updateCancellationPolicy(selectedId, form);
      } else {
        await createCancellationPolicy(form);
      }
      await loadPolicies();
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
          <h1 className="text-2xl font-semibold text-slate-950">Cancellation Policies</h1>
          <p className="mt-1 text-sm text-slate-600">Configure feature flags and dynamic cancellation behavior across payment methods and order stages.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedId("");
            setForm(buildEmptyPolicy());
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          New Policy
        </button>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Policies</div>
          <div className="mt-4 space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)
            ) : (
              policies.map((policy) => (
                <button
                  key={policy._id}
                  type="button"
                  onClick={() => {
                    setSelectedId(policy._id);
                    setForm(policy);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    selectedId === policy._id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="font-semibold">{policy.name}</div>
                  <div className={`mt-1 text-xs ${selectedId === policy._id ? "text-slate-200" : "text-slate-500"}`}>
                    Priority {policy.priority} {policy.isActive ? "• Active" : "• Inactive"}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Policy Name</span>
                <input
                  value={form.name || ""}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Default Refund Method</span>
                <select
                  value={form.defaultRefundMethod || "RAZORPAY"}
                  onChange={(event) => setForm((current) => ({ ...current, defaultRefundMethod: event.target.value }))}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                >
                  <option value="RAZORPAY">Razorpay</option>
                  <option value="MANUAL">Manual</option>
                  <option value="WALLET">Wallet</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description</span>
              <textarea
                value={form.description || ""}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Feature Flags</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[
                  ["codCancellationEnabled", "COD cancellation"],
                  ["razorpayCancellationEnabled", "Razorpay cancellation"],
                  ["codRefundEnabled", "COD refund"],
                  ["razorpayRefundEnabled", "Razorpay refund"],
                  ["manualRefundEnabled", "Manual refund"],
                  ["walletRefundEnabled", "Wallet refund"],
                  ["autoRefundEnabled", "Auto refund"],
                  ["partialRefundEnabled", "Partial refund"],
                  ["stageBasedCancellationEnabled", "Stage-based cancellation"],
                ].map(([key, label]) => (
                  <Toggle
                    key={key}
                    label={label}
                    checked={Boolean(form.featureFlags?.[key])}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        featureFlags: {
                          ...(current.featureFlags || {}),
                          [key]: value,
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Stage Rules</div>
              <div className="mt-3 space-y-3">
                {(form.stages || []).map((stage, index) => (
                  <div key={stage.stage} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-slate-950">{formatStageLabel(stage.stage)}</div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Toggle
                          label="Cancel"
                          checked={Boolean(stage.cancellationEnabled)}
                          onChange={(value) =>
                            setForm((current) => {
                              const stages = [...(current.stages || [])];
                              stages[index] = { ...stages[index], cancellationEnabled: value };
                              return { ...current, stages };
                            })
                          }
                        />
                        <Toggle
                          label="Refund"
                          checked={Boolean(stage.refundEnabled)}
                          onChange={(value) =>
                            setForm((current) => {
                              const stages = [...(current.stages || [])];
                              stages[index] = { ...stages[index], refundEnabled: value };
                              return { ...current, stages };
                            })
                          }
                        />
                        <Toggle
                          label="Auto Approve"
                          checked={Boolean(stage.autoApproval)}
                          onChange={(value) =>
                            setForm((current) => {
                              const stages = [...(current.stages || [])];
                              stages[index] = { ...stages[index], autoApproval: value };
                              return { ...current, stages };
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Refund SLA Hours</span>
                        <input
                          type="number"
                          value={stage.refundSlaHours || 0}
                          onChange={(event) =>
                            setForm((current) => {
                              const stages = [...(current.stages || [])];
                              stages[index] = { ...stages[index], refundSlaHours: Number(event.target.value || 0) };
                              return { ...current, stages };
                            })
                          }
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cancellation Charge Type</span>
                        <select
                          value={stage.cancellationChargeType || "NONE"}
                          onChange={(event) =>
                            setForm((current) => {
                              const stages = [...(current.stages || [])];
                              const nextType = event.target.value;
                              stages[index] = {
                                ...stages[index],
                                cancellationChargeType: nextType,
                                cancellationChargeValue:
                                  nextType === "NONE" ? 0 : Number(stages[index]?.cancellationChargeValue || 0),
                              };
                              return { ...current, stages };
                            })
                          }
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="NONE">No charge</option>
                          <option value="FIXED">Fixed amount</option>
                          <option value="PERCENTAGE">Percentage</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {stage.cancellationChargeType === "PERCENTAGE" ? "Cancellation Charge %" : "Cancellation Charge Amount"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={stage.cancellationChargeType === "PERCENTAGE" ? "0.01" : "1"}
                          disabled={(stage.cancellationChargeType || "NONE") === "NONE"}
                          value={stage.cancellationChargeValue || 0}
                          onChange={(event) =>
                            setForm((current) => {
                              const stages = [...(current.stages || [])];
                              stages[index] = {
                                ...stages[index],
                                cancellationChargeValue: Number(event.target.value || 0),
                              };
                              return { ...current, stages };
                            })
                          }
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Manual Approval</span>
                        <select
                          value={stage.manualApproval ? "YES" : "NO"}
                          onChange={(event) =>
                            setForm((current) => {
                              const stages = [...(current.stages || [])];
                              stages[index] = { ...stages[index], manualApproval: event.target.value === "YES" };
                              return { ...current, stages };
                            })
                          }
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="NO">No</option>
                          <option value="YES">Yes</option>
                        </select>
                      </label>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Set a direct cancellation charge for this stage. The refund preview and final cancellation amount will use this automatically.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : selectedId ? "Update Policy" : "Create Policy"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
