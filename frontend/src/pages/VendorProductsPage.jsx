import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReportingToolbar } from "../components/ReportingToolbar";
import { InlineToast } from "../components/commerce/InlineToast";
import { useReporting } from "../hooks/useReporting";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import { VendorDataTable, VendorSection } from "../components/VendorPanel";
import { useModuleAccess } from "../context/VendorModuleContext";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function VendorProductsPage() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const { can } = useModuleAccess();
  const reporting = useReporting({
    module: "products",
    getFilters: () => ({ ...(status ? { status } : {}) }),
  });

  const load = useCallback(async () => {
    try {
      const response = await vendorDashboardService.getVendorProducts({
        status,
        search,
        limit: 20,
        ...reporting.appliedParams,
      });
      setData(response.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load products.");
    }
  }, [reporting.appliedParams, search, status]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function handleExport(format) {
    try {
      await reporting.exportReport(format);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to export products.");
    }
  }

  async function handleDelete(productId, productName) {
    if (!window.confirm(`Delete "${productName}" permanently? This cannot be undone.`)) {
      return;
    }

    setDeletingId(productId);
    setError("");
    try {
      await vendorDashboardService.deleteVendorProduct(productId);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete product.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="grid gap-6">
      <VendorSection
        title="Catalog Management"
        description="Add, edit, archive, and monitor product approval status."
        action={
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
            />
            <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              Search
            </button>
            {can("products.create") ? (
              <Link to="/vendor/products/create" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
                New Product
              </Link>
            ) : null}
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {["", "PENDING", "APPROVED", "REJECTED"].map((item) => (
            <button
              key={item || "all"}
              onClick={() => setStatus(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === item ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              {item || "ALL"}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <ReportingToolbar
            startDate={reporting.startDate}
            endDate={reporting.endDate}
            onDateChange={reporting.setDateRange}
            onApply={reporting.applyDateRange}
            onExport={handleExport}
            exportingFormat={reporting.exportingFormat}
            isDirty={reporting.hasPendingChanges}
          />
        </div>
        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <VendorDataTable
          rows={(data?.products || []).map((product) => ({
            id: product._id,
            name: product.name,
            category: product.category,
            price: formatCurrency(product.discountPrice || product.price),
            stock: product.stock,
            status: product.status,
            approval: product.rejectionReason || "Awaiting admin review",
            rawName: product.name,
          }))}
          columns={[
            { key: "name", label: "Product" },
            { key: "category", label: "Category" },
            { key: "price", label: "Price" },
            { key: "stock", label: "Stock" },
            { key: "status", label: "Approval", render: (row) => <StatusBadge value={row.status} /> },
            { key: "approval", label: "Note" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                can("products.update") || can("products.delete") ? (
                  <div className="flex flex-wrap gap-2">
                    {can("products.update") ? (
                      <Link to={`/vendor/products/${row.id}/edit`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        Edit
                      </Link>
                    ) : null}
                    {can("products.delete") ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, row.rawName)}
                        disabled={deletingId === row.id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No actions</span>
                )
              ),
            },
          ]}
        />
        <InlineToast toast={reporting.toast} onClose={reporting.clearToast} />
      </VendorSection>
    </div>
  );
}
