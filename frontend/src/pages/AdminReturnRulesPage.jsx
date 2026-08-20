import { useCallback, useEffect, useState } from "react";
import { listCategories } from "../services/adminApi";
import { listAdminSubcategories } from "../services/subcategoryService";
import { getReturnRules, createReturnRule, updateReturnRule, deleteReturnRule } from "../services/returnRule.service";

const initialForm = {
  categoryId: "",
  subCategoryId: "",
  ruleType: "returnable",
  returnDays: 7,
};

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export default function AdminReturnRulesPage() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catsRes, subcatsRes, rulesRes] = await Promise.all([
        listCategories().catch(() => null),
        listAdminSubcategories().catch(() => null),
        getReturnRules().catch(() => null),
      ]);

      if (catsRes?.data) setCategories(catsRes.data);
      if (subcatsRes?.data) setSubcategories(subcatsRes.data);
      if (rulesRes?.data) setRules(rulesRes.data);
    } catch (err) {
      setError(normalizeError(err));
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

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    if (form.ruleType === "returnable" && (!form.returnDays || form.returnDays <= 0)) {
      setError("Return days must be greater than 0");
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await updateReturnRule(editingId, {
          ruleType: form.ruleType,
          returnDays: form.returnDays,
        });
      } else {
        await createReturnRule(form);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(rule) {
    setEditingId(rule._id);
    setError("");
    setForm({
      categoryId: rule.categoryId?._id || rule.categoryId,
      subCategoryId: rule.subCategoryId?._id || rule.subCategoryId,
      ruleType: rule.ruleType || "returnable",
      returnDays: rule.returnDays || 7,
    });
  }

  const filteredSubcategories = subcategories.filter(s => (s.categoryId?._id || s.categoryId) === form.categoryId);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr] bg-white dark:bg-slate-950">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Return Rules</h2>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Define return policies per category and subcategory.
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
          ) : rules.length ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {rules.map((rule) => (
                <div key={rule._id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900 dark:text-white">
                      {rule.categoryId?.name} &gt; {rule.subCategoryId?.name}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {rule.ruleType === "no_return" ? (
                      <span className="text-rose-600 dark:text-rose-400">No Return</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">Returnable ({rule.returnDays} days)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => startEditing(rule)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // eslint-disable-next-line no-alert
                        if (!window.confirm("Delete this return rule?")) return;
                        try {
                          await deleteReturnRule(rule._id);
                          await refresh();
                        } catch (err) {
                          setError(normalizeError(err));
                        }
                      }}
                      className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No return rules created yet.</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{editingId ? "Edit return rule" : "Create return rule"}</h2>
        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</span>
            <select
              value={form.categoryId}
              disabled={!!editingId || loading}
              onChange={(e) => setForm(c => ({...c, categoryId: e.target.value, subCategoryId: ""}))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white disabled:opacity-50"
              required
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Subcategory</span>
            <select
              value={form.subCategoryId}
              disabled={!!editingId || !form.categoryId || loading}
              onChange={(e) => setForm(c => ({...c, subCategoryId: e.target.value}))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white disabled:opacity-50"
              required
            >
              <option value="">Select Subcategory</option>
              {filteredSubcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Rule Type</span>
            <select
              value={form.ruleType}
              onChange={(e) => setForm(c => ({...c, ruleType: e.target.value}))}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="returnable">Returnable</option>
              <option value="no_return">No Return</option>
            </select>
          </label>

          {form.ruleType === "returnable" && (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Return Days</span>
              <input
                type="number"
                min="1"
                value={form.returnDays}
                onChange={(e) => setForm(c => ({...c, returnDays: parseInt(e.target.value) || 0}))}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                required
              />
            </label>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {saving ? "Saving..." : editingId ? "Update rule" : "Create rule"}
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
