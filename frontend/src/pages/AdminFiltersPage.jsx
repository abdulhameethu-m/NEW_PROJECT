import { useCallback, useEffect, useMemo, useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { getSubcategoriesByCategory } from "../services/subcategoryService";
import {
  createAdminFilter,
  deleteAdminFilter,
  listAdminFilters,
  updateAdminFilter,
} from "../services/filterService";
import { useAdminSession } from "../hooks/useAdminSession";

const initialForm = {
  name: "",
  key: "",
  type: "select",
  options: "",
  categoryIds: [],
  subCategoryIds: [],
  unit: "",
  placeholder: "",
  order: 0,
  isActive: true,
  rangeMin: 0,
  rangeMax: 100000,
  rangeStep: 1,
};

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

function getMultiSelectValues(event) {
  return Array.from(event.target.selectedOptions).map((option) => option.value);
}

export function AdminFiltersPage() {
  const { categories } = useCategories({ includeInactive: true });
  const { canAccess } = useAdminSession();
  const canCreate = canAccess("filters.create");
  const canUpdate = canAccess("filters.update");
  const canDelete = canAccess("filters.delete");

  const [filters, setFilters] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visibleSubcategories = useMemo(
    () => subcategories.filter((item) => form.categoryIds.includes(item.categoryId?._id || item.categoryId)),
    [form.categoryIds, subcategories]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const filterRes = await listAdminFilters();
      setFilters(Array.isArray(filterRes?.data) ? filterRes.data : []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!form.categoryIds.length) {
      setSubcategories([]);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const responses = await Promise.all(
          form.categoryIds.map((categoryId) => getSubcategoriesByCategory(categoryId))
        );
        if (!alive) return;
        const merged = responses.flatMap((response) => (Array.isArray(response?.data) ? response.data : []));
        const unique = merged.filter(
          (item, index, items) => index === items.findIndex((candidate) => candidate._id === item._id)
        );
        setSubcategories(unique);
      } catch {
        if (alive) setSubcategories([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [form.categoryIds]);

  function resetForm() {
    setEditingId("");
    setForm(initialForm);
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      key: item.key || "",
      type: item.type || "select",
      options: (item.options || []).join(", "),
      categoryIds: (item.categoryIds || []).map((entry) => entry?._id || entry),
      subCategoryIds: (item.subCategoryIds || []).map((entry) => entry?._id || entry),
      unit: item.unit || "",
      placeholder: item.placeholder || "",
      order: item.order || 0,
      isActive: item.isActive !== false,
      rangeMin: item.rangeConfig?.min ?? 0,
      rangeMax: item.rangeConfig?.max ?? 100000,
      rangeStep: item.rangeConfig?.step ?? 1,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        key: form.key,
        type: form.type,
        options: form.options
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        categoryIds: form.categoryIds,
        subCategoryIds: form.subCategoryIds,
        unit: form.unit,
        placeholder: form.placeholder,
        order: Number(form.order || 0),
        isActive: form.isActive,
        rangeConfig: {
          min: Number(form.rangeMin || 0),
          max: Number(form.rangeMax || 0),
          step: Number(form.rangeStep || 1),
        },
      };

      if (editingId) {
        await updateAdminFilter(editingId, payload);
      } else {
        await createAdminFilter(payload);
      }

      resetForm();
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this filter?")) return;
    try {
      await deleteAdminFilter(id);
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.9fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Dynamic filters</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create category-aware facet definitions once and reuse them across admin, vendor, and storefront flows.
            </p>
          </div>
          <button type="button" onClick={refresh} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            Refresh
          </button>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Loading filters...</div>
          ) : filters.length ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filters.map((item) => (
                <div key={item._id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-slate-950 dark:text-white">{item.name}</div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.key}
                      </span>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {item.type}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Categories: {(item.categoryIds || []).map((entry) => entry?.name || entry).join(", ") || "None"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Subcategories: {(item.subCategoryIds || []).map((entry) => entry?.name || entry).join(", ") || "All subcategories"}
                    </div>
                    {item.type === "range" ? (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Range: {item.rangeConfig?.min ?? 0} - {item.rangeConfig?.max ?? 0} {item.unit || ""}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Options: {(item.options || []).join(", ") || "None"}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      disabled={!canUpdate}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id)}
                      disabled={!canDelete}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">No filters created yet.</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{editingId ? "Edit filter" : "Create filter"}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Assign a filter once to one or many categories and optionally narrow it to specific subcategories.
            </p>
          </div>
          <button type="button" onClick={resetForm} className="text-sm font-medium text-slate-600 hover:underline">
            Reset
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            disabled={!canCreate && !editingId}
          />
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Key (e.g. ram)"
            value={form.key}
            onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
            required
            disabled={Boolean(editingId)}
          />
          <select className="rounded-xl border px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
            {["select", "checkbox", "range", "color"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {form.type === "range" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <input className="rounded-xl border px-3 py-2 text-sm" type="number" value={form.rangeMin} onChange={(e) => setForm((prev) => ({ ...prev, rangeMin: e.target.value }))} placeholder="Range min" />
              <input className="rounded-xl border px-3 py-2 text-sm" type="number" value={form.rangeMax} onChange={(e) => setForm((prev) => ({ ...prev, rangeMax: e.target.value }))} placeholder="Range max" />
              <input className="rounded-xl border px-3 py-2 text-sm" type="number" min="1" value={form.rangeStep} onChange={(e) => setForm((prev) => ({ ...prev, rangeStep: e.target.value }))} placeholder="Step" />
            </div>
          ) : (
            <textarea
              className="rounded-xl border px-3 py-2 text-sm"
              rows={3}
              placeholder="Options (comma separated)"
              value={form.options}
              onChange={(e) => setForm((prev) => ({ ...prev, options: e.target.value }))}
            />
          )}

          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Unit (optional)" value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Placeholder (optional)" value={form.placeholder} onChange={(e) => setForm((prev) => ({ ...prev, placeholder: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" type="number" min="0" value={form.order} onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))} placeholder="Order" />

          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Categories
            <select
              multiple
              className="mt-1 min-h-32 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.categoryIds}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryIds: getMultiSelectValues(e), subCategoryIds: [] }))}
              required
            >
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Subcategories
            <select
              multiple
              className="mt-1 min-h-32 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.subCategoryIds}
              onChange={(e) => setForm((prev) => ({ ...prev, subCategoryIds: getMultiSelectValues(e) }))}
            >
              {visibleSubcategories.map((subcategory) => (
                <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
            Active
          </label>

          <button
            type="submit"
            disabled={saving || (!editingId && !canCreate) || (editingId && !canUpdate)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update filter" : "Create filter"}
          </button>
        </form>
      </section>
    </div>
  );
}
