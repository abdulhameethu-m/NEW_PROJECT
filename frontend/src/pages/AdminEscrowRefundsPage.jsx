import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Eye, RefreshCw, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import {
  FinanceField,
  FinanceInfoBanner,
  FinanceInput,
  FinanceModal,
  FinanceTabs,
  FinanceTextarea,
  formatFinanceDateTime,
} from "../components/finance/FinanceComponents";
import CampaignEscrowService from "../services/campaignEscrowService";
import { formatCurrency } from "../utils/formatCurrency";

const financeTabs = [
  { label: "Payout Management", to: "/admin/finance/payouts" },
  { label: "Escrow Refunds", to: "/admin/finance/escrow-refunds" },
  { label: "Invoices", to: "/admin/finance/invoices" },
];

const refundReasons = [
  { value: "campaign_expired", label: "Campaign expired" },
  { value: "influencer_no_show", label: "Influencer no-show" },
  { value: "rejected_deliverables", label: "Rejected deliverables" },
  { value: "vendor_cancelled", label: "Vendor cancelled" },
  { value: "mutual_cancellation", label: "Mutual cancellation" },
  { value: "admin_decision", label: "Admin decision" },
  { value: "submission_deadline_expired", label: "Submission deadline expired" },
  { value: "pending_sla_breached", label: "Pending review SLA breached" },
  { value: "other", label: "Other" },
];

function getEntityName(entity, fallback = "Not available") {
  if (!entity) return fallback;
  if (typeof entity === "string") return entity;
  return entity.companyName || entity.shopName || entity.displayName || entity.username || entity.handle || entity.name || entity._id || fallback;
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || "Escrow refund request failed.";
}

function StatusBadge({ value }) {
  const key = String(value || "unknown").toLowerCase();
  const tone = key.includes("completed")
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : key.includes("failed") || key.includes("rejected")
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : key.includes("requested") || key.includes("approved") || key.includes("processing")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-sky-200 bg-sky-50 text-sky-700";
  return (
    <span className={`inline-flex rounded-2xl border px-2.5 py-1 text-xs font-semibold leading-snug ${tone}`}>
      {String(value || "unknown").replace(/_/g, " ")}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950">
          {createElement(Icon, { size: 18 })}
        </div>
      </div>
    </div>
  );
}

function RefundModal({ target, loading, onClose, onSubmit }) {
  const [form, setForm] = useState({ refundAmount: "", reason: "admin_decision", notes: "" });

  useEffect(() => {
    if (!target) return;
    setForm({
      refundAmount: String(target.refundAmount || target.eligibility?.refundAmount || ""),
      reason: target.refundReason || target.eligibility?.reason || "admin_decision",
      notes: "",
    });
  }, [target]);

  if (!target) return null;
  const available = Number(target.refundAmount || target.eligibility?.refundAmount || 0);
  const amount = Number(form.refundAmount || 0);
  const invalidAmount = amount <= 0 || amount > available;

  return (
    <FinanceModal
      open={Boolean(target)}
      title="Approve escrow refund"
      description="Admin finance can refund only unreleased fixed reward escrow for Fixed and Hybrid campaigns."
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || invalidAmount}
            onClick={() => onSubmit({ ...form, refundAmount: amount })}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            Approve & Refund
          </button>
        </>
      )}
    >
      <FinanceInfoBanner title={target.campaignTitle}>
        Vendor: {getEntityName(target.vendor)} · Influencer: {getEntityName(target.influencer)} · {String(target.paymentModel || "").toUpperCase()}
      </FinanceInfoBanner>
      <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
        <div className="flex justify-between gap-4"><span className="text-slate-500">Escrow amount</span><span className="font-semibold">{formatCurrency(target.escrowAmount)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Already released</span><span className="font-semibold">{formatCurrency(target.releasedAmount)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Already refunded</span><span className="font-semibold">{formatCurrency(target.alreadyRefunded)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Refundable balance</span><span className="font-bold text-emerald-600">{formatCurrency(available)}</span></div>
      </div>
      <FinanceField label="Refund Amount" hint="Cannot exceed the unreleased fixed reward escrow.">
        <FinanceInput type="number" min="1" max={available} value={form.refundAmount} onChange={(event) => setForm((current) => ({ ...current, refundAmount: event.target.value }))} />
      </FinanceField>
      {invalidAmount ? <FinanceInfoBanner tone="error">Refund amount must be greater than zero and cannot exceed {formatCurrency(available)}.</FinanceInfoBanner> : null}
      <FinanceField label="Refund Reason">
        <select
          value={form.reason}
          onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {refundReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
        </select>
      </FinanceField>
      <FinanceField label="Admin Notes">
        <FinanceTextarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Internal finance note for audit trail" />
      </FinanceField>
    </FinanceModal>
  );
}

function RejectModal({ target, loading, onClose, onSubmit }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (target) setReason("");
  }, [target]);

  if (!target) return null;

  return (
    <FinanceModal
      open={Boolean(target)}
      title="Reject refund request"
      description="Rejecting a refund keeps the escrow locked for the campaign workflow."
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
          <button type="button" disabled={loading || !reason.trim()} onClick={() => onSubmit(reason)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Reject</button>
        </>
      )}
    >
      <FinanceInfoBanner tone="warning" title={target.campaignTitle}>
        This action is audited and visible to finance administrators.
      </FinanceInfoBanner>
      <FinanceField label="Rejection Reason">
        <FinanceTextarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this escrow cannot be refunded." />
      </FinanceField>
    </FinanceModal>
  );
}

