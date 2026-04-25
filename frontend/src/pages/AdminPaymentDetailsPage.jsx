import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import * as paymentService from "../services/paymentService";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function AdminPaymentDetailsPage() {
  const { paymentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    paymentService
      .getPaymentDetails(paymentId)
      .then((response) => setData(response.data))
      .catch((err) => setError(normalizeError(err)));
  }, [paymentId]);

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!data) {
    return <div className="text-sm text-slate-500">Loading payment details...</div>;
  }

  const { payment, refunds = [], webhookEvents = [] } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Payment details</h1>
          <p className="mt-1 text-sm text-slate-600">Verification status, linked orders, and webhook audit trail.</p>
        </div>
        <Link to="/admin/payments" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
          Back
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard label="Payment amount" value={formatCurrency(payment.amount || 0)} />
        <InfoCard label="Signature status" value={payment.razorpaySignature ? "Verified" : "Pending"} />
        <InfoCard label="Refund status" value={payment.refundStatus || "NONE"} />
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Gateway record</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <KeyValue label="Razorpay order" value={payment.razorpayOrderId || "N/A"} />
          <KeyValue label="Razorpay payment" value={payment.razorpayPaymentId || "N/A"} />
          <KeyValue label="Method" value={payment.method} />
          <KeyValue label="Status" value={<StatusBadge value={payment.status} />} />
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Webhook logs</h2>
        <div className="mt-4 grid gap-3">
          {webhookEvents.length ? webhookEvents.map((event) => (
            <div key={event._id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-slate-950">{event.eventType}</div>
                <StatusBadge value={event.status} />
              </div>
              <div className="mt-1 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</div>
            </div>
          )) : <div className="text-sm text-slate-500">No webhook records yet.</div>}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Refund records</h2>
        <div className="mt-4 grid gap-3">
          {refunds.length ? refunds.map((refund) => (
            <div key={refund._id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-slate-950">{formatCurrency(refund.amount || 0)}</div>
                <StatusBadge value={refund.status} />
              </div>
              <div className="mt-1 text-sm text-slate-600">{refund.reason}</div>
            </div>
          )) : <div className="text-sm text-slate-500">No refunds recorded.</div>}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function KeyValue({ label, value }) {
  return (
    <div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}
