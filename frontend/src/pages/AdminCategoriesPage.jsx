import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory as createAdminCategory,
  listCategories,
  toggleCategory,
  updateCategory,
} from "../services/adminApi";
import * as categoryService from "../services/categoryService";

const initialForm = {
  name: "",
  code: "",
  slug: "",
  icon: "",
  logo: "",
  color: "",
  order: 0,
  isActive: true,
};

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
    [categories]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listCategories();
      setCategories(response?.data || []);
    } catch {
      try {
        const fallback = await categoryService.getCategories();
        setCategories(fallback?.data || []);
        setError("");
      } catch (fallbackError) {
        setError(normalizeError(fallbackError));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function resetForm() {
    setEditingId("");
    setForm(initialForm);
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result;
      setForm((current) => ({ ...current, logo: base64String }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await createAdminCategory(form);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(category) {
    try {
      await toggleCategory(category._id, !category.isActive);
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  function startEditing(category) {
    setEditingId(category._id);
    setForm({
      name: category.name || "",
      code: category.code || "",
      slug: category.slug || "",
      icon: category.icon || "",
      logo: category.logo || "",
      color: category.color || "",
      order: category.order || 0,
      isActive: category.isActive !== false,
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr] bg-white dark:bg-slate-950">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Category management</h2>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Homepage and product forms use categories from the database. Disabled categories stay hidden automatically.
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          {loading ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : sortedCategories.length ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {sortedCategories.map((category) => (
                <div key={category._id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.2fr_.8fr_.7fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg dark:bg-slate-800 overflow-hidden">
                        {category.logo ? (
                          <img src={category.logo} alt={category.name} className="h-full w-full object-cover" />
                        ) : (
                          category.icon || category.name?.charAt(0) || "C"
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900 dark:text-white">{category.name}</div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {category.code || "-"} • {category.slug}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{category.color || "Auto palette"}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">Order {category.order ?? 0}</div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => startEditing(category)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(category)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium ${
                        category.isActive
                          ? "border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {category.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No categories created yet.</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{editingId ? "Edit category" : "Create category"}</h2>
        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Code</span>
            <input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="E"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Slug</span>
            <input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Optional"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Icon override</span>
              <input
                value={form.icon}
                onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Optional"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Order</span>
              <input
                type="number"
                min="0"
                value={form.order}
                onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value || 0) }))}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Category Logo</span>
            <div className="flex items-center gap-3">
              {form.logo ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                  <img src={form.logo} alt="Category logo preview" className="max-h-full max-w-full rounded" />
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Gradient classes</span>
            <input
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Optional, e.g. from-blue-500 to-cyan-500"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Visible on storefront</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {saving ? "Saving..." : editingId ? "Update category" : "Create category"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
