import { formatCurrency } from "../utils/formatCurrency";

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function titleStatus(value) {
  const label = String(value || "Pending").trim();
  return label.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPaymentMeta(order = {}) {
  const method = normalize(order.paymentMethod || order.priceBreakdown?.paymentMethod || order.pricingSnapshot?.paymentMethod);
  const mode = normalize(order.paymentMode);
  const advanceAmount = Number(order.advanceAmount ?? order.codAdvance?.advanceAmount ?? 0);
  const remainingAmount = Number(order.remainingCODAmount ?? order.codAdvance?.remainingCODAmount ?? 0);
  const advanceStatus = normalize(order.advancePaymentStatus || order.codAdvance?.paymentStatus);
  const paymentStatus = String(order.paymentStatus || "Pending").trim();
  const isCod = method === "COD" || mode === "COD" || mode === "COD_ADVANCE";
  const hasCodAdvance = isCod && (mode === "COD_ADVANCE" || order.codAdvance?.enabled || advanceAmount > 0);

  if (hasCodAdvance) {
    const advancePaid = advanceStatus === "PAID" || ["Partially Paid", "Paid", "Refunded", "Partially Refunded"].includes(paymentStatus);
    return {
      methodLabel: "COD advance",
      statusLabel: advancePaid
        ? `Advance paid ${formatCurrency(advanceAmount)}`
        : titleStatus(order.advancePaymentStatus || paymentStatus),
      detailLabel: remainingAmount > 0 ? `COD balance ${formatCurrency(remainingAmount)}` : "No COD balance",
      tone: paymentStatus === "Paid" ? "success" : advancePaid ? "warning" : "neutral",
    };
  }

  if (isCod) {
    return {
      methodLabel: "COD",
      statusLabel: paymentStatus === "Paid" ? "Collected" : "Pay on delivery",
      detailLabel: titleStatus(paymentStatus),
      tone: paymentStatus === "Paid" ? "success" : "neutral",
    };
  }

  return {
    methodLabel: "Online",
    statusLabel: titleStatus(paymentStatus),
    detailLabel: order.razorpayPaymentId || order.paymentRecordId?.razorpayPaymentId || "",
    tone: paymentStatus === "Paid" ? "success" : paymentStatus.includes("Refund") ? "refund" : "neutral",
  };
}

const TONES = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800",
  warning: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800",
  refund: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-800",
  neutral: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
};

export function OrderPaymentSummary({ order }) {
  const meta = getPaymentMeta(order);

  return (
    <div className="min-w-[9rem]">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${TONES[meta.tone] || TONES.neutral}`}>
        {meta.methodLabel}
      </span>
      <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">{meta.statusLabel}</div>
      {meta.detailLabel ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta.detailLabel}</div> : null}
    </div>
  );
}
