import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation,  Link, useParams  } from "react-router-dom";
import {
  adjustAdminInventory,
  getAdminInventoryLedger,
  getAdminInventoryProduct,
  updateAdminInventoryThreshold,
} from "../services/adminApi";
import { useAdminSession } from "../hooks/useAdminSession";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to load admin inventory";
}

const INCREASE_REASONS = ["Purchase", "Supplier Delivery", "Inventory Audit", "Customer Return", "Warehouse Entry", "Manual Adjustment", "Correction", "Other"];
const DECREASE_REASONS = ["Damaged", "Expired", "Lost", "Warehouse Correction", "Inventory Audit", "Supplier Return", "Internal Usage", "Manual Adjustment", "Other"];

export function AdminInventoryDetailsPage() {
  const { productId } = useParams();
  const { basePath, isLegacyAdmin, canAccess } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventory, setInventory] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantSearch, setVariantSearch] = useState("");
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(0);
  
  const [adjustmentForm, setAdjustmentForm] = useState({ 
    adjustmentType: "INCREASE", 
    quantity: "", 
    reason: "", 
    notes: "" 
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [ledgerFilters, setLedgerFilters] = useState({ search: "", type: "ALL", date: "" });

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminInventoryProduct(productId);
      const nextInventory = response.data;
      setInventory(nextInventory);
      setSelectedVariant((current) => {
        if (!nextInventory?.variants?.length) return null;
        if (!current) return nextInventory.variants[0];
        return nextInventory.variants.find((variant) => variant.variantId === current.variantId) || nextInventory.variants[0];
      });
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadLedger = useCallback(async (variantId) => {
    setLedgerLoading(true);
    try {
      // Load more for better dashboard stats calculation
      const response = await getAdminInventoryLedger(productId, variantId, { limit: 100, offset: 0 });
      setLedger(response.data?.ledger || []);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLedgerLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    if (!selectedVariant?.variantId) return;
    loadLedger(selectedVariant.variantId);
    setAdjustmentForm(curr => ({ ...curr, reason: "" }));
  }, [loadLedger, selectedVariant?.variantId]);

  function handleInitiateAdjustment() {
    setError("");
    const qty = Number(adjustmentForm.quantity);
    if (!selectedVariant) {
      setError("Please select a variant.");
      return;
    }
    if (!qty || qty <= 0 || isNaN(qty)) {
      setError("Quantity must be a positive number.");
      return;
    }
    if (!adjustmentForm.reason) {
      setError("Please select a reason.");
      return;
    }
    if (adjustmentForm.adjustmentType === "DECREASE") {
      if (!adjustmentForm.notes.trim()) {
        setError("Notes are mandatory for stock decreases.");
        return;
      }
      if (qty > selectedVariant.available) {
        setError(`Adjustment exceeds available stock. Maximum allowed decrease is ${selectedVariant.available}.`);
        return;
      }
    }
    setShowConfirm(true);
  }

  async function confirmAdjustment() {
    try {
      await adjustAdminInventory(productId, selectedVariant.variantId, {
        adjustmentType: adjustmentForm.adjustmentType,
        quantityChange: adjustmentForm.quantity,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes
      });
      setAdjustmentForm({ adjustmentType: "INCREASE", quantity: "", reason: "", notes: "" });
      setShowConfirm(false);
      await loadInventory();
      await loadLedger(selectedVariant.variantId);
    } catch (err) {
      setError(normalizeError(err));
      setShowConfirm(false);
    }
  }

  async function handleUpdateThreshold() {
    if (!selectedVariant) return;
    try {
      await updateAdminInventoryThreshold(productId, selectedVariant.variantId, thresholdValue);
      await loadInventory();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  const filteredVariants = useMemo(() => {
    const variants = inventory?.variants || [];
    const query = variantSearch.trim().toLowerCase();
    if (!query) return variants;
    return variants.filter(
      (variant) =>
        String(variant.variantTitle || "").toLowerCase().includes(query) ||
        String(variant.sku || "").toLowerCase().includes(query)
    );
  }, [inventory?.variants, variantSearch]);

  const ledgerStats = useMemo(() => {
    let todayIncrease = 0;
    let todayDecrease = 0;
    let totalAdjustments = ledger.length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    ledger.forEach(entry => {
      const isToday = entry.createdAt?.startsWith(todayStr);
      const isIncrease = entry.adjustmentType === 'INCREASE' || Number(entry.quantityChange) > 0;
      if (isToday) {
        if (isIncrease) todayIncrease += Math.abs(Number(entry.quantityChange));
        else todayDecrease += Math.abs(Number(entry.quantityChange));
      }
    });

    return { 
      todayIncrease, 
      todayDecrease, 
      totalAdjustments, 
      lastAdjustment: ledger[0]?.createdAt 
    };
  }, [ledger]);

  const filteredLedger = useMemo(() => {
    return ledger.filter(entry => {
      const entryType = entry.adjustmentType || (Number(entry.quantityChange) > 0 ? "INCREASE" : "DECREASE");
      if (ledgerFilters.type !== "ALL" && entryType !== ledgerFilters.type) return false;
      if (ledgerFilters.date && !entry.createdAt?.startsWith(ledgerFilters.date)) return false;
      if (ledgerFilters.search) {
        const query = ledgerFilters.search.toLowerCase();
        if (!entry.reason?.toLowerCase().includes(query) && 
            !entry.performedBy?.name?.toLowerCase().includes(query) &&
            !entry.notes?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [ledger, ledgerFilters]);

  function handleExport(format) {
    if (format === "csv") {
      const headers = ["Date,Type,Reason,Quantity,Before,After,Reserved Before,Reserved After,Admin,Notes"];
      const rows = filteredLedger.map(entry => {
        const type = entry.adjustmentType || (Number(entry.quantityChange) > 0 ? "INCREASE" : "DECREASE");
        return [
          entry.createdAt,
          type,
          `"${entry.reason || ''}"`,
          entry.quantityChange,
          entry.stockBefore,
          entry.stockAfter,
          entry.reservedBefore,
          entry.reservedAfter,
          `"${entry.performedBy?.name || ''}"`,
          `"${entry.notes || ''}"`
        ].join(",");
      });
      const csv = headers.concat(rows).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-ledger-${selectedVariant?.sku || 'export'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  if (loading) {
    return <div className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>;
  }

  const previewQty = Number(adjustmentForm.quantity || 0);
  const previewStock = selectedVariant ? selectedVariant.stock + (adjustmentForm.adjustmentType === "INCREASE" ? previewQty : -previewQty) : 0;
  const currentReasons = adjustmentForm.adjustmentType === "INCREASE" ? INCREASE_REASONS : DECREASE_REASONS;

  return (
    <div className="grid gap-6">
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Confirm Adjustment</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please review the warehouse ledger entry details.</p>
            
            <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Variant:</span> <span className="font-medium text-slate-900 dark:text-white">{selectedVariant?.variantTitle}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SKU:</span> <span className="font-medium text-slate-900 dark:text-white">{selectedVariant?.sku}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Type:</span> <span className={`font-bold ${adjustmentForm.adjustmentType === 'INCREASE' ? 'text-emerald-600' : 'text-rose-600'}`}>{adjustmentForm.adjustmentType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Quantity:</span> <span className="font-medium text-slate-900 dark:text-white">{adjustmentForm.quantity}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Reason:</span> <span className="font-medium text-slate-900 dark:text-white">{adjustmentForm.reason}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Previous Stock:</span> <span className="font-medium text-slate-900 dark:text-white">{selectedVariant?.stock}</span></div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2"><span className="text-slate-950 dark:text-white font-bold">New Stock:</span> <span className="font-bold text-slate-950 dark:text-white">{previewStock}</span></div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={confirmAdjustment} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">Confirm Adjustment</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link to={`${basePath}/inventory`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:text-slate-200">
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{inventory?.productName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Platform inventory details for admin-created product variants.</p>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Total Stock</div><div className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{inventory?.totalStock || 0}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Reserved</div><div className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{inventory?.totalReservedStock || 0}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Available</div><div className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{inventory?.totalAvailableStock || 0}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Alert</div><div className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{inventory?.alertStatus || "OK"}</div></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <input
                value={variantSearch}
                onChange={(event) => setVariantSearch(event.target.value)}
                placeholder="Search variants by name or SKU"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Variant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Reserved</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredVariants.map((variant) => (
                    <tr
                      key={variant.variantId}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setThresholdValue(variant.threshold);
                        setAdjustmentForm(curr => ({ ...curr, reason: "", quantity: "", notes: "" }));
                      }}
                      className={`cursor-pointer ${selectedVariant?.variantId === variant.variantId ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                    >
                      <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{variant.variantTitle}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{variant.sku}</td>
                      <td className="px-4 py-4 text-right text-sm text-slate-700 dark:text-slate-200">{variant.stock}</td>
                      <td className="px-4 py-4 text-right text-sm text-slate-700 dark:text-slate-200">{variant.reserved}</td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-slate-950 dark:text-white">{variant.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedVariant && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">Warehouse Ledger</h3>
                  <p className="text-xs text-slate-500">Adjustment history for {selectedVariant.variantTitle}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleExport("csv")} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:text-slate-200">
                    Export CSV
                  </button>
                </div>
              </div>
              
              <div className="mb-4 grid grid-cols-4 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800"><div className="text-xs text-slate-500">Today's Increase</div><div className="font-bold text-emerald-600">+{ledgerStats.todayIncrease}</div></div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800"><div className="text-xs text-slate-500">Today's Decrease</div><div className="font-bold text-rose-600">-{ledgerStats.todayDecrease}</div></div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800"><div className="text-xs text-slate-500">Total Adjustments</div><div className="font-bold text-slate-950 dark:text-white">{ledgerStats.totalAdjustments}</div></div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800"><div className="text-xs text-slate-500">Last Adj.</div><div className="font-bold text-slate-950 dark:text-white text-[10px] break-all">{ledgerStats.lastAdjustment ? new Date(ledgerStats.lastAdjustment).toLocaleDateString() : 'N/A'}</div></div>
              </div>

              <div className="mb-4 flex gap-2">
                <input value={ledgerFilters.search} onChange={e => setLedgerFilters(c => ({...c, search: e.target.value}))} placeholder="Search reason, admin, notes" className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                <select value={ledgerFilters.type} onChange={e => setLedgerFilters(c => ({...c, type: e.target.value}))} className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="ALL">All Types</option>
                  <option value="INCREASE">Increase</option>
                  <option value="DECREASE">Decrease</option>
                </select>
                <input type="date" value={ledgerFilters.date} onChange={e => setLedgerFilters(c => ({...c, date: e.target.value}))} className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>

              <div className="max-h-[320px] overflow-auto">
                {ledgerLoading ? (
                  <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading ledger...</div>
                ) : filteredLedger.length ? (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredLedger.map((entry) => {
                       const isIncrease = entry.adjustmentType === 'INCREASE' || Number(entry.quantityChange) > 0;
                       return (
                        <div key={entry._id} className="p-4 text-sm hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${isIncrease ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                {entry.adjustmentType || entry.transactionType}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.reason || "Inventory update"} by {entry.performedBy?.name || 'System'}</div>
                              {entry.notes && <div className="text-xs text-slate-400 italic mt-1 bg-slate-50 dark:bg-slate-950/50 p-1.5 rounded">{entry.notes}</div>}
                            </div>
                            <div className="text-right">
                              <div className={`font-bold text-base ${isIncrease ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {isIncrease ? "+" : ""}{entry.quantityChange}
                              </div>
                              <div className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                            <div>Stock: <span className="font-medium text-slate-700 dark:text-slate-300">{entry.stockBefore} → {entry.stockAfter}</span></div>
                            <div>Reserved: <span className="font-medium text-slate-700 dark:text-slate-300">{entry.reservedBefore} → {entry.reservedAfter}</span></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No ledger entries match criteria.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 self-start sticky top-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Admin Control</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Adjust stock for selected variant.</p>
          </div>

          {selectedVariant ? (
            <>
              {(isLegacyAdmin || canAccess("inventory.updateStock")) ? (
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Adjust Stock</div>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Adjustment Type</label>
                      <select
                        value={adjustmentForm.adjustmentType}
                        onChange={(event) => setAdjustmentForm((current) => ({ ...current, adjustmentType: event.target.value, reason: "" }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="INCREASE">Increase Stock</option>
                        <option value="DECREASE">Decrease Stock</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={adjustmentForm.quantity}
                        onChange={(event) => setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))}
                        placeholder="e.g. 5"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Reason</label>
                      <select
                        value={adjustmentForm.reason}
                        onChange={(event) => setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Select a reason...</option>
                        {currentReasons.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Notes {adjustmentForm.adjustmentType === 'DECREASE' && <span className="text-rose-500">*</span>}</label>
                      <textarea
                        value={adjustmentForm.notes}
                        onChange={(event) => setAdjustmentForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder={adjustmentForm.adjustmentType === 'DECREASE' ? "Required for decreases" : "Optional notes"}
                        rows={2}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div className="mt-1 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Current Stock</span>
                        <span>{selectedVariant.stock}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Adjustment</span>
                        <span className={adjustmentForm.adjustmentType === "INCREASE" ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                          {adjustmentForm.adjustmentType === "INCREASE" ? "+" : "-"}{previewQty}
                        </span>
                      </div>
                      <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-slate-950 dark:text-white">
                        <span>Preview Stock</span>
                        <span className={previewStock < 0 ? "text-rose-600" : ""}>{previewStock}</span>
                      </div>
                    </div>

                    <button onClick={handleInitiateAdjustment} className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors shadow-sm">
                      Review Adjustment
                    </button>
                  </div>
                </div>
              ) : null}

              {(isLegacyAdmin || canAccess("inventory.updateThreshold")) ? (
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Low Stock Threshold</div>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={thresholdValue}
                      onChange={(event) => setThresholdValue(Number(event.target.value || 0))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <button onClick={handleUpdateThreshold} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors">
                      Update
                    </button>
                  </div>
                </div>
              ) : null}
              
              {!(isLegacyAdmin || canAccess("inventory.updateStock") || canAccess("inventory.updateThreshold")) && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  You do not have permission to manage inventory limits here.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Select a variant from the table to manage inventory.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
