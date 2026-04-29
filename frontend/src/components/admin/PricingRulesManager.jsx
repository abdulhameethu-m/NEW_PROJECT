import { useEffect, useState } from "react";
import * as pricingService from "../../services/pricingService";

export function PricingRulesManager() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
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
    categoryId: "",
    appliesTo: "ORDER",
    sortOrder: 0,
    maxCap: 0,
    minOrderValue: 0,
    freeAboveValue: 0,
    description: "",
    notes: "",
  });

  function getOtherCategoryId(items = categories) {
    return items.find((item) => item.key === "OTHER")?._id || "";
  }

  function normalizeMessage(err, fallback) {
    return err?.response?.data?.message || err?.message || fallback;
  }

  async function loadRules() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filterActive !== null) params.active = filterActive;
      if (filterCategory) params.categoryId = filterCategory;

      const response = await pricingService.getAllPricingRules(params);
      setRules(response?.data || []);
    } catch (err) {
      setError(normalizeMessage(err, "Failed to load rules"));
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await pricingService.getPricingCategories();
      const items = Array.isArray(response?.data) ? response.data : [];
      setCategories(items);
      setFormData((current) => ({
        ...current,
        categoryId: current.categoryId || getOtherCategoryId(items),
      }));
    } catch (err) {
      setError(normalizeMessage(err, "Failed to load pricing categories"));
    }
  }

  useEffect(() => {
    loadRules();
  }, [filterActive, filterCategory]);

  useEffect(() => {
    loadCategories();
  }, []);

  function resetForm() {
    setFormData({
      key: "",
      displayName: "",
      type: "FIXED",
      value: 0,
      categoryId: getOtherCategoryId(),
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (editingRule) {
        const response = await pricingService.updatePricingRule(editingRule._id, formData);
        setSuccess("Rule updated successfully!");
        setRules(rules.map((rule) => (rule._id === editingRule._id ? response.data : rule)));
      } else {
        const response = await pricingService.createPricingRule(formData);
        setSuccess("Rule created successfully!");
        setRules([...rules, response.data]);
      }
      resetForm();
    } catch (err) {
      setError(normalizeMessage(err, "Failed to save rule"));
    }
  }

  function handleEdit(rule) {
    setEditingRule(rule);
    setFormData({
      key: rule.key,
      displayName: rule.displayName,
      type: rule.type,
      value: rule.value,
      categoryId: rule.categoryId?._id || rule.categoryId || getOtherCategoryId(),
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

  async function handleDelete(rule) {
    if (!window.confirm(`Delete rule "${rule.displayName}"?`)) return;

    try {
      await pricingService.deletePricingRule(rule._id);
      setSuccess("Rule deleted successfully!");
      setRules(rules.filter((item) => item._id !== rule._id));
    } catch (err) {
      setError(normalizeMessage(err, "Failed to delete rule"));
    }
  }

  async function handleToggleActive(rule) {
    try {
      await pricingService.updatePricingRule(rule._id, { isActive: !rule.isActive });
      setRules(rules.map((item) => (item._id === rule._id ? { ...item, isActive: !item.isActive } : item)));
      setSuccess(`Rule ${!rule.isActive ? "enabled" : "disabled"}!`);
    } catch (err) {
      setError(normalizeMessage(err, "Failed to toggle rule"));
    }
  }

  function formatValue(rule) {
    if (rule.type === "PERCENTAGE") {
      return `${rule.value}%`;
    }
    return `Rs. ${Number(rule.value || 0).toFixed(2)}`;
  }

  function getCategoryLabel(rule) {
    if (rule.categoryId?.name) return rule.categoryId.name;
    const selectedCategoryId = rule.categoryId?._id || rule.categoryId || "";
    return categories.find((item) => item._id === selectedCategoryId)?.name || rule.category || "Other";
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {success ? <div className="rounded border border-green-200 bg-green-50 p-4 text-green-700">{success}</div> : null}

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select
            value={filterActive === null ? "" : filterActive}
            onChange={(e) => setFilterActive(e.target.value === "" ? null : e.target.value === "true")}
            className="rounded border px-3 py-2"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Add Rule"}
          </button>
        </div>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded border bg-gray-50 p-6">
          <h3 className="text-lg font-semibold">{editingRule ? "Edit Rule" : "Create New Pricing Rule"}</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Key (identifier)*</label>
              <input
                type="text"
                placeholder="e.g., delivery_fee"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                disabled={Boolean(editingRule)}
                className="w-full rounded border px-3 py-2"
                required
              />
              <small className="text-gray-600">Lowercase, numbers and underscores only</small>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Display Name*</label>
              <input
                type="text"
                placeholder="e.g., Delivery Fee"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Type*</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded border px-3 py-2"
              >
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Value {formData.type === "PERCENTAGE" ? "(%)" : "(Rs.)"}*</label>
              <input
                type="number"
                min="0"
                max={formData.type === "PERCENTAGE" ? 100 : undefined}
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded border px-3 py-2"
              >
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Applies To</label>
              <select
                value={formData.appliesTo}
                onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                className="w-full rounded border px-3 py-2"
              >
                <option value="ORDER">Per Order</option>
                <option value="ITEM">Per Item</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Sort Order</label>
              <input
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Max Cap (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.maxCap}
                onChange={(e) => setFormData({ ...formData, maxCap: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border px-3 py-2"
              />
              <small className="text-gray-600">Max amount this rule can charge (0 = no cap)</small>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Min Order Value (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Free Above Value (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.freeAboveValue}
                onChange={(e) => setFormData({ ...formData, freeAboveValue: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border px-3 py-2"
              />
              <small className="text-gray-600">Rule does not apply if order is above this value</small>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Explain what this rule does..."
              className="w-full rounded border px-3 py-2"
              rows="2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Internal Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes for admins..."
              className="w-full rounded border px-3 py-2"
              rows="2"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded border px-4 py-2 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              {editingRule ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      ) : null}

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
                    <span className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-800">{rule.type}</span>
                  </td>
                  <td className="border p-3 font-medium">{formatValue(rule)}</td>
                  <td className="border p-3">
                    <span className="rounded bg-purple-100 px-2 py-1 text-sm text-purple-800">{getCategoryLabel(rule)}</span>
                  </td>
                  <td className="border p-3 text-sm">{rule.appliesTo}</td>
                  <td className="border p-3">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`rounded px-3 py-1 text-sm font-medium text-white ${
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
                        className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule)}
                        className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
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
