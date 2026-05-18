import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { listCategories, listProducts, listSellers, listSubcategories } from "../services/adminApi";
import { MultiSelect } from "../components/MultiSelect";
import {
  createAdminHomepageContainer,
  deleteAdminHomepageContainer,
  listAdminHomepageContainers,
  previewAdminHomepageContainer,
  reorderAdminHomepageContainers,
  updateAdminHomepageContainer,
} from "../services/homepageContainerService";

const initialForm = {
  title: "",
  slug: "",
  description: "",
  bannerImage: "",
  containerType: "PRODUCT_CAROUSEL",
  vendorMode: "ALL_VENDORS",
  vendorIds: [],
  categoryIds: [],
  subCategoryIds: [],
  brandIds: "",
  tags: "",
  offerType: "NONE",
  minDiscountPercentage: 0,
  maxDiscountPercentage: "",
  minPrice: "",
  maxPrice: "",
  sortBy: "TRENDING",
  productSelectionMode: "AUTO",
  manualProductIds: [],
  maxProductsToShow: 12,
  priority: 0,
  scheduleEnabled: false,
  startDate: "",
  endDate: "",
  deviceVisibility: "ALL",
  showOnlyInStock: true,
  showOnlyActiveProducts: true,
  analyticsEnabled: true,
  status: "ACTIVE",
};

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

