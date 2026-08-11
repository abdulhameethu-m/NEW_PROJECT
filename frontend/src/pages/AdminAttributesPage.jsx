import { useCallback, useEffect, useMemo, useState } from "react";
import { confirmAction } from "../services/notificationService";
import { useCategories } from "../hooks/useCategories";
import { getSubcategoriesByCategory } from "../services/subcategoryService";
import { listAdminProductModules } from "../services/productModuleService";
import {
  createAdminAttribute,
  deleteAdminAttribute,
  listAdminAttributes,
  updateAdminAttribute,
} from "../services/attributeService";

const initialForm = {
  name: "",
  key: "",
  type: "text",
  required: false,
  isVariant: false,
  useInFilters: false,
  variantDisplayType: "button",
  variantAffectsImage: false,
  options: "",
  moduleKey: "",
  order: 0,
  categoryId: "",
  subCategoryId: "",
  template: "",
  isActive: true,
  // Multi-select state (only for create mode)
  categoryIds: [],
  subCategoryIds: [],
};

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function AdminAttributesPage() {
  const { categories } = useCategories({ includeInactive: true });
  const [subcategoriesMap, setSubcategoriesMap] = useState({});
  const [attributes, setAttributes] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeModuleFilter, setActiveModuleFilter] = useState("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);

  const modulesByKey = useMemo(
    () => Object.fromEntries(modules.map((moduleDef) => [moduleDef.key, moduleDef])),
    [modules]
  );

  const groupedAttributes = useMemo(() => {
    const grouped = {};
    for (const item of attributes) {
      const moduleKey = item.moduleKey || "unassigned";
      if (activeModuleFilter !== "all" && moduleKey !== activeModuleFilter) continue;
      if (!grouped[moduleKey]) grouped[moduleKey] = [];
      grouped[moduleKey].push(item);
    }
    return grouped;
  }, [activeModuleFilter, attributes]);

  const visibleModuleKeys = useMemo(() => {
    const orderedKeys = modules.map((moduleDef) => moduleDef.key);
    const extraKeys = Object.keys(groupedAttributes).filter((key) => !orderedKeys.includes(key));
    return [...orderedKeys, ...extraKeys].filter((key) => groupedAttributes[key]?.length);
  }, [groupedAttributes, modules]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [attributeRes, moduleRes] = await Promise.all([listAdminAttributes(), listAdminProductModules()]);
      setAttributes(Array.isArray(attributeRes?.data) ? attributeRes.data : []);
      setModules(Array.isArray(moduleRes?.data) ? moduleRes.data : []);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derive a stable key for the current category selection
  const categoryLoadKey = editingId ? form.categoryId : form.categoryIds.join(",");

  // Load subcategories for all selected categories
  useEffect(() => {
    let cancelled = false;
    async function loadAllSubcategories() {
      const catIds = editingId ? [form.categoryId].filter(Boolean) : form.categoryIds;
      if (!catIds.length) return;

      const newMap = {};
      for (const catId of catIds) {
        if (subcategoriesMap[catId]) {
          newMap[catId] = subcategoriesMap[catId];
          continue;
        }
        try {
          const res = await getSubcategoriesByCategory(catId);
          if (!cancelled) {
            newMap[catId] = Array.isArray(res?.data) ? res.data : [];
          }
        } catch {
          if (!cancelled) {
            newMap[catId] = [];
          }
        }
      }
      if (!cancelled) setSubcategoriesMap((prev) => ({ ...prev, ...newMap }));
    }
    loadAllSubcategories();
    return () => { cancelled = true; };
  }, [categoryLoadKey]);

  // All subcategories for the selected categories
  const availableSubcategories = useMemo(() => {
    if (editingId) {
      return subcategoriesMap[form.categoryId] || [];
    }
    const subs = [];
    const seen = new Set();
    for (const catId of form.categoryIds) {
      for (const sub of (subcategoriesMap[catId] || [])) {
        if (!seen.has(sub._id)) {
          seen.add(sub._id);
          subs.push({ ...sub, _categoryName: categories.find(c => c._id === catId)?.name || "" });
        }
      }
    }
    return subs;
  }, [editingId, form.categoryId, form.categoryIds, subcategoriesMap, categories]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const basePayload = {
        name: form.name,
        key: form.key,
        type: form.type,
        required: form.required,
        isVariant: form.isVariant,
        useInFilters: form.useInFilters,
        variantConfig: {
          displayType: form.variantDisplayType,
          affectsImage: form.variantAffectsImage,
        },
        options: form.options
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        moduleKey: form.moduleKey,
        order: Number(form.order || 0),
        template: form.template,
        isActive: form.isActive,
      };

      if (editingId) {
        // Single update (editing existing attribute)
        const payload = {
          ...basePayload,
          appliesTo: {
            categoryId: form.categoryId,
            subCategoryId: form.subCategoryId || null,
          },
        };
        await updateAdminAttribute(editingId, payload);
      } else {
        // Batch create for all selected category + subcategory combos
        const catIds = form.categoryIds.length ? form.categoryIds : [];
        if (!catIds.length) {
          setError("Please select at least one category");
          setSaving(false);
          return;
        }

        const subIds = form.subCategoryIds;
        const combos = [];

        for (const catId of catIds) {
          if (subIds.length) {
            // Only include subcategories that belong to this category
            const catSubs = (subcategoriesMap[catId] || []).map(s => s._id);
            const matchingSubs = subIds.filter(sid => catSubs.includes(sid));
            if (matchingSubs.length) {
              for (const subId of matchingSubs) {
                combos.push({ categoryId: catId, subCategoryId: subId });
              }
            } else {
              // No matching subs for this category — apply to all subcategories (null)
              combos.push({ categoryId: catId, subCategoryId: null });
            }
          } else {
            // No subcategory selected — apply to all subcategories
            combos.push({ categoryId: catId, subCategoryId: null });
          }
        }

        const results = await Promise.allSettled(
          combos.map((combo) =>
            createAdminAttribute({
              ...basePayload,
              appliesTo: combo,
            })
          )
        );

        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length) {
          const msgs = failures.map(f => normalizeError(f.reason));
          const uniqueMsgs = [...new Set(msgs)];
          if (failures.length < combos.length) {
            setError(`${combos.length - failures.length} created, ${failures.length} failed: ${uniqueMsgs.join("; ")}`);
          } else {
            setError(`All ${failures.length} failed: ${uniqueMsgs.join("; ")}`);
          }
        }
      }

      setEditingId("");
      setForm(initialForm);
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      key: item.key || "",
      type: item.type || "text",
      required: Boolean(item.required),
      isVariant: Boolean(item.isVariant),
      useInFilters: Boolean(item.useInFilters),
      variantDisplayType: item.variantConfig?.displayType || "button",
      variantAffectsImage: Boolean(item.variantConfig?.affectsImage),
      options: (item.options || []).join(", "),
      moduleKey: item.moduleKey || "",
      order: item.order || 0,
      categoryId: item.appliesTo?.categoryId?._id || item.appliesTo?.categoryId || "",
      subCategoryId: item.appliesTo?.subCategoryId?._id || item.appliesTo?.subCategoryId || "",
      template: item.template || "",
      isActive: item.isActive !== false,
      categoryIds: [],
      subCategoryIds: [],
    });
  }

  async function handleDelete(id) {
    if (!(await confirmAction({ message: "Delete this attribute?", tone: "danger", confirmLabel: "Confirm" }))) return;
    try {
      await deleteAdminAttribute(id);
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  function toggleCategoryId(catId) {
    setForm((prev) => {
      const next = prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter((id) => id !== catId)
        : [...prev.categoryIds, catId];
      // When removing a category, also remove its subcategories from selection
      if (!next.includes(catId)) {
        const catSubs = (subcategoriesMap[catId] || []).map(s => s._id);
        return { ...prev, categoryIds: next, subCategoryIds: prev.subCategoryIds.filter(sid => !catSubs.includes(sid)) };
      }
      return { ...prev, categoryIds: next };
    });
  }

  function toggleSubCategoryId(subId) {
    setForm((prev) => ({
      ...prev,
      subCategoryIds: prev.subCategoryIds.includes(subId)
        ? prev.subCategoryIds.filter((id) => id !== subId)
        : [...prev.subCategoryIds, subId],
    }));
  }

  function toggleAllCategories() {
    setForm((prev) => {
      if (prev.categoryIds.length === categories.length) {
        return { ...prev, categoryIds: [], subCategoryIds: [] };
      }
      return { ...prev, categoryIds: categories.map((c) => c._id) };
    });
  }

  function toggleAllSubcategories() {
    setForm((prev) => {
      const allIds = availableSubcategories.map((s) => s._id);
      if (prev.subCategoryIds.length === allIds.length) {
        return { ...prev, subCategoryIds: [] };
      }
      return { ...prev, subCategoryIds: allIds };
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Module-driven fields</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create fields in the attributes tab and classify them by module using the module names at the top.
        </p>
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        ) : null}
        {modules.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveModuleFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeModuleFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              All
            </button>
            {modules.map((moduleDef) => (
              <button
                type="button"
                key={moduleDef._id}
                onClick={() => setActiveModuleFilter(moduleDef.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  activeModuleFilter === moduleDef.key
                    ? "bg-slate-900 text-white"
                    : moduleDef.isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {moduleDef.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No modules found. Create modules in `/admin/product-modules` first, then attach fields here.
          </div>
        )}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Loading...</div>
          ) : visibleModuleKeys.length ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleModuleKeys.map((moduleKey) => {
                const moduleDef = modulesByKey[moduleKey];
                const items = groupedAttributes[moduleKey] || [];
                return (
                  <div key={moduleKey}>
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                      {moduleDef?.name || items[0]?.group || moduleKey}
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {items.map((item) => (
                        <div key={item._id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">
                              {item.name} ({item.key})
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {item.type} • {item.isVariant ? `Variant / ${item.variantConfig?.displayType || "button"}` : "Standard field"} •{" "}
                              {item.useInFilters ? "Filter systems enabled" : "Filter systems disabled"} •{" "}
                              {item.appliesTo?.categoryId?.name || "Category"} / {item.appliesTo?.subCategoryId?.name || "All subcategories"}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEdit(item)} className="rounded-xl border px-3 py-1 text-xs">
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDelete(item._id)} className="rounded-xl border px-3 py-1 text-xs text-rose-700">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">No fields found for the selected module.</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{editingId ? "Edit field" : "Create field"}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {editingId
            ? "Update this field's configuration."
            : "Choose the destination module, then define the reusable field once for multiple categories and subcategories."}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="e.g. Color" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Key</label>
            <input className="rounded-xl border px-3 py-2 text-sm w-full" placeholder="e.g. color, ram, screen_size" value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_,]/g, "") }))} required />
            <p className="text-xs text-slate-400">Lowercase letters, numbers, underscores, and commas allowed.</p>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Module</label>
            <select className="rounded-xl border px-3 py-2 text-sm" value={form.moduleKey} onChange={(e) => setForm((p) => ({ ...p, moduleKey: e.target.value }))} required>
              <option value="">{modules.length ? "Select module" : "Create a module first"}</option>
              {modules.map((moduleDef) => (
                <option key={moduleDef._id} value={moduleDef.key}>
                  {moduleDef.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
            <select className="rounded-xl border px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              {["text", "number", "select", "multi-select", "boolean", "color"].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Options (comma separated)</label>
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="e.g. Red, Blue, Green" value={form.options} onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isVariant} onChange={(e) => setForm((p) => ({ ...p, isVariant: e.target.checked }))} />
            Use as variant type
          </label>
          <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Filter systems</div>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.useInFilters} onChange={(e) => setForm((p) => ({ ...p, useInFilters: e.target.checked }))} />
              Enable this field in dynamic storefront filters
            </label>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Only attributes with this flag enabled will appear as storefront filters for the selected scope.
            </p>
          </div>
          {form.isVariant ? (
            <>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Variant Display Type</label>
                <select className="rounded-xl border px-3 py-2 text-sm" value={form.variantDisplayType} onChange={(e) => setForm((p) => ({ ...p, variantDisplayType: e.target.value }))}>
                  {["button", "swatch", "image-swatch"].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.variantAffectsImage} onChange={(e) => setForm((p) => ({ ...p, variantAffectsImage: e.target.checked }))} />
                Variant changes image gallery
              </label>
            </>
          ) : null}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Template</label>
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="e.g. {{value}}GB" value={form.template} onChange={(e) => setForm((p) => ({ ...p, template: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Order</label>
            <input className="rounded-xl border px-3 py-2 text-sm" type="number" min="0" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} />
          </div>

          {/* Category & Subcategory Selection */}
          {editingId ? (
            <>
              {/* Single select for edit mode */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                <select className="rounded-xl border px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value, subCategoryId: "" }))} required>
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subcategory</label>
                <select className="rounded-xl border px-3 py-2 text-sm" value={form.subCategoryId} onChange={(e) => setForm((p) => ({ ...p, subCategoryId: e.target.value }))}>
                  <option value="">All subcategories</option>
                  {availableSubcategories.map((subcategory) => (
                    <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Multi-select checkbox panel for categories */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 dark:bg-slate-950">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Categories
                    {form.categoryIds.length > 0 && (
                      <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                        {form.categoryIds.length}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={toggleAllCategories}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {form.categoryIds.length === categories.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {categories.map((category) => {
                    const checked = form.categoryIds.includes(category._id);
                    return (
                      <label
                        key={category._id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          checked ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategoryId(category._id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`${checked ? "font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                          {category.name}
                        </span>
                      </label>
                    );
                  })}
                  {!categories.length && (
                    <div className="px-4 py-3 text-xs text-slate-500">No categories available</div>
                  )}
                </div>
              </div>

              {/* Multi-select checkbox panel for subcategories */}
              {form.categoryIds.length > 0 && availableSubcategories.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 dark:bg-slate-950">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Subcategories
                      {form.subCategoryIds.length > 0 && (
                        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                          {form.subCategoryIds.length}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={toggleAllSubcategories}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      {form.subCategoryIds.length === availableSubcategories.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {availableSubcategories.map((sub) => {
                      const checked = form.subCategoryIds.includes(sub._id);
                      return (
                        <label
                          key={sub._id}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            checked ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSubCategoryId(sub._id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={`${checked ? "font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                            {sub.name}
                          </span>
                          {sub._categoryName && (
                            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{sub._categoryName}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    Leave empty to apply to all subcategories
                  </div>
                </div>
              )}

              {form.categoryIds.length > 0 && (
                <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                  Will create {form.categoryIds.length} attribute{form.categoryIds.length > 1 ? "s" : ""}
                  {form.subCategoryIds.length > 0 && ` × ${form.subCategoryIds.length} subcategor${form.subCategoryIds.length > 1 ? "ies" : "y"}`}
                  {" "}on submit
                </div>
              )}
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.required} onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))} />
            Required
          </label>
          <button type="submit" disabled={saving || !modules.length} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Update field" : "Create field"}
          </button>
        </form>
      </section>
    </div>
  );
}
