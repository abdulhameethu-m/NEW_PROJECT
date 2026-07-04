import { useCallback, useEffect, useMemo, useState } from "react";
import { confirmAction } from "../services/notificationService";
import { BackButton } from "../components/BackButton";
import { adminHttp } from "../services/adminHttp";

const ZONES = [
  { id: "LOCAL", label: "Local", description: "Same-city delivery" },
  { id: "REGIONAL", label: "Regional", description: "Nearby districts or standard service area" },
  { id: "REMOTE", label: "Remote", description: "Far or difficult-to-serve areas" },
];

function normalizeError(err) {
  const issues = err?.response?.data?.details?.issues;
  if (Array.isArray(issues) && issues.length > 0) return issues.map((issue) => issue.message).join(", ");
  return err?.response?.data?.message || err?.message || "Request failed";
}

function parseMultilineList(value = "") {
  return Array.from(
    new Set(
      String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatMultilineList(values = []) {
  return Array.isArray(values) ? values.join("\n") : "";
}

function formatKg(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(3) : "0.000";
}

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function createRuleForm(defaultState = "Tamil Nadu") {
  return {
    state: defaultState,
    district: "",
    zone: "LOCAL",
    weightFrom: "",
    weightTo: "",
    shippingCharge: "",
    priority: "0",
    status: "active",
    settlementRecipient: "ADMIN",
    description: "",
  };
}

function createRowId() {
  return `shipping-state-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLocationState(stateName = "Tamil Nadu") {
  return {
    id: createRowId(),
    state: stateName,
    defaultZone: "REGIONAL",
    zones: {
      LOCAL: { citiesText: "", districtsText: "", pincodesText: "" },
      REGIONAL: { citiesText: "", districtsText: "", pincodesText: "" },
      REMOTE: { citiesText: "", districtsText: "", pincodesText: "" },
    },
  };
}

function normalizeLocationStateForForm(entry = {}) {
  const base = createLocationState(entry.state || "Tamil Nadu");
  return {
    id: entry.id || base.id,
    state: entry.state || base.state,
    defaultZone: entry.defaultZone || base.defaultZone,
    zones: Object.fromEntries(
      ZONES.map(({ id }) => [
        id,
        {
          citiesText: formatMultilineList(entry.zones?.[id]?.cities || []),
          districtsText: formatMultilineList(entry.zones?.[id]?.districts || []),
          pincodesText: formatMultilineList(entry.zones?.[id]?.pincodes || []),
        },
      ])
    ),
  };
}

export function AdminShippingConfigPage() {
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [availableStates, setAvailableStates] = useState(["Tamil Nadu"]);
  const [districtsByState, setDistrictsByState] = useState({});
  const [locationStates, setLocationStates] = useState([createLocationState()]);
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [formData, setFormData] = useState(createRuleForm());
  const [preview, setPreview] = useState({ weight: "", state: "Tamil Nadu", district: "" });
  const [previewResult, setPreviewResult] = useState(null);

  const stateOptions = useMemo(() => {
    const names = [...availableStates, ...locationStates.map((entry) => entry.state), formData.state]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [availableStates, locationStates, formData.state]);

  const selectedDistrictOptions = districtsByState[formData.state] || [];
  const previewDistrictOptions = districtsByState[preview.state] || [];

  const loadRules = useCallback(async () => {
    const res = await adminHttp.get("/api/admin/shipping-config");
    setRules(Array.isArray(res.data?.data?.data) ? res.data.data.data : []);
  }, []);

  const loadStatistics = useCallback(async () => {
    const res = await adminHttp.get("/api/admin/shipping-config/statistics");
    setStats(res.data?.data || null);
  }, []);

  const loadOptions = useCallback(async () => {
    const res = await adminHttp.get("/api/admin/shipping-config/options");
    const data = res.data?.data || {};
    setAvailableStates(data.states?.length ? data.states : ["Tamil Nadu"]);
    setDistrictsByState(data.districtsByState || {});
  }, []);

  const loadLocationConfig = useCallback(async () => {
    const res = await adminHttp.get("/api/admin/shipping-config/location-config");
    const states = Array.isArray(res.data?.data?.states) ? res.data.data.states : [];
    setLocationStates(states.length ? states.map(normalizeLocationStateForForm) : [createLocationState()]);
  }, []);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadRules(), loadStatistics(), loadOptions(), loadLocationConfig()]);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, [loadLocationConfig, loadOptions, loadRules, loadStatistics]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  function resetForm() {
    setFormData(createRuleForm(stateOptions[0] || "Tamil Nadu"));
    setEditingRuleId(null);
    setShowForm(false);
  }

  function handleEditRule(rule) {
    setFormData({
      state: rule.state || "",
      district: rule.district || "",
      zone: rule.zone || "LOCAL",
      weightFrom: String(Number(rule.weightFrom || 0)),
      weightTo: String(Number(rule.weightTo || 0)),
      shippingCharge: String(Number(rule.shippingCharge || 0)),
      priority: String(Number(rule.priority || 0)),
      status: rule.status || "active",
      settlementRecipient: rule.settlementRecipient || "ADMIN",
      description: rule.description || "",
    });
    setEditingRuleId(rule._id);
    setShowForm(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "state" ? { district: "" } : {}),
    }));
  }

  async function handleSaveRule() {
    try {
      setSavingRule(true);
      setError("");
      setSuccess("");

      const payload = {
        state: String(formData.state || "").trim(),
        district: String(formData.district || "").trim(),
        zone: formData.zone,
        weightFrom: Number(formData.weightFrom),
        weightTo: Number(formData.weightTo),
        shippingCharge: Number(formData.shippingCharge),
        priority: Number(formData.priority || 0),
        status: formData.status,
        settlementRecipient: formData.settlementRecipient === "VENDOR" ? "VENDOR" : "ADMIN",
        description: String(formData.description || "").trim(),
      };

      if (!payload.state) throw new Error("State is required");
      if (!Number.isFinite(payload.weightFrom) || payload.weightFrom < 0) throw new Error("Weight from must be valid");
      if (!Number.isFinite(payload.weightTo) || payload.weightTo <= 0) throw new Error("Weight to must be valid");
      if (payload.weightFrom >= payload.weightTo) throw new Error("Weight from must be less than weight to");
      if (!Number.isFinite(payload.shippingCharge) || payload.shippingCharge < 0) throw new Error("Shipping charge must be valid");

      if (editingRuleId) {
        await adminHttp.put(`/api/admin/shipping-config/${editingRuleId}`, payload);
        setSuccess("Shipping slab updated successfully.");
      } else {
        await adminHttp.post("/api/admin/shipping-config", payload);
        setSuccess("Shipping slab created successfully.");
      }

      resetForm();
      await Promise.all([loadRules(), loadStatistics(), loadOptions()]);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSavingRule(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!(await confirmAction({ message: "Delete this shipping slab?", tone: "danger", confirmLabel: "Confirm" }))) return;

    try {
      setSavingRule(true);
      setError("");
      setSuccess("");
      await adminHttp.delete(`/api/admin/shipping-config/${ruleId}`);
      setSuccess("Shipping slab deleted successfully.");
      await Promise.all([loadRules(), loadStatistics()]);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSavingRule(false);
    }
  }

  async function handlePreviewShipping() {
    if (!preview.weight) {
      setError("Enter a weight to preview shipping.");
      return;
    }

    try {
      setError("");
      const res = await adminHttp.post("/api/admin/shipping-config/calculate-preview", {
        weight: Number(preview.weight),
        state: preview.state || stateOptions[0] || "Tamil Nadu",
        district: preview.district,
      });
      setPreviewResult(res.data?.data || null);
    } catch (e) {
      setError(normalizeError(e));
    }
  }

  function updateLocationState(index, patch) {
    setLocationStates((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  }

  function updateLocationZoneField(index, zone, field, value) {
    setLocationStates((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, zones: { ...entry.zones, [zone]: { ...entry.zones[zone], [field]: value } } }
          : entry
      )
    );
  }

  async function saveLocationConfig() {
    try {
      setSavingLocations(true);
      setError("");
      setSuccess("");
      await adminHttp.put("/api/admin/shipping-config/location-config", {
        states: locationStates.map((entry) => ({
          state: String(entry.state || "").trim(),
          defaultZone: entry.defaultZone,
          zones: Object.fromEntries(
            ZONES.map(({ id }) => [
              id,
              {
                cities: parseMultilineList(entry.zones?.[id]?.citiesText),
                districts: parseMultilineList(entry.zones?.[id]?.districtsText),
                pincodes: parseMultilineList(entry.zones?.[id]?.pincodesText),
              },
            ])
          ),
        })),
      });
      setSuccess("Shipping location mapping updated successfully.");
      await Promise.all([loadLocationConfig(), loadOptions(), loadStatistics()]);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSavingLocations(false);
    }
  }

  const statCards = [
    ["Total States", stats?.totalStates],
    ["Total Districts", stats?.totalDistricts],
    ["Total Zones", stats?.totalZones],
    ["Shipping Rules", stats?.totalShippingRules],
    ["Weight Slabs", stats?.totalWeightSlabs],
    ["Active Rules", stats?.activeRules],
    ["Inactive Rules", stats?.inactiveRules],
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <BackButton />
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shipping Configuration</h1>
              <p className="mt-1 text-gray-600">Configure State → District → Zone → Weight Slab shipping rules.</p>
            </div>
            <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">
              {showForm ? "Cancel" : "+ Add Weight Slab"}
            </button>
          </div>

          {stats ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-7">
              {statCards.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{Number(value || 0)}</p>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
          {success ? <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">{success}</div> : null}

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Zone Resolution Matrix</h2>
                <p className="mt-1 text-sm text-gray-600">Checkout districts resolve to LOCAL, REGIONAL, or REMOTE before slab pricing is applied.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setLocationStates((prev) => [...prev, createLocationState("")])} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Add State
                </button>
                <button type="button" onClick={saveLocationConfig} disabled={savingLocations} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {savingLocations ? "Saving..." : "Save Zone Mapping"}
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {locationStates.map((entry, index) => (
                <div key={entry.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                    <label>
                      <span className="block text-sm font-medium text-gray-700">State</span>
                      <input value={entry.state} onChange={(event) => updateLocationState(index, { state: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Tamil Nadu" />
                    </label>
                    <label>
                      <span className="block text-sm font-medium text-gray-700">Default Zone</span>
                      <select value={entry.defaultZone} onChange={(event) => updateLocationState(index, { defaultZone: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                        {ZONES.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => setLocationStates((prev) => (prev.length > 1 ? prev.filter((_, entryIndex) => entryIndex !== index) : prev))} disabled={locationStates.length === 1} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-40">
                      Remove
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {ZONES.map((zone) => (
                      <div key={zone.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3">
                          <div className="font-semibold text-slate-950">{zone.label}</div>
                          <div className="text-xs text-slate-500">{zone.description}</div>
                        </div>
                        {[
                          ["citiesText", "Cities", "Optional legacy city aliases"],
                          ["districtsText", "Districts", "One district per line"],
                          ["pincodesText", "Pincodes", "One pincode per line"],
                        ].map(([field, label, placeholder]) => (
                          <label key={field} className="mb-3 block">
                            <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
                            <textarea rows="4" value={entry.zones?.[zone.id]?.[field] || ""} onChange={(event) => updateLocationZoneField(index, zone.id, field, event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder={placeholder} />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {showForm ? (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">{editingRuleId ? "Edit Weight Slab" : "Create Weight Slab"}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className="block text-sm font-medium text-gray-700">State *</span>
                  <select name="state" value={formData.state} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    {stateOptions.map((stateName) => <option key={stateName} value={stateName}>{stateName}</option>)}
                  </select>
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700">District (optional)</span>
                  <select name="district" value={formData.district} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="">All districts in this state</option>
                    {selectedDistrictOptions.map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700">Zone *</span>
                  <select name="zone" value={formData.zone} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    {ZONES.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700">Shipping Charge *</span>
                  <input type="number" name="shippingCharge" value={formData.shippingCharge} onChange={handleFormChange} step="0.01" min="0" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700">Weight From (kg) *</span>
                  <input type="number" name="weightFrom" value={formData.weightFrom} onChange={handleFormChange} step="0.001" min="0" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700">Weight To (kg) *</span>
                  <input type="number" name="weightTo" value={formData.weightTo} onChange={handleFormChange} step="0.001" min="0.001" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700">Priority</span>
                  <input type="number" name="priority" value={formData.priority} onChange={handleFormChange} step="1" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700">Status</span>
                  <select name="status" value={formData.status} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <fieldset className="md:col-span-2">
                  <legend className="block text-sm font-medium text-gray-700">Shipping charge recipient</legend>
                  <div className="mt-1 flex gap-5 rounded-lg border border-gray-300 bg-white px-3 py-2">
                    <label className="flex items-center gap-2 text-sm"><input type="radio" name="settlementRecipient" value="ADMIN" checked={formData.settlementRecipient === "ADMIN"} onChange={handleFormChange} /> Send to admin</label>
                    <label className="flex items-center gap-2 text-sm"><input type="radio" name="settlementRecipient" value="VENDOR" checked={formData.settlementRecipient === "VENDOR"} onChange={handleFormChange} /> Send to vendor</label>
                  </div>
                </fieldset>
              </div>
              <label className="mt-4 block">
                <span className="block text-sm font-medium text-gray-700">Description</span>
                <textarea name="description" value={formData.description} onChange={handleFormChange} rows="3" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Optional slab notes" />
              </label>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={handleSaveRule} disabled={savingRule} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60">{savingRule ? "Saving..." : editingRuleId ? "Update Slab" : "Create Slab"}</button>
                <button type="button" onClick={resetForm} className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800">Cancel</button>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Preview Shipping Cost</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr_1fr_auto] md:items-end">
              <label>
                <span className="block text-sm font-medium text-gray-700">Weight (kg)</span>
                <input type="number" value={preview.weight} onChange={(event) => setPreview((prev) => ({ ...prev, weight: event.target.value }))} step="0.001" min="0.001" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label>
                <span className="block text-sm font-medium text-gray-700">State</span>
                <select value={preview.state} onChange={(event) => setPreview((prev) => ({ ...prev, state: event.target.value, district: "" }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  {stateOptions.map((stateName) => <option key={stateName} value={stateName}>{stateName}</option>)}
                </select>
              </label>
              <label>
                <span className="block text-sm font-medium text-gray-700">District</span>
                <select value={preview.district} onChange={(event) => setPreview((prev) => ({ ...prev, district: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="">No district selected</option>
                  {previewDistrictOptions.map((district) => <option key={district} value={district}>{district}</option>)}
                </select>
              </label>
              <button type="button" onClick={handlePreviewShipping} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Calculate</button>
            </div>
            {previewResult ? (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold text-slate-950">Resolved zone: {previewResult.resolvedZone || "Not matched"}</span>
                  <span className="text-sm text-slate-600">Matched on {previewResult.matchedOn || "none"}</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calculation Method</div>
                    <div className="mt-1 font-semibold text-slate-950">
                      {previewResult.calculationMethod === "DYNAMIC_EXPANSION" ? "Dynamic Expansion" : previewResult.calculationMethod === "EXACT_RULE" ? "Exact Rule" : "No Rule"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shipping Price</div>
                    <div className="mt-1 font-semibold text-slate-950">{formatMoney(previewResult.shippingPrice || 0)}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final Shipping Amount</div>
                    <div className="mt-1 font-semibold text-slate-950">{formatMoney(previewResult.finalShippingAmount || 0)}</div>
                  </div>
                </div>
                {previewResult.previews?.length ? (
                  previewResult.previews.map((item, index) => (
                    <div key={`${item.zone}-${index}`} className="mt-3 rounded-lg border border-blue-100 bg-white p-3 text-sm text-slate-700">
                      <div>
                        Configured rule: {formatKg(item.breakdown?.weightFrom)}kg - {formatKg(item.breakdown?.weightTo)}kg at <strong>{formatMoney(item.matchedRule?.shippingCharge || previewResult.shippingPrice || 0)}</strong>
                      </div>
                      {item.calculationMethod === "DYNAMIC_EXPANSION" && item.breakdown?.dynamicExpansion ? (
                        <div className="mt-1 text-slate-600">
                          Expansion: remaining {formatKg(item.breakdown.dynamicExpansion.remainingWeight)}kg, {item.breakdown.dynamicExpansion.additionalWeightBlocks} additional block(s), formula {item.breakdown.dynamicExpansion.formula}
                        </div>
                      ) : null}
                      <div className="mt-1 font-semibold text-slate-950">Result: {formatMoney(item.cost)}</div>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 text-sm text-rose-700">No active slab matched this state, district, zone, and weight.</p>
                )}
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">Weight Slab Rules</h2>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading shipping slabs...</div>
            ) : rules.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No shipping slabs configured yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {["State", "District", "Zone", "Weight Slab", "Charge", "Priority", "Send To", "Status", "Actions"].map((heading) => (
                        <th key={heading} className={`px-6 py-3 text-sm font-medium text-gray-700 ${heading === "Actions" ? "text-right" : "text-left"}`}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-800">{rule.state}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{rule.district || "All districts"}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{rule.zone}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{formatKg(rule.weightFrom)}kg - {formatKg(rule.weightTo)}kg</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatMoney(rule.shippingCharge)}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{Number(rule.priority || 0)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{rule.settlementRecipient === "VENDOR" ? "Vendor" : "Admin"}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`rounded px-2 py-1 text-xs font-medium ${rule.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{rule.status === "active" ? "Active" : "Inactive"}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <button type="button" onClick={() => handleEditRule(rule)} className="mr-3 text-blue-600 hover:text-blue-800">Edit</button>
                          <button type="button" onClick={() => handleDeleteRule(rule._id)} className="text-red-600 hover:text-red-800">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
