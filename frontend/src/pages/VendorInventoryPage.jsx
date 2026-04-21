import { useCallback, useEffect, useState } from "react";
import { ReportingToolbar } from "../components/ReportingToolbar";
import { InlineToast } from "../components/commerce/InlineToast";
import { useReporting } from "../hooks/useReporting";
import { VendorDataTable, VendorSection } from "../components/VendorPanel";
import * as vendorDashboardService from "../services/vendorDashboardService";

const emptyForm = {
  id: "",
  name: "",
  stock: "",
  lowStockThreshold: "",
};

export function VendorInventoryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const reporting = useReporting({
    module: "inventory",
  });

  const load = useCallback(async () => {
    try {
      const response = await vendorDashboardService.getVendorInventory({ limit: 20, ...reporting.appliedParams });
      setData(response.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load inventory.");
    }
  }, [reporting.appliedParams]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdjust(product) {
    setForm({
      id: product.id,
      name: product.name,
      stock: String(product.stock ?? 0),
      lowStockThreshold: String(product.lowStockThreshold ?? 10),
    });
    setError("");
  }

  function closeAdjust() {
    if (isSaving) return;
    setForm(emptyForm);
  }

  async function submitAdjust(event) {
    event.preventDefault();

    const stock = Number(form.stock);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!Number.isFinite(stock) || stock < 0) {
      setError("Stock must be a valid number greater than or equal to 0.");
      return;
    }

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      setError("Threshold must be a valid number greater than or equal to 0.");
      return;
    }

    try {
      setIsSaving(true);
      await vendorDashboardService.updateVendorInventory(form.id, {
        stock,
        lowStockThreshold,
      });
      await load();
      setForm(emptyForm);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update inventory.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport(format) {
    try {
      await reporting.exportReport(format);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to export inventory.");
    }
  }

  return (
    <div className="grid gap-6">
      <VendorSection title="Inventory" description="Track stock health, adjust available quantity, and respond to low stock alerts.">
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
            ...product,
            id: product._id,
          }))}
          columns={[
            { key: "name", label: "Product" },
            { key: "SKU", label: "SKU" },
            { key: "stock", label: "Stock" },
            { key: "lowStockThreshold", label: "Threshold" },
            { key: "lowStock", label: "Alert", render: (row) => (row.lowStock ? <span className="text-amber-600">Low stock</span> : <span className="text-emerald-600">Healthy</span>) },
            {
              key: "actions",
              label: "Update",
              render: (row) => (
                <button onClick={() => startAdjust(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Adjust
                </button>
              ),
            },
          ]}
        />
      </VendorSection>

      {form.id ? (
        <VendorSection title={`Adjust Inventory: ${form.name}`} description="Update available quantity and low-stock threshold for this product.">
          <form onSubmit={submitAdjust} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span>Stock Quantity</span>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span>Low Stock Threshold</span>
              <input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={closeAdjust}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </VendorSection>
      ) : null}
      <InlineToast toast={reporting.toast} onClose={reporting.clearToast} />
    </div>
  );
}
