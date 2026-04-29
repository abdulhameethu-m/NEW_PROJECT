import { useEffect, useState } from "react";
import * as pricingService from "../../services/pricingService";

/**
 * Pricing Rules Manager Component
 * Allows admins to create, edit, delete, and toggle pricing rules
 */
export function PricingRulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [filterActive, setFilterActive] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");

  const [formData, setFormData] = useState({
    key: "",
    displayName: "",
    type: "FIXED",
    value: 0,
    category: "OTHER",
    appliesTo: "ORDER",
    sortOrder: 0,
    maxCap: 0,
    minOrderValue: 0,
    freeAboveValue: 0,
    description: "",
    notes: "",
  });

  const categories = ["DELIVERY", "PLATFORM_FEE", "TAX", "HANDLING", "PACKAGING", "DISCOUNT", "OTHER"];

  // Load rules
  async function loadRules() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filterActive !== null) params.active = filterActive;
      if (filterCategory) params.category = filterCategory;

      const response = await pricingService.getAllPricingRules(params);
      setRules(response?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, [filterActive, filterCategory]);

  // Reset form
  function resetForm() {
    setFormData({
      key: "",
      displayName: "",
      type: "FIXED",
      value: 0,
      category: "OTHER",
      appliesTo: "ORDER",
      sortOrder: 0,
      maxCap: 0,
      minOrderValue: 0,
      freeAboveValue: 0,
      description: "",
      notes: "",
    });
    setEditingRule(null);
    setShowForm(false);
  }

  // Handle form submit
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (editingRule) {
        const response = await pricingService.updatePricingRule(editingRule._id, formData);
        setSuccess("Rule updated successfully!");
        setRules(rules.map((r) => (r._id === editingRule._id ? response.data : r)));
      } else {
        const response = await pricingService.createPricingRule(formData);
        setSuccess("Rule created successfully!");
        setRules([...rules, response.data]);
      }
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to save rule");
    }
  }

  // Edit rule
  function handleEdit(rule) {
    setEditingRule(rule);
    setFormData({
      key: rule.key,
      displayName: rule.displayName,
      type: rule.type,
      value: rule.value,
      category: rule.category,
      appliesTo: rule.appliesTo,
      sortOrder: rule.sortOrder,
      maxCap: rule.maxCap,
      minOrderValue: rule.minOrderValue,
      freeAboveValue: rule.freeAboveValue,
      description: rule.description,
      notes: rule.notes,
    });
    setShowForm(true);
  }

  // Delete rule
  async function handleDelete(rule) {
    if (!window.confirm(`Delete rule "${rule.displayName}"?`)) return;

    try {
      await pricingService.deletePricingRule(rule._id);
      setSuccess("Rule deleted successfully!");
      setRules(rules.filter((r) => r._id !== rule._id));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete rule");
    }
  }

  // Toggle active status
  async function handleToggleActive(rule) {
    try {
      await pricingService.updatePricingRule(rule._id, { isActive: !rule.isActive });
      setRules(
        rules.map((r) =>
          r._id === rule._id ? { ...r, isActive: !r.isActive } : r
        )
      );
      setSuccess(`Rule ${!rule.isActive ? "enabled" : "disabled"}!`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to toggle rule");
    }
  }

  // Format value display
  function formatValue(rule) {
    if (rule.type === "PERCENTAGE") {
      return `${rule.value}%`;
    }
    return `₹${rule.value.toFixed(2)}`;
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={filterActive === null ? "" : filterActive}
            onChange={(e) => setFilterActive(e.target.value === "" ? null : e.target.value === "true")}
            className="px-3 py-2 border rounded"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Add Rule"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 bg-gray-50 border rounded space-y-4">
          <h3 className="font-semibold text-lg">
            {editingRule ? "Edit Rule" : "Create New Pricing Rule"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Key (identifier)*</label>
              <input
                type="text"
                placeholder="e.g., delivery_fee"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                disabled={!!editingRule}
                className="w-full px-3 py-2 border rounded"
                required
              />
              <small className="text-gray-600">Lowercase, numbers and underscores only</small>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Display Name*</label>
              <input
                type="text"
                placeholder="e.g., Delivery Fee"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type*</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Value {formData.type === "PERCENTAGE" ? "(%)" : "(₹)"}*
              </label>
              <input
                type="number"
                min="0"
                max={formData.type === "PERCENTAGE" ? 100 : undefined}
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Applies To</label>
              <select
                value={formData.appliesTo}
                onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="ORDER">Per Order</option>
                <option value="ITEM">Per Item</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Cap (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.maxCap}
                onChange={(e) => setFormData({ ...formData, maxCap: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded"
              />
              <small className="text-gray-600">Max amount this rule can charge (0 = no cap)</small>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Min Order Value (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Free Above Value (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.freeAboveValue}
                onChange={(e) => setFormData({ ...formData, freeAboveValue: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded"
              />
              <small className="text-gray-600">Rule doesn't apply if order is above this value</small>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Explain what this rule does..."
              className="w-full px-3 py-2 border rounded"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Internal Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes for admins..."
              className="w-full px-3 py-2 border rounded"
              rows="2"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingRule ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      )}

      {/* Rules Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pricing rules found</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">Name</th>
                <th className="border p-3 text-left">Key</th>
                <th className="border p-3 text-left">Type</th>
                <th className="border p-3 text-left">Value</th>
                <th className="border p-3 text-left">Category</th>
                <th className="border p-3 text-left">Applies To</th>
                <th className="border p-3 text-left">Active</th>
                <th className="border p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule._id} className="hover:bg-gray-50">
                  <td className="border p-3">{rule.displayName}</td>
                  <td className="border p-3 font-mono text-sm">{rule.key}</td>
                  <td className="border p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {rule.type}
                    </span>
                  </td>
                  <td className="border p-3 font-medium">{formatValue(rule)}</td>
                  <td className="border p-3">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                      {rule.category}
                    </span>
                  </td>
                  <td className="border p-3 text-sm">{rule.appliesTo}</td>
                  <td className="border p-3">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`px-3 py-1 rounded text-white text-sm font-medium ${
                        rule.isActive ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 hover:bg-gray-500"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="border p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default PricingRulesManager;
