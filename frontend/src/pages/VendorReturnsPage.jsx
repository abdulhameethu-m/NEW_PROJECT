import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import { VendorSection, VendorDataTable } from "../components/VendorPanel";
import vendorReturnService from "../services/vendorReturn.service";

const VENDOR_DISPUTE_REASON_CODES = [
  "CUSTOMER_DAMAGED",
  "WRONG_PRODUCT_RETURNED",
  "MISSING_PARTS",
  "USED_PRODUCT",
  "TAMPERED_PRODUCT",
  "WRONG_VARIANT_RETURNED",
  "OTHER",
];

const REASON_LABELS = {
  DAMAGED: "Damaged", DEFECTIVE: "Defective", WRONG_ITEM: "Wrong Item",
  WRONG_VARIANT: "Wrong Variant", NOT_AS_DESCRIBED: "Not as Described",
  MISSING_ITEM: "Missing Item", QUALITY_ISSUE: "Quality Issue",
  SIZE_ISSUE: "Size Issue", OTHER: "Other",
};

// ── Image Viewer Modal
function ImageViewer({ images, onClose }) {
  const [idx, setIdx] = useState(0);
  if (!images?.length) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow">✕</button>
        <img src={images[idx]} alt="" className="max-h-[70vh] max-w-xl rounded-xl object-contain shadow-xl" />
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((url, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${i === idx ? "border-blue-500" : "border-transparent"}`}>
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dispute Form Modal
function DisputeModal({ returnId, onClose, onDone }) {
  const [reasonCode, setReasonCode] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function submit() {
    if (!reasonCode) return setError("Please select a dispute reason");
    if (!description.trim()) return setError("Description is required");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("reasonCode", reasonCode);
      fd.append("description", description);
      files.forEach((f) => fd.append("evidence", f));
      await vendorReturnService.dispute(returnId, fd);
      onDone();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit dispute");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Dispute Return</h3>
        {error && <p className="mb-3 rounded-xl bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dispute Reason</label>
            <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="">Select reason…</option>
              {VENDOR_DISPUTE_REASON_CODES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Evidence Photos (max 5)</label>
            <input type="file" ref={fileRef} multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} className="text-sm" />
            {files.length > 0 && <p className="mt-1 text-xs text-slate-500">{files.length} file(s) selected</p>}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={submit} disabled={loading} className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
            {loading ? "Submitting…" : "Submit Dispute"}
          </button>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Return Detail Modal for Vendor
function VendorReturnDetail({ id, onClose, onAction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [evViewer, setEvViewer] = useState(null);

  useEffect(() => {
    vendorReturnService.getById(id).then((r) => { setData(r.data); setLoading(false); }).catch((e) => { setError(e?.response?.data?.message || "Failed"); setLoading(false); });
  }, [id]);

  async function doReceived() {
    setActionLoading(true);
    try { await vendorReturnService.markReceived(id); onAction(); onClose(); }
    catch (e) { setError(e?.response?.data?.message || "Failed"); setActionLoading(false); }
  }
  async function doAccept() {
    setActionLoading(true);
    try { await vendorReturnService.accept(id); onAction(); onClose(); }
    catch (e) { setError(e?.response?.data?.message || "Failed"); setActionLoading(false); }
  }

  const r = data;
  const canReceive = r && ["RETURN_PICKUP_PENDING", "RETURN_IN_TRANSIT"].includes(r.status);
  const canInspect = r && ["VENDOR_RECEIVED", "VENDOR_INSPECTION"].includes(r.status);
  const canCreatePickup = r && r.status === "ADMIN_APPROVED";

  async function doCreatePickup() {
    setActionLoading(true);
    try { await vendorReturnService.createPickup(id); onAction(); onClose(); }
    catch (e) { setError(e?.response?.data?.message || "Failed to create pickup"); setActionLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Return Details</h2>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">Close ✕</button>
        </div>
        {loading && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}
        {error && <p className="p-4 text-sm text-rose-600">{error}</p>}
        {r && (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={r.status} />
            </div>
            <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800 space-y-2 text-sm">
              <p><span className="text-slate-500">Order:</span> <strong>{r.orderId?.orderNumber}</strong></p>
              <p><span className="text-slate-500">Product:</span> <strong>{r.productName}</strong></p>
              <p><span className="text-slate-500">Variant:</span> {r.variantTitle || r.variantSku || "—"}</p>
              <p><span className="text-slate-500">Qty:</span> {r.quantity}</p>
              <p><span className="text-slate-500">Refund Value:</span> <span className="font-medium text-violet-600">{formatCurrency(r.refundAmount)}</span></p>
            </div>

            {/* Customer Evidence */}
            <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Customer Reason</p>
              <p className="text-sm font-medium">{REASON_LABELS[r.reasonCode] || r.reasonCode}</p>
              {r.customerDescription && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.customerDescription}</p>}
              {r.customerEvidence?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.customerEvidence.map((url, i) => (
                    <button key={i} onClick={() => setEvViewer(r.customerEvidence)} className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 hover:ring-2 hover:ring-blue-400">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reverse Logistics Tracking */}
            {r.trackingId && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-900/20">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Reverse Pickup Tracking</p>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Courier: {r.courierName || "Standard Carrier"}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">AWB Tracking ID: <span className="font-semibold text-slate-900 dark:text-slate-200">{r.trackingId}</span></p>
                  </div>
                  {r.trackingUrl && (
                    <a href={r.trackingUrl} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-sky-700 hover:text-sky-800 underline underline-offset-2">
                      Track Package ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {canCreatePickup && (
                <button onClick={doCreatePickup} disabled={actionLoading} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                  {actionLoading ? "…" : "Approve & Create Reverse Pickup"}
                </button>
              )}
              {canReceive && (
                <button onClick={doReceived} disabled={actionLoading} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
                  {actionLoading ? "…" : "Mark as Received"}
                </button>
              )}
              {canInspect && (
                <>
                  <button onClick={doAccept} disabled={actionLoading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {actionLoading ? "…" : "Accept Return"}
                  </button>
                  <button onClick={() => setShowDispute(true)} disabled={actionLoading} className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">
                    Dispute Return
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {evViewer && <ImageViewer images={evViewer} onClose={() => setEvViewer(null)} />}
      {showDispute && <DisputeModal returnId={id} onClose={() => setShowDispute(false)} onDone={() => { onAction(); onClose(); }} />}
    </div>
  );
}

// ── Main Vendor Returns Page
export function VendorReturnsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorReturnService.list({ status: statusFilter || undefined, page });
      setData(res);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load returns.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  const returns = data?.returns || [];
  const pagination = data?.pagination;

  return (
    <VendorSection title="Returns & Refunds" description="Manage approved return requests assigned to your store.">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <option value="">All Statuses</option>
          {["ADMIN_APPROVED","RETURN_IN_TRANSIT","VENDOR_RECEIVED","VENDOR_INSPECTION","ACCEPTED","VENDOR_DISPUTED","ADMIN_DISPUTE_REVIEW","REFUND_PENDING","REFUNDED","RETURN_REJECTED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">Refresh</button>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading && <div className="py-8 text-center text-sm text-slate-500">Loading…</div>}

      {!loading && (
        <>
          <VendorDataTable
            emptyMessage="No return requests have been approved for your store yet."
            rows={returns.map((r) => ({
              id: r._id,
              order: r.orderId?.orderNumber || "—",
              product: r.productName || "—",
              qty: r.quantity,
              reason: REASON_LABELS[r.reasonCode] || r.reasonCode,
              refund: formatCurrency(r.refundAmount || 0),
              status: r.status,
              date: new Date(r.createdAt).toLocaleDateString(),
            }))}
            columns={[
              { key: "order", label: "Order" },
              { key: "product", label: "Product" },
              { key: "qty", label: "Qty" },
              { key: "reason", label: "Reason" },
              { key: "refund", label: "Refund" },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
              { key: "date", label: "Date" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <button onClick={() => setSelectedId(row.id)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Manage
                  </button>
                ),
              },
            ]}
          />

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">Total: {pagination.total}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-40">Prev</button>
                <span className="px-2 text-xs text-slate-500">{page} / {pagination.pages}</span>
                <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedId && (
        <VendorReturnDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onAction={() => { void load(); }}
        />
      )}
    </VendorSection>
  );
}