function slugify(value = "") {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMultiSelectValues(event) {
  return Array.from(event.target.selectedOptions || []).map((option) => option.value);
}

function buildPayload(form) {
  return {
    title: form.title,
    slug: form.slug || slugify(form.title),
    description: form.description,
    bannerImage: form.bannerImage,
    containerType: form.containerType,
    vendorMode: form.vendorMode,
    vendorIds: form.vendorIds,
    categoryIds: form.categoryIds,
    subCategoryIds: form.subCategoryIds,
    brandIds: form.brandIds.split(",").map((item) => item.trim()).filter(Boolean),
    tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
    offerType: form.offerType,
    minDiscountPercentage: Number(form.minDiscountPercentage || 0),
    maxDiscountPercentage: form.maxDiscountPercentage === "" ? null : Number(form.maxDiscountPercentage),
    minPrice: form.minPrice === "" ? null : Number(form.minPrice),
    maxPrice: form.maxPrice === "" ? null : Number(form.maxPrice),
    sortBy: form.sortBy,
    productSelectionMode: form.productSelectionMode,
    manualProductIds: form.manualProductIds,
    maxProductsToShow: Number(form.maxProductsToShow || 12),
    priority: Number(form.priority || 0),
    scheduleEnabled: Boolean(form.scheduleEnabled),
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    deviceVisibility: form.deviceVisibility,
    showOnlyInStock: Boolean(form.showOnlyInStock),
    showOnlyActiveProducts: Boolean(form.showOnlyActiveProducts),
    analyticsEnabled: Boolean(form.analyticsEnabled),
    status: form.status,
  };
}

export function AdminHomepageContainersPage() {
  const [containers, setContainers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewProducts, setPreviewProducts] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const selectedCategorySet = useMemo(() => new Set(form.categoryIds.map(String)), [form.categoryIds]);
  
  const filteredCategories = useMemo(() => {
    // If vendorMode is not SPECIFIC_VENDORS or no vendors selected, show all categories
    if (form.vendorMode !== "SPECIFIC_VENDORS" || form.vendorIds.length === 0) {
      return categories;
    }
    
    // Filter products by selected vendors
    const selectedVendorSet = new Set(form.vendorIds.map(String));
    const vendorProducts = products.filter(p => selectedVendorSet.has(String(p.sellerId?._id || p.sellerId)));
    
    // Get unique category IDs from these products
    const categoryIdsFromVendor = new Set(
      vendorProducts.map(p => String(p.categoryId?._id || p.categoryId)).filter(Boolean)
    );
    
    // Filter and return categories
    return categories.filter(cat => categoryIdsFromVendor.has(String(cat._id)));
  }, [form.vendorMode, form.vendorIds, categories, products]);
  
  const filteredSubcategories = useMemo(
    () => subcategories.filter((item) => {
      if (!selectedCategorySet.size) return true; // Show all if nothing selected
      // Handle both populated object and plain ID
      const categoryId = item.categoryId?._id || item.categoryId;
      return selectedCategorySet.has(String(categoryId));
    }),
    [selectedCategorySet, subcategories]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listAdminHomepageContainers({ limit: 100 });
      setContainers(response?.data?.containers || []);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const [vendorsRes, categoriesRes, subcategoriesRes, productsRes] = await Promise.all([
        listSellers({ status: "approved" }),
        listCategories(),
        listSubcategories(),
        listProducts({ limit: 200, status: "APPROVED" }),
      ]);
      setVendors(Array.isArray(vendorsRes?.data) ? vendorsRes.data : []);
      setCategories(Array.isArray(categoriesRes?.data) ? categoriesRes.data : []);
      
      // Handle both array and object responses for subcategories
      const subcatsData = subcategoriesRes?.data;
      const subcats = Array.isArray(subcatsData) ? subcatsData : (subcatsData?.subcategories || []);
      setSubcategories(subcats);
      
      setProducts(Array.isArray(productsRes?.data?.products) ? productsRes.data.products : []);
    } catch (err) {
      setError(normalizeError(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    loadOptions();
  }, [loadOptions, refresh]);

  function resetForm() {
    setEditingId("");
    setForm(initialForm);
    setPreviewProducts([]);
  }

  function startEdit(container) {
    setEditingId(container._id);
    setForm({
      title: container.title || "",
      slug: container.slug || "",
      description: container.description || "",
      bannerImage: container.bannerImage || "",
      containerType: container.containerType || "PRODUCT_CAROUSEL",
      vendorMode: container.vendorMode || "ALL_VENDORS",
      vendorIds: (container.vendorIds || []).map((item) => item?._id || item),
      categoryIds: (container.categoryIds || []).map((item) => item?._id || item),
      subCategoryIds: (container.subCategoryIds || []).map((item) => item?._id || item),
      brandIds: Array.isArray(container.brandIds) ? container.brandIds.join(", ") : "",
      tags: Array.isArray(container.tags) ? container.tags.join(", ") : "",
      offerType: container.offerType || "NONE",
      minDiscountPercentage: container.minDiscountPercentage ?? 0,
      maxDiscountPercentage: container.maxDiscountPercentage ?? "",
      minPrice: container.minPrice ?? "",
      maxPrice: container.maxPrice ?? "",
      sortBy: container.sortBy || "TRENDING",
      productSelectionMode: container.productSelectionMode || "AUTO",
      manualProductIds: (container.manualProductIds || []).map((item) => item?._id || item),
      maxProductsToShow: container.maxProductsToShow ?? 12,
      priority: container.priority ?? 0,
      scheduleEnabled: Boolean(container.scheduleEnabled),
      startDate: container.startDate ? new Date(container.startDate).toISOString().split("T")[0] : "",
      endDate: container.endDate ? new Date(container.endDate).toISOString().split("T")[0] : "",
      deviceVisibility: container.deviceVisibility || "ALL",
      showOnlyInStock: container.showOnlyInStock !== false,
      showOnlyActiveProducts: container.showOnlyActiveProducts !== false,
      analyticsEnabled: container.analyticsEnabled !== false,
      status: container.status || "ACTIVE",
    });
    setPreviewProducts([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(form);
      if (editingId) {
        await updateAdminHomepageContainer(editingId, payload);
      } else {
        await createAdminHomepageContainer(payload);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setError("");
    try {
      const response = await previewAdminHomepageContainer(buildPayload(form));
      setPreviewProducts(response?.data?.products || []);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this homepage container?")) return;
    try {
      await deleteAdminHomepageContainer(id);
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function handleMove(container, direction) {
    const sorted = [...containers].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const index = sorted.findIndex((item) => item._id === container._id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;
    try {
      await reorderAdminHomepageContainers([
        { id: sorted[index]._id, priority: sorted[swapIndex].priority ?? swapIndex },
        { id: sorted[swapIndex]._id, priority: sorted[index].priority ?? index },
      ]);
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Homepage Containers</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Merchandising rails that auto-populate the storefront homepage.
            </p>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{containers.length} containers</div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
            ))
          ) : containers.length ? (
            containers
              .slice()
              .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
              .map((container, index) => (
                <article key={container._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                          #{index + 1}
                        </span>
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {container.status}
                        </span>
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {container.productSelectionMode}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{container.title}</h3>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        `{container.slug}` • {container.sortBy} • max {container.maxProductsToShow}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleMove(container, "up")} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        Move Up
                      </button>
                      <button type="button" onClick={() => handleMove(container, "down")} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        Move Down
                      </button>
                      <button type="button" onClick={() => startEdit(container)} className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(container._id)} className="rounded-2xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900 dark:text-rose-300">
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No homepage containers yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{editingId ? "Edit Container" : "Create Container"}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Define rules, preview products, then publish.</p>
          </div>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
              Reset
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Container Name">
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: current.slug || slugify(event.target.value) }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" required />
            </Field>
            <Field label="Slug">
              <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" required />
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </Field>

          <Field label="Banner Image URL">
            <input value={form.bannerImage} onChange={(event) => setForm((current) => ({ ...current, bannerImage: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Container Type">
              <select value={form.containerType} onChange={(event) => setForm((current) => ({ ...current, containerType: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="PRODUCT_CAROUSEL">Product Carousel</option>
                <option value="GRID">Grid</option>
                <option value="FEATURED">Featured</option>
              </select>
            </Field>
            <Field label="Sort By">
              <select value={form.sortBy} onChange={(event) => setForm((current) => ({ ...current, sortBy: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {["BEST_SELLING", "HIGHEST_DISCOUNT", "NEWEST", "TRENDING", "PRICE_LOW_TO_HIGH", "PRICE_HIGH_TO_LOW", "MOST_VIEWED", "RANDOM"].map((value) => (
                  <option key={value} value={value}>{value.replace(/_/g, " ")}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Vendor Scope">
              <select value={form.vendorMode} onChange={(event) => setForm((current) => ({ ...current, vendorMode: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="ALL_VENDORS">All Vendors</option>
                <option value="SPECIFIC_VENDORS">Specific Vendors</option>
              </select>
            </Field>
            <Field label="Selection Mode">
              <select value={form.productSelectionMode} onChange={(event) => setForm((current) => ({ ...current, productSelectionMode: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="AUTO">Automatic</option>
                <option value="MANUAL">Manual</option>
              </select>
            </Field>
          </div>

          {form.vendorMode === "SPECIFIC_VENDORS" ? (
            <Field label="Vendors">
              <MultiSelect
                options={vendors}
                value={form.vendorIds}
                onChange={(vendorIds) => setForm((current) => ({ ...current, vendorIds }))}
              />
            </Field>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Categories">
              <MultiSelect
                options={filteredCategories}
                value={form.categoryIds}
                onChange={(categoryIds) => setForm((current) => ({ ...current, categoryIds }))}
              />
            </Field>
            <Field label="Subcategories">
              <MultiSelect
                options={filteredSubcategories}
                value={form.subCategoryIds}
                onChange={(subCategoryIds) => setForm((current) => ({ ...current, subCategoryIds }))}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brands (comma separated)">
              <input value={form.brandIds} onChange={(event) => setForm((current) => ({ ...current, brandIds: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
            <Field label="Tags (comma separated)">
              <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Offer Type">
              <select value={form.offerType} onChange={(event) => setForm((current) => ({ ...current, offerType: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="NONE">None</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
            </Field>
            <Field label="Min Discount %">
              <input type="number" min="0" max="100" value={form.minDiscountPercentage} onChange={(event) => setForm((current) => ({ ...current, minDiscountPercentage: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
            <Field label="Max Discount %">
              <input type="number" min="0" max="100" value={form.maxDiscountPercentage} onChange={(event) => setForm((current) => ({ ...current, maxDiscountPercentage: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
            <Field label="Min Price">
              <input type="number" min="0" value={form.minPrice} onChange={(event) => setForm((current) => ({ ...current, minPrice: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
            <Field label="Max Price">
              <input type="number" min="0" value={form.maxPrice} onChange={(event) => setForm((current) => ({ ...current, maxPrice: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Max Products">
              <input type="number" min="1" max="100" value={form.maxProductsToShow} onChange={(event) => setForm((current) => ({ ...current, maxProductsToShow: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
            <Field label="Priority">
              <input type="number" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
            <Field label="Device Visibility">
              <select value={form.deviceVisibility} onChange={(event) => setForm((current) => ({ ...current, deviceVisibility: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="ALL">All</option>
                <option value="MOBILE_ONLY">Mobile Only</option>
                <option value="DESKTOP_ONLY">Desktop Only</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </Field>
          </div>

          {form.productSelectionMode === "MANUAL" ? (
            <Field label="Manual Products">
              <select multiple value={form.manualProductIds} onChange={(event) => setForm((current) => ({ ...current, manualProductIds: getMultiSelectValues(event) }))} className="min-h-40 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {products.map((product) => (
                  <option key={product._id} value={product._id}>{product.name}</option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start Date">
              <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </Field>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-900 dark:text-white">Schedule Enabled</span>
              <input type="checkbox" checked={form.scheduleEnabled} onChange={(event) => setForm((current) => ({ ...current, scheduleEnabled: event.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-900 dark:text-white">Show Only In Stock</span>
              <input type="checkbox" checked={form.showOnlyInStock} onChange={(event) => setForm((current) => ({ ...current, showOnlyInStock: event.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-900 dark:text-white">Show Only Active Products</span>
              <input type="checkbox" checked={form.showOnlyActiveProducts} onChange={(event) => setForm((current) => ({ ...current, showOnlyActiveProducts: event.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-900 dark:text-white">Analytics Enabled</span>
              <input type="checkbox" checked={form.analyticsEnabled} onChange={(event) => setForm((current) => ({ ...current, analyticsEnabled: event.target.checked }))} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={handlePreview} disabled={previewLoading} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200">
              {previewLoading ? "Loading Preview..." : "Preview Products"}
            </button>
            <button type="submit" disabled={saving} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
              {saving ? "Saving..." : editingId ? "Update Container" : "Create Container"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="mb-3 text-sm font-semibold text-slate-950 dark:text-white">Preview Products</div>
          {previewProducts.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {previewProducts.slice(0, 6).map((product) => (
                <div key={product._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.category}</div>
                  <div className="mt-2 text-sm font-medium text-emerald-600">{formatCurrency(product.discountPrice || product.price)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Run preview to inspect the matched products.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      {children}
    </label>
  );
}
