import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createCatalogRequest, listVendorCatalogRequests, searchCatalog } from "../services/catalogRequestService";
import * as categoryService from "../services/categoryService";
import * as subcategoryService from "../services/subcategoryService";
import { VendorSection } from "../components/VendorPanel";

const searchTypes = [
  { value: "all", label: "All" },
  { value: "category", label: "Category" },
  { value: "subcategory", label: "Subcategory" },
  { value: "attribute", label: "Attribute" },
  { value: "product_module", label: "Product Module" },
];
const requestTypes = [
  { value: "category", label: "Category" },
  { value: "subcategory", label: "Subcategory" },
  { value: "attribute", label: "Attribute" },
  { value: "product_module", label: "Product Module" },
];

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function VendorCatalogRequestsPage() {
  const [searchType, setSearchType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ requestType: "category", requestedName: "", description: "", businessJustification: "", requestNote: "", categoryId: "", subCategoryId: "", optionsValue: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    loadRequests();
    loadCategories();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSearch();
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchType]);

  useEffect(() => {
    if (form.categoryId) {
      loadSubcategories(form.categoryId);
    } else {
      setSubcategories([]);
      setForm((current) => ({ ...current, subCategoryId: "" }));
    }
  }, [form.categoryId]);

  async function loadCategories() {
    try {
      const response = await categoryService.getCategories();
      setCategories(response?.data || response || []);
    } catch {
      setCategories([]);
    }
  }

  async function loadSubcategories(categoryId) {
    try {
      const response = await subcategoryService.getSubcategoriesByCategory(categoryId);
      setSubcategories(response?.data || response || []);
    } catch {
      setSubcategories([]);
    }
  }

  async function loadSearch() {
    try {
      const response = await searchCatalog({ type: searchType, query: searchQuery, page: 1, limit: 10 });
      const items = response?.data?.items || [];
      setSearchResults(items.map((item) => ({
        ...item,
        catalogType: item.catalogType || (item.appliesTo ? "Attribute" : item.categoryId && item.subCategoryId ? "Subcategory" : item.categoryId ? "Subcategory" : item.name && item._id ? "Category" : "Product Module"),
      })));
    } catch {
      setSearchResults([]);
    }
  }

  function hasDuplicateVendorRequest(requestedName) {
    const normalizedName = requestedName.toLowerCase();
    return requests.some((item) => {
      if (!item.requestedName) return false;
      if (String(item.requestType) !== String(form.requestType)) return false;
      if (item.status === "cancelled") return false;
      const existingName = String(item.requestedName).trim().toLowerCase();
      return existingName === normalizedName;
    });
  }

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await listVendorCatalogRequests({ page: 1, limit: 20 });
      setRequests(response?.data?.items || []);
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    const requestedName = String(form.requestedName || "").trim();
    if (!requestedName) {
      setMessage("Requested name is required.");
      setMessageType("error");
      return;
    }

    if (hasDuplicateVendorRequest(requestedName)) {
      setMessage("You already have an active request for this item.");
      setMessageType("error");
      return;
    }

    if (form.requestType === "product_module") {
      try {
        const result = await searchCatalog({ type: "product_module", query: requestedName, page: 1, limit: 10 });
        const found = (result?.data?.items || []).some((item) => String(item.name || "").trim().toLowerCase() === requestedName.toLowerCase());
        if (found) {
          setMessage("A product module with this name already exists or has already been requested.");
          setMessageType("error");
          return;
        }
      } catch {
        // Ignore search failures; server-side duplicate validation will still apply.
      }
    }

    if (form.requestType === "attribute") {
      const options = String(form.optionsValue || "").split(",").map((value) => value.trim()).filter(Boolean);
      if (options.length === 0) {
        setMessage("Attribute values are required when requesting a new attribute.");
        setMessageType("error");
        return;
      }
    }

    try {
      const payload = {
        requestType: form.requestType,
        requestedName,
        description: form.description,
        businessJustification: form.businessJustification,
        payload: {
          requestNote: form.requestNote || undefined,
          options: form.requestType === "attribute"
            ? String(form.optionsValue || "").split(",").map((value) => value.trim()).filter(Boolean)
            : undefined,
          options: form.requestType === "attribute"
            ? form.optionsValue
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : undefined,
        },
        categoryId: form.categoryId || undefined,
        subCategoryId: form.subCategoryId || undefined,
      };
      await createCatalogRequest(payload);
      setMessage("Request submitted successfully.");
      setMessageType("success");
      setForm({ requestType: "category", requestedName: "", description: "", businessJustification: "", requestNote: "", categoryId: "", subCategoryId: "", optionsValue: "" });
      loadRequests();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to submit request.");
      setMessageType("error");
    }
  }

  const summary = useMemo(
    () => ({
      pending: requests.filter((item) => ["submitted", "under_review"].includes(item.status)).length,
      approved: requests.filter((item) => item.status === "approved").length,
    }),
    [requests]
  );

  return (
    <div className="space-y-6">
      <VendorSection
        title="Catalog Requests"
        description="Search the master catalog and request new categories, subcategories, attributes, or product modules."
        action={(
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-xl bg-slate-100 px-3 py-2">Pending: {summary.pending}</div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">Approved: {summary.approved}</div>
          </div>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Search existing catalog</h2>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {searchTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="mt-4 space-y-2">
            {searchResults.length === 0 ? <div className="text-sm text-slate-500">No matching catalog items found.</div> : null}
            {searchResults.map((item) => (
              <div key={item._id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{item.catalogType || item.type || item.requestType || "Item"}</div>
                </div>
                {item.categoryId?.name ? <div className="text-slate-500">Category: {item.categoryId.name}</div> : null}
                {item.subCategoryId?.name ? <div className="text-slate-500">Subcategory: {item.subCategoryId.name}</div> : null}
                {item.appliesTo?.categoryId?.name ? <div className="text-slate-500">Attribute applies to: {item.appliesTo.categoryId.name}{item.appliesTo.subCategoryId ? ` / ${item.appliesTo.subCategoryId.name}` : ""}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Request new item</h2>
          <form className="mt-4 space-y-4" onSubmit={submitRequest}>
            <Field label="Request type">
              <select value={form.requestType} onChange={(e) => setForm((current) => ({ ...current, requestType: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {requestTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </Field>
            <Field label="Requested name">
              <input required value={form.requestedName} onChange={(e) => setForm((current) => ({ ...current, requestedName: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Description">
              <textarea rows={3} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Business justification">
              <textarea rows={3} value={form.businessJustification} onChange={(e) => setForm((current) => ({ ...current, businessJustification: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            {(form.requestType === "subcategory" || form.requestType === "attribute") ? (
              <Field label="Parent category">
                <select value={form.categoryId} onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
              </Field>
            ) : null}
            {form.requestType === "attribute" ? (
              <>
                <Field label="Parent subcategory (optional)">
                  <select value={form.subCategoryId} onChange={(e) => setForm((current) => ({ ...current, subCategoryId: e.target.value }))} disabled={!form.categoryId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                    <option value="">Select subcategory</option>
                    {subcategories.map((subcategory) => (
                      <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Attribute values">
                  <textarea
                    required
                    rows={3}
                    value={form.optionsValue}
                    onChange={(e) => setForm((current) => ({ ...current, optionsValue: e.target.value }))}
                    placeholder="Enter values separated by commas, e.g. Red, Blue, Green"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">These are the options vendors should be able to select, for example colors or sizes.</p>
                </Field>
              </>
            ) : null}
            <Field label="Request note (optional)">
              <textarea rows={3} value={form.requestNote} onChange={(e) => setForm((current) => ({ ...current, requestNote: e.target.value }))} placeholder="Explain what you want and why this should be added." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-slate-500">For example: create a new subcategory under Electronics called Mobile Accessories.</p>
            </Field>
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Submit request</button>
            {message ? (
              <div className={`text-sm ${messageType === "success" ? "text-emerald-700" : "text-rose-700"}`}>{message}</div>
            ) : null}
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your requests</h2>
          <Link to="/vendor/dashboard" className="text-sm text-slate-600 hover:text-slate-900">Back to dashboard</Link>
        </div>
        {loading ? <div className="text-sm text-slate-500">Loading...</div> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="py-3">Request ID</th>
                <th className="py-3">Type</th>
                <th className="py-3">Requested</th>
                <th className="py-3">Status</th>
                <th className="py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item._id} className="border-b border-slate-100">
                  <td className="py-3 font-medium text-slate-700">{item.requestId}</td>
                  <td className="py-3">{item.requestType}</td>
                  <td className="py-3">
                    {item.requestedName}
                    {item.status === "rejected" && item.reviewReason ? (
                      <p className="mt-1 text-xs text-rose-700">Reason: {item.reviewReason}</p>
                    ) : null}
                  </td>
                  <td className="py-3">{item.status}</td>
                  <td className="py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
