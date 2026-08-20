import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import adminReturnService from "../services/adminReturn.service";

const REASON_LABELS = {
  DAMAGED: "Damaged",
  DEFECTIVE: "Defective",
  WRONG_ITEM: "Wrong Item",
  WRONG_VARIANT: "Wrong Variant",
  NOT_AS_DESCRIBED: "Not as Described",
  MISSING_ITEM: "Missing Item",
  QUALITY_ISSUE: "Quality Issue",
  SIZE_ISSUE: "Size Issue",
  OTHER: "Other",
};

const VENDOR_DISPUTE_REASON_LABELS = {
  CUSTOMER_DAMAGED: "Customer Damaged",
  WRONG_PRODUCT_RETURNED: "Wrong Product Returned",
  MISSING_PARTS: "Missing Parts",
  USED_PRODUCT: "Used Product",
  TAMPERED_PRODUCT: "Tampered Product",
  WRONG_VARIANT_RETURNED: "Wrong Variant Returned",
  OTHER: "Other",
};

const STAT_CARDS = [
  { key: "pendingReview", label: "Pending Review", color: "amber" },
  { key: "approved", label: "Approved/In Transit", color: "sky" },
  { key: "vendorInspection", label: "Vendor Inspection", color: "blue" },
  { key: "disputes", label: "Disputes", color: "rose" },
  { key: "refundPending", label: "Refund Pending", color: "violet" },
  { key: "refunded", label: "Refunded", color: "emerald" },
];

const COLOR_MAP = {
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300",
  violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
};