function DeliverableRefundModal({ open, data, loading, actionLoading, onClose, onRefund }) {
  const deliverables = data?.deliverables || [];
  const campaign = data?.campaign || {};
  const escrow = data?.escrow || {};

  return (
    <FinanceModal
      open={open}
      title="Deliverable refund details"
      description="Refund is enabled only for an overdue deliverable that has no approved, published, or released payment."
      onClose={onClose}
      maxWidth="max-w-5xl"
      footer={(
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          Close
        </button>
      )}
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
          Loading deliverables...
        </div>
      ) : (
        <div className="space-y-4">
          <FinanceInfoBanner title={campaign.title || "Campaign"}>
            Deadline: {formatFinanceDateTime(campaign.deadline)} · Escrow: {formatCurrency(escrow.escrowAmount || 0)} · Released: {formatCurrency(escrow.releasedAmount || 0)}
          </FinanceInfoBanner>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-[920px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="w-[180px] px-4 py-3">Deliverable</th>
                  <th className="w-[155px] px-4 py-3">Due Date</th>
                  <th className="w-[145px] px-4 py-3">Rate</th>
                  <th className="w-[235px] px-4 py-3">Status</th>
                  <th className="w-[140px] px-4 py-3">Refund</th>
                  <th className="w-[180px] px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deliverables.length ? deliverables.map((deliverable, index) => {
                  const refund = deliverable.refund || {};
                  return (
                    <tr key={deliverable.id || index} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-950 dark:text-white">
                          {deliverable.title || `Deliverable ${index + 1}`}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                          {deliverable.type || "deliverable"} · Qty {deliverable.quantity || 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="block max-w-[130px] leading-relaxed">{formatFinanceDateTime(deliverable.dueDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-950 dark:text-white">{formatCurrency(deliverable.rate || deliverable.unitPrice || 0)}</div>
                        <div className="mt-1 text-xs text-slate-500">Unit {formatCurrency(deliverable.unitPrice || 0)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[210px]">
                          <StatusBadge value={refund.statusLabel || deliverable.status || "pending"} />
                        </div>
                        {deliverable.latestSubmission ? (
                          <div className="mt-1 text-xs text-slate-500">Submitted {formatFinanceDateTime(deliverable.latestSubmission.submittedAt)}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-emerald-600">{formatCurrency(refund.amount || 0)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Remaining {formatCurrency(deliverable.allocation?.remainingAmount || 0)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!refund.enabled || actionLoading}
                          onClick={() => onRefund(deliverable)}
                          className="whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {refund.enabled ? `Refund ${formatCurrency(refund.amount || 0)}` : "Refund Disabled"}
                        </button>
                        {!refund.enabled && refund.disabledReason ? (
                          <div className="mt-2 max-w-48 text-xs text-slate-500">{refund.disabledReason}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No deliverables found for this campaign.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </FinanceModal>
  );
}

export function AdminEscrowRefundsPage() {
  const [data, setData] = useState({ cards: {}, rows: [] });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [refundTarget, setRefundTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await CampaignEscrowService.listEscrowRefundDashboard({ status, limit: 100 });
      setData(result || { cards: {}, rows: [] });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const rows = data.rows || [];

  const metrics = useMemo(() => {
    const cards = data.cards || {};
    return [
    { label: "Pending Refund", value: cards.pendingRefund || 0, icon: AlertCircle, hint: "Eligible/requested fixed escrow" },
    { label: "Refunded Today", value: cards.refundedToday || 0, icon: CheckCircle2, hint: "Completed today" },
    { label: "Refund Value", value: formatCurrency(cards.refundValue || 0), icon: RotateCcw, hint: "Visible queue value" },
    { label: "Refund Requests", value: cards.refundRequests || 0, icon: ShieldCheck, hint: "Awaiting admin action" },
    { label: "Expired Campaigns", value: cards.expiredCampaigns || 0, icon: AlertCircle, hint: "Deadline/expiry based" },
    { label: "Pending Escrow", value: formatCurrency(cards.pendingEscrow || 0), icon: Wallet, hint: "Unreleased balance" },
    { label: "Released Escrow", value: formatCurrency(cards.releasedEscrow || 0), icon: Wallet, hint: "Blocked from refund" },
    ];
  }, [data.cards]);

  async function handleRefund(payload) {
    if (!refundTarget) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      let refundId = refundTarget.refundId;
      if (!refundId) {
        const created = await CampaignEscrowService.createAdminEscrowRefund(refundTarget.campaignId, payload);
        refundId = created?._id || created?.refundId;
      }
      if (!refundId) throw new Error("Refund request was not created.");
      await CampaignEscrowService.approveAndProcessRefund(refundId, {
        approvalReason: payload.notes || "Approved by admin finance",
        notes: payload.notes,
      });
      setMessage("Escrow refund approved and sent to the original payment method.");
      setRefundTarget(null);
      await loadDashboard();
    } catch (refundError) {
      setError(getErrorMessage(refundError));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(reason) {
    if (!rejectTarget?.refundId) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      await CampaignEscrowService.rejectRefund(rejectTarget.refundId, reason);
      setMessage("Refund request rejected.");
      setRejectTarget(null);
      await loadDashboard();
    } catch (rejectError) {
      setError(getErrorMessage(rejectError));
    } finally {
      setActionLoading(false);
    }
  }

  async function openDeliverableDetails(row) {
    setDetailTarget(row);
    setDetailData(null);
    setDetailLoading(true);
    setError("");
    try {
      const result = await CampaignEscrowService.getEscrowRefundDeliverables(row.campaignId);
      setDetailData(result);
    } catch (detailsError) {
      setError(getErrorMessage(detailsError));
      setDetailTarget(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDeliverableRefund(deliverable) {
    if (!detailTarget?.campaignId || !deliverable?.id) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      await CampaignEscrowService.refundEscrowDeliverable(detailTarget.campaignId, deliverable.id, {
        refundAmount: deliverable.refund?.amount,
        reason: "submission_deadline_expired",
        notes: `${deliverable.title || deliverable.type || "Deliverable"} due date expired without published content.`,
      });
      setMessage("Deliverable refund processed to the vendor's original payment method.");
      const refreshed = await CampaignEscrowService.getEscrowRefundDeliverables(detailTarget.campaignId);
      setDetailData(refreshed);
      await loadDashboard();
    } catch (refundError) {
      setError(getErrorMessage(refundError));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <FinanceTabs items={financeTabs} />

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Admin Finance</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Escrow Refunds</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Fixed and Hybrid campaign refund control for unreleased fixed reward escrow only.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All statuses</option>
            <option value="refund_eligible">Refund eligible</option>
            <option value="awaiting_upload">Awaiting upload</option>
            <option value="upload_expired">Upload expired</option>
            <option value="refund_requested">Refund requested</option>
            <option value="refund_processing">Refund processing</option>
            <option value="refund_completed">Refund completed</option>
            <option value="refund_failed">Refund failed</option>
          </select>
          <button type="button" onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {message ? <FinanceInfoBanner title="Success">{message}</FinanceInfoBanner> : null}
      {error ? <FinanceInfoBanner tone="error" title="Refund action failed">{error}</FinanceInfoBanner> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Refund Queue</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Released payments, wallet credits, completed campaigns, and approved deliverables are blocked by backend validation.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Influencer</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Escrow</th>
                <th className="px-4 py-3">Released</th>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500">Loading escrow refunds...</td></tr>
              ) : rows.length ? rows.map((row) => {
                const canRefund = row.refundEligible && !["refund_completed", "refund_processing", "refund_rejected"].includes(row.status);
                const canReject = Boolean(row.refundId) && ["requested", "refund_requested"].includes(row.rawStatus || row.status);
                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950 dark:text-white">{row.campaignTitle}</div>
                      <div className="mt-1 max-w-36 truncate text-xs text-slate-500">{row.campaignId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getEntityName(row.vendor)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getEntityName(row.influencer)}</td>
                    <td className="px-4 py-3 font-semibold uppercase text-slate-700 dark:text-slate-200">{row.paymentModel}</td>
                    <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{formatCurrency(row.escrowAmount)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(row.releasedAmount)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(row.refundAmount)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.refundReasonLabel}</td>
                    <td className="px-4 py-3"><StatusBadge value={row.statusLabel || row.status} /></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatFinanceDateTime(row.deadline)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openDeliverableDetails(row)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          <Eye size={14} /> View
                        </button>
                        <button type="button" disabled={!canRefund || actionLoading} onClick={() => setRefundTarget(row)} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                          {row.refundId ? "Approve Refund" : "Force Refund"}
                        </button>
                        <button type="button" disabled={!canReject || actionLoading} onClick={() => setRejectTarget(row)} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                          Reject
                        </button>
                        {row.gatewayRefundId ? (
                          <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                            <Download size={14} /> Receipt
                          </button>
                        ) : null}
                      </div>
                      {row.failureReason ? <div className="mt-2 text-xs text-rose-600">{row.failureReason}</div> : null}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500">No fixed/hybrid escrow refund records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RefundModal target={refundTarget} loading={actionLoading} onClose={() => setRefundTarget(null)} onSubmit={handleRefund} />
      <RejectModal target={rejectTarget} loading={actionLoading} onClose={() => setRejectTarget(null)} onSubmit={handleReject} />
      <DeliverableRefundModal
        open={Boolean(detailTarget)}
        data={detailData}
        loading={detailLoading}
        actionLoading={actionLoading}
        onClose={() => {
          setDetailTarget(null);
          setDetailData(null);
        }}
        onRefund={handleDeliverableRefund}
      />
    </div>
  );
}
