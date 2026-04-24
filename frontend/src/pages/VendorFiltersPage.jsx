import { useEffect, useMemo, useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { getSubcategoriesByCategory } from "../services/subcategoryService";
import { getFilters } from "../services/filterService";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function VendorFiltersPage() {
  const { categories } = useCategories();
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subcategories, setSubcategories] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubCategoryId("");
      return;
    }

    let alive = true;
    (async () => {
      try {
        const response = await getSubcategoriesByCategory(categoryId);
        if (!alive) return;
        setSubcategories(Array.isArray(response?.data) ? response.data : []);
      } catch {
        if (alive) setSubcategories([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) {
      setFilters([]);
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const response = await getFilters({ categoryId, subCategoryId: subCategoryId || undefined });
        if (!alive) return;
        setFilters(Array.isArray(response?.data) ? response.data : []);
        setError("");
      } catch (err) {
        if (alive) {
          setFilters([]);
          setError(normalizeError(err));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [categoryId, subCategoryId]);

  const grouped = useMemo(() => {
    return filters.reduce((acc, item) => {
      const group = item.type;
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {});
  }, [filters]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Catalog filters</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Review the exact storefront filters active for each category before creating or updating products.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <select className="rounded-xl border px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
          <select className="rounded-xl border px-3 py-2 text-sm" value={subCategoryId} onChange={(e) => setSubCategoryId(e.target.value)} disabled={!categoryId}>
            <option value="">All subcategories</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>
            ))}
          </select>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-6 grid gap-4">
          {!categoryId ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Select a category to inspect its active storefront filters.
            </div>
          ) : loading ? (
            <div className="text-sm text-slate-500">Loading filters...</div>
          ) : filters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No filters are mapped to this scope yet.
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {items.map((item) => (
                    <div key={item._id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                      <div className="font-semibold text-slate-950 dark:text-white">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.key}</div>
                      {item.type === "range" ? (
                        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                          {item.rangeConfig?.min ?? 0} - {item.rangeConfig?.max ?? 0} {item.unit || ""}
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(item.options || []).map((option) => (
                            <span key={option} className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                              {option}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
