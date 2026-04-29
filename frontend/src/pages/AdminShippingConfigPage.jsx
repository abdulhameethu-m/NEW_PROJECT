import { useEffect, useState } from "react";
import { BackButton } from "../components/BackButton";
import { apiClient } from "../config/apiClient";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

const ZONES = [
  { id: "LOCAL", label: "Local (Same City)", description: "Same city delivery" },
  { id: "REGIONAL", label: "Regional (Nearby Districts)", description: "Nearby districts" },
  { id: "REMOTE", label: "Remote (Far Districts)", description: "Far districts" },
];

export function AdminShippingConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [formData, setFormData] = useState({
    state: "Tamil Nadu",
    zone: "LOCAL",
    baseWeight: "",
    basePrice: "",
    pricePerKg: "",
    minWeight: "",
    maxWeight: "",
    freeShippingThreshold: "",
    minOrderValue: "",
    isActive: true,
    notes: "",
  });
  const [previewWeight, setPreviewWeight] = useState("");
  const [previewResult, setPreviewResult] = useState(null);

  // Load rules
  useEffect(() => {
    loadRules();
    loadStatistics();
  }, []);

  async function loadRules() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient.get("/admin/shipping-config");
      setRules(res.data?.data || []);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadStatistics() {
    try {
      const res = await apiClient.get("/admin/shipping-config/statistics");
      setStats(res.data);
    } catch (e) {
      console.error("Error loading statistics:", e);
    }
  }

  async function handleSaveRule() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        state: formData.state,
        zone: formData.zone,
        baseWeight: parseFloat(formData.baseWeight),
        basePrice: parseFloat(formData.basePrice),
        pricePerKg: parseFloat(formData.pricePerKg),
        minWeight: parseFloat(formData.minWeight),
        maxWeight: parseFloat(formData.maxWeight),
        freeShippingThreshold: formData.freeShippingThreshold ? parseFloat(formData.freeShippingThreshold) : 0,
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
        isActive: formData.isActive,
        notes: formData.notes,
      };

      if (editingRuleId) {
        await apiClient.put(`/admin/shipping-config/${editingRuleId}`, payload);
        setSuccess("Shipping rule updated successfully");
      } else {
        await apiClient.post("/admin/shipping-config", payload);
        setSuccess("Shipping rule created successfully");
      }

      resetForm();
      await loadRules();
      await loadStatistics();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!window.confirm("Are you sure you want to delete this shipping rule?")) return;

    try {
      setSaving(true);
      setError("");
      await apiClient.delete(`/admin/shipping-config/${ruleId}`);
      setSuccess("Shipping rule deleted successfully");
      await loadRules();
      await loadStatistics();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  function handleEditRule(rule) {
    setFormData({
      state: rule.state,
      zone: rule.zone,
      baseWeight: rule.baseWeight.toString(),
      basePrice: rule.basePrice.toString(),
      pricePerKg: rule.pricePerKg.toString(),
      minWeight: rule.minWeight.toString(),
      maxWeight: rule.maxWeight.toString(),
      freeShippingThreshold: rule.freeShippingThreshold?.toString() || "",
      minOrderValue: rule.minOrderValue?.toString() || "",
      isActive: rule.isActive,
      notes: rule.notes || "",
    });
    setEditingRuleId(rule._id);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      state: "Tamil Nadu",
      zone: "LOCAL",
      baseWeight: "",
      basePrice: "",
      pricePerKg: "",
      minWeight: "",
      maxWeight: "",
      freeShippingThreshold: "",
      minOrderValue: "",
      isActive: true,
      notes: "",
    });
    setEditingRuleId(null);
    setShowForm(false);
  }

  async function handlePreviewShipping() {
    if (!previewWeight) {
      setError("Please enter a weight to preview");
      return;
    }

    try {
      setError("");
      const res = await apiClient.post("/admin/shipping-config/calculate-preview", {
        weight: parseFloat(previewWeight),
        state: "Tamil Nadu",
      });
      setPreviewResult(res.data);
    } catch (e) {
      setError(normalizeError(e));
    }
  }

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <BackButton />

        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shipping Configuration</h1>
              <p className="text-gray-600 mt-1">Manage weight-based shipping rules for Tamil Nadu zones</p>
            </div>
            <button
              onClick={() => (showForm ? resetForm() : setShowForm(true))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? "Cancel" : "+ Add Shipping Rule"}
            </button>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-gray-600 text-sm">Total Rules</p>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-gray-600 text-sm">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeRules}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-gray-600 text-sm">States Covered</p>
                <p className="text-2xl font-bold">{stats.coverage?.states || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-gray-600 text-sm">Zones Covered</p>
                <p className="text-2xl font-bold">{stats.coverage?.zones || 0}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingRuleId ? "Edit Shipping Rule" : "Create Shipping Rule"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Zone */}
                <div>
                  <label className="block text-sm font-medium mb-1">Zone *</label>
                  <select
                    name="zone"
                    value={formData.zone}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Base Weight */}
                <div>
                  <label className="block text-sm font-medium mb-1">Base Weight (kg) *</label>
                  <input
                    type="number"
                    name="baseWeight"
                    value={formData.baseWeight}
                    onChange={handleFormChange}
                    placeholder="e.g., 1"
                    step="0.1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Base Price */}
                <div>
                  <label className="block text-sm font-medium mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleFormChange}
                    placeholder="e.g., 50"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Price Per Kg */}
                <div>
                  <label className="block text-sm font-medium mb-1">Price Per Kg (₹) *</label>
                  <input
                    type="number"
                    name="pricePerKg"
                    value={formData.pricePerKg}
                    onChange={handleFormChange}
                    placeholder="e.g., 20"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Min Weight */}
                <div>
                  <label className="block text-sm font-medium mb-1">Min Weight (kg) *</label>
                  <input
                    type="number"
                    name="minWeight"
                    value={formData.minWeight}
                    onChange={handleFormChange}
                    placeholder="e.g., 0.1"
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Weight */}
                <div>
                  <label className="block text-sm font-medium mb-1">Max Weight (kg) *</label>
                  <input
                    type="number"
                    name="maxWeight"
                    value={formData.maxWeight}
                    onChange={handleFormChange}
                    placeholder="e.g., 5"
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Free Shipping Threshold */}
                <div>
                  <label className="block text-sm font-medium mb-1">Free Shipping Above (₹)</label>
                  <input
                    type="number"
                    name="freeShippingThreshold"
                    value={formData.freeShippingThreshold}
                    onChange={handleFormChange}
                    placeholder="e.g., 500"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Min Order Value */}
                <div>
                  <label className="block text-sm font-medium mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    name="minOrderValue"
                    value={formData.minOrderValue}
                    onChange={handleFormChange}
                    placeholder="e.g., 0"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Additional notes about this rule..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Active Status */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm">Active</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRule}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingRuleId ? "Update Rule" : "Create Rule"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Preview Shipping */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Preview Shipping Cost</h2>

            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={previewWeight}
                  onChange={(e) => setPreviewWeight(e.target.value)}
                  placeholder="Enter weight..."
                  step="0.1"
                  min="0.1"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handlePreviewShipping}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Calculate
              </button>
            </div>

            {previewResult && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold mb-3">Shipping Preview for {previewWeight}kg</h3>
                <div className="space-y-2">
                  {previewResult.previews && previewResult.previews.map((preview, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border border-gray-300">
                      <div className="flex justify-between">
                        <span className="font-medium">{preview.zone}</span>
                        <span className="font-bold text-green-600">₹{preview.cost.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Base: ₹{preview.breakdown.basePrice} (first {preview.breakdown.baseWeight}kg) + 
                        ₹{preview.breakdown.pricePerKg}/kg for {preview.breakdown.extraWeight.toFixed(2)}kg extra
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rules List */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Shipping Rules</h2>
            </div>

            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading rules...</div>
            ) : rules.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No shipping rules configured yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium">Zone</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Weight Range</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Base Price</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Per Kg</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-6 py-3 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <span className="font-medium">{rule.zone}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {rule.minWeight}kg - {rule.maxWeight}kg
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">₹{rule.basePrice}</td>
                        <td className="px-6 py-4 text-sm">₹{rule.pricePerKg}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              rule.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {rule.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