// ── Image Viewer Modal
function ImageViewer({ images = [], onClose }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative flex max-h-screen max-w-2xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow">✕</button>
        <img src={images[idx]} alt={`Evidence ${idx + 1}`} className="max-h-[70vh] rounded-xl object-contain shadow-xl" />
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((url, i) => (
              <button key={url} onClick={() => setIdx(i)} className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${i === idx ? "border-blue-500" : "border-transparent"}`}>
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Timeline Component
function Timeline({ events = [] }) {
  if (!events.length) return <p className="text-sm text-slate-500">No events yet.</p>;
  const icons = { ADMIN_APPROVED: "✓", ADMIN_REJECTED: "✕", VENDOR_RECEIVED: "📦", VENDOR_DISPUTED: "⚠", REFUNDED: "✓", RETURN_REQUESTED: "↩" };
  return (
    <ol className="space-y-3">
      {[...events].reverse().map((ev, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs dark:bg-slate-800">
            {icons[ev.action] || "·"}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{ev.action?.replace(/_/g, " ")}</p>
            {ev.reason && <p className="text-xs text-slate-500">{ev.reason}</p>}
            {ev.note && <p className="text-xs text-slate-500">{ev.note}</p>}
            <p className="text-xs text-slate-400">{ev.actorRole} · {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Return Detail Modal
function ReturnDetailModal({ id, onClose, onAction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evViewer, setEvViewer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [disputeDecision, setDisputeDecision] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  useEffect(() => {
    adminReturnService.getById(id).then((r) => { setData(r.data); setLoading(false); }).catch((e) => { setError(e?.response?.data?.message || "Failed to load"); setLoading(false); });
  }, [id]);

  async function doApprove() {
    setActionLoading(true);
    try { await adminReturnService.approve(id, approveNote); onAction(); onClose(); }
    catch (e) { setError(e?.response?.data?.message || "Failed"); }
    finally { setActionLoading(false); }
  }
  async function doReject() {
    if (!rejectReason.trim()) return setError("Rejection reason is required");
    setActionLoading(true);
    try { await adminReturnService.reject(id, rejectReason); onAction(); onClose(); }
    catch (e) { setError(e?.response?.data?.message || "Failed"); }
    finally { setActionLoading(false); }
  }
  async function doResolve() {
    if (!disputeDecision || !disputeReason.trim()) return setError("Both decision and reason are required");
    setActionLoading(true);
    try { await adminReturnService.resolveDispute(id, disputeDecision, disputeReason); onAction(); onClose(); }
    catch (e) { setError(e?.response?.data?.message || "Failed"); }
    finally { setActionLoading(false); }
  }

  const r = data;
  const canApprove = r && ["REQUESTED", "ADMIN_REVIEW"].includes(r.status);
  const canReject = r && ["REQUESTED", "ADMIN_REVIEW"].includes(r.status);
  const canResolveDispute = r && ["VENDOR_DISPUTED", "ADMIN_DISPUTE_REVIEW"].includes(r.status);

  return (
    <div className="fixed inset-0 z-40 flex justify-end overflow-hidden bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Return Details</h2>
            <p className="text-xs text-slate-500">{id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">Close</button>
        </div>

        {loading && <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-500">Loading…</div>}
        {!loading && !r && <div className="p-6 text-rose-600">{error || "Not found"}</div>}
        {error && !loading && r && <div className="mx-6 mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {r && (
          <div className="flex-1 space-y-6 p-6">
            {/* Status + Badge */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge value={r.status} />
              {r.refundId && <StatusBadge value={`Refund: ${r.refundId.status || r.refundId}`} />}
            </div>

            {/* Product & Order */}
            <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Order & Product</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Order</p><p className="font-medium">{r.orderId?.orderNumber || "—"}</p></div>
                <div><p className="text-slate-500">Product</p><p className="font-medium">{r.productName || "—"}</p></div>
                <div><p className="text-slate-500">Variant</p><p className="font-medium">{r.variantTitle || r.variantSku || "—"}</p></div>
                <div><p className="text-slate-500">Qty</p><p className="font-medium">{r.quantity}</p></div>
                <div><p className="text-slate-500">Unit Price</p><p className="font-medium">{formatCurrency(r.unitPrice)}</p></div>
                <div><p className="text-slate-500">Refund Amount</p><p className="font-medium text-violet-600">{formatCurrency(r.refundAmount)}</p></div>
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Customer</p>
              <div className="mt-2 text-sm">
                <p className="font-medium">{r.customerId?.name || "—"}</p>
                <p className="text-slate-500">{r.customerId?.email}</p>
              </div>
              <p className="mt-3 text-xs text-slate-500">Reason Code</p>
              <p className="font-medium text-sm">{REASON_LABELS[r.reasonCode] || r.reasonCode}</p>
              {r.customerDescription && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{r.customerDescription}</p>}
              {r.customerEvidence?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2">Customer Evidence ({r.customerEvidence.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {r.customerEvidence.map((url, i) => (
                      <button key={i} onClick={() => setEvViewer({ images: r.customerEvidence, start: i })} className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 hover:ring-2 hover:ring-blue-400">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vendor Dispute Evidence */}
            {r.vendorDecision?.decision === "DISPUTED" && (
              <div className="rounded-2xl border border-rose-100 p-4 dark:border-rose-900/30">
                <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">Vendor Dispute</p>
                <p className="mt-2 text-sm font-medium">{VENDOR_DISPUTE_REASON_LABELS[r.vendorDecision.reasonCode] || r.vendorDecision.reasonCode}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.vendorDecision.description}</p>
                {r.vendorDecision.evidence?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.vendorDecision.evidence.map((url, i) => (
                      <button key={i} onClick={() => setEvViewer({ images: r.vendorDecision.evidence, start: i })} className="h-16 w-16 overflow-hidden rounded-xl border border-rose-200 hover:ring-2 hover:ring-rose-400">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {canApprove && (
                <button onClick={() => setShowApprove(!showApprove)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  Approve Return
                </button>
              )}
              {canReject && (
                <button onClick={() => setShowReject(!showReject)} className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">
                  Reject Return
                </button>
              )}
              {canResolveDispute && (
                <button onClick={() => setShowDispute(!showDispute)} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
                  Resolve Dispute
                </button>
              )}
            </div>

            {/* Approve Form */}
            {showApprove && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">Approve Return</p>
                <textarea rows={2} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} placeholder="Optional note for customer…" className="w-full rounded-xl border border-emerald-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                <button onClick={doApprove} disabled={actionLoading} className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {actionLoading ? "Processing…" : "Confirm Approve"}
                </button>
              </div>
            )}

            {/* Reject Form */}
            {showReject && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-900/10">
                <p className="text-sm font-medium text-rose-800 dark:text-rose-300 mb-2">Reject Return</p>
                <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required)…" className="w-full rounded-xl border border-rose-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                <button onClick={doReject} disabled={actionLoading || !rejectReason.trim()} className="mt-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                  {actionLoading ? "Processing…" : "Confirm Reject"}
                </button>
              </div>
            )}

            {/* Dispute Resolution Form */}
            {showDispute && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/40 dark:bg-violet-900/10">
                <p className="text-sm font-medium text-violet-800 dark:text-violet-300 mb-3">Resolve Dispute</p>
                <div className="mb-3 flex gap-3">
                  {["CUSTOMER_WINS", "VENDOR_WINS"].map((d) => (
                    <button key={d} onClick={() => setDisputeDecision(d)} className={`rounded-xl border px-4 py-2 text-sm font-medium ${disputeDecision === d ? "border-violet-600 bg-violet-600 text-white" : "border-violet-300 bg-white text-violet-700 hover:bg-violet-100"}`}>
                      {d === "CUSTOMER_WINS" ? "Customer Wins (Refund)" : "Vendor Wins (Reject)"}
                    </button>
                  ))}
                </div>
                <textarea rows={2} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Resolution reason (required)…" className="w-full rounded-xl border border-violet-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                <button onClick={doResolve} disabled={actionLoading || !disputeDecision || !disputeReason.trim()} className="mt-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                  {actionLoading ? "Processing…" : "Submit Resolution"}
                </button>
              </div>
            )}

            {/* Timeline */}
            <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Timeline</p>
              <Timeline events={r.timeline || []} />
            </div>
          </div>
        )}
      </div>
      {evViewer && (
        <ImageViewer images={evViewer.images} onClose={() => setEvViewer(null)} />
      )}
    </div>
  );
}

// ── Main Admin Returns Page
export function AdminReturnsPage() {
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        adminReturnService.getStats(),
        adminReturnService.list({ status: statusFilter || undefined, page }),
      ]);
      setStats(statsRes.data);
      setData(listRes);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  const returns = data?.returns || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Return Management</h1>
        <p className="mt-1 text-sm text-slate-500">Review return requests, approve or reject, and manage vendor disputes.</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {STAT_CARDS.map(({ key, label, color }) => (
            <button key={key} onClick={() => { setStatusFilter(key === "pendingReview" ? "REQUESTED" : key === "disputes" ? "VENDOR_DISPUTED" : key === "refundPending" ? "REFUND_PENDING" : key === "refunded" ? "REFUNDED" : ""); setPage(1); }} className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${COLOR_MAP[color]}`}>
              <div className="text-2xl font-bold">{stats[key] ?? 0}</div>
              <div className="mt-1 text-xs font-medium">{label}</div>
            </button>
          ))}
        </div>
      )}

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <option value="">All Statuses</option>
          {["REQUESTED","ADMIN_REVIEW","ADMIN_APPROVED","ADMIN_REJECTED","RETURN_IN_TRANSIT","VENDOR_RECEIVED","VENDOR_INSPECTION","ACCEPTED","VENDOR_DISPUTED","ADMIN_DISPUTE_REVIEW","REFUND_PENDING","REFUND_INITIATED","REFUNDED","RETURN_REJECTED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">Refresh</button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading && <div className="p-8 text-center text-sm text-slate-500">Loading…</div>}
        {!loading && !returns.length && <div className="p-8 text-center text-sm text-slate-500">No return requests found.</div>}
        {!loading && returns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead>
                <tr>
                  {["Return ID","Order","Customer","Vendor","Product","Qty","Reason","Status","Refund","Created","Actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {returns.map((r) => (
                  <tr key={r._id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{String(r._id).slice(-8)}</td>
                    <td className="px-4 py-3 font-medium">{r.orderId?.orderNumber || "—"}</td>
                    <td className="px-4 py-3">{r.customerId?.name || "—"}</td>
                    <td className="px-4 py-3">{r.vendorId?.businessName || "—"}</td>
                    <td className="px-4 py-3 max-w-[120px] truncate" title={r.productName}>{r.productName || "—"}</td>
                    <td className="px-4 py-3">{r.quantity}</td>
                    <td className="px-4 py-3"><span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{REASON_LABELS[r.reasonCode] || r.reasonCode}</span></td>
                    <td className="px-4 py-3"><StatusBadge value={r.status} /></td>
                    <td className="px-4 py-3 text-violet-600 font-medium">{formatCurrency(r.refundAmount || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedId(r._id)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-500">Total: {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-40">Prev</button>
              <span className="px-2 text-xs text-slate-500">{page} / {pagination.pages}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Return Detail Drawer */}
      {selectedId && (
        <ReturnDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onAction={() => { void load(); setSelectedId(null); }}
        />
      )}
    </div>
  );
}
