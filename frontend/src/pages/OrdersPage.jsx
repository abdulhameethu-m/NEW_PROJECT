import { useEffect, useState } from "react";
import { requestInput } from "../services/notificationService";
import { Link } from "react-router-dom";
import { CancelOrderModal } from "../components/CancelOrderModal";
import { StatusBadge } from "../components/StatusBadge";
import { Package, Store, FileText, MapPin, X, CornerUpLeft } from "lucide-react";
import {
  confirmUserOrderCancellation,
  downloadUserInvoice,
  getUserOrders,
  previewUserOrderCancellation,
  requestUserReturn,
} from "../services/userService";
import { formatCurrency } from "../utils/formatCurrency";
import { SellerCard, VisitStoreButton } from "../components/seller/SellerNavigation";
import { ensureRazorpay } from "../utils/razorpayLoader";
import { verifyCancellationFeePayment } from "../services/paymentService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to load orders.";
}

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  async function loadOrders(nextStatus = status) {
    setLoading(true);
    try {
      const response = await getUserOrders({ page: 1, limit: 20, ...(nextStatus ? { status: nextStatus } : {}) });
      setOrders(response.data?.orders || []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    getUserOrders({ page: 1, limit: 20, ...(status ? { status } : {}) })
      .then((response) => {
        setOrders(response.data?.orders || []);
        setError("");
      })
      .catch((err) => {
        setError(normalizeError(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status]);

  async function cancelOrderPreview(orderId, payload = {}) {
    setCancelLoading(true);
    try {
      const response = await previewUserOrderCancellation(orderId, payload);
      setCancelPreview(response.data || response);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
      setCancelPreview(null);
    } finally {
      setCancelLoading(false);
    }
  }

  async function confirmCancelOrder(payload = {}) {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const response = await confirmUserOrderCancellation(cancelTarget._id, payload);
      const result = response.data || response;
      if (result?.requiresCancellationFeePayment) {
        await ensureRazorpay();
        const feePayment = result.cancellationFeePayment || {};
        await new Promise((resolve, reject) => {
          const checkout = new window.Razorpay({
            key: feePayment.key || feePayment.key_id,
            amount: feePayment.amount,
            currency: feePayment.currency || "INR",
            name: "Cancellation Fee",
            description: feePayment.description || `Cancellation charge for order ${result.orderNumber || cancelTarget.orderNumber}`,
            order_id: feePayment.razorpay_order_id || feePayment.razorpayOrderId,
            prefill: {
              name: cancelTarget.shippingAddress?.fullName || cancelTarget.userId?.name || "",
              contact: cancelTarget.shippingAddress?.phone || "",
            },
            notes: {
              orderNumber: result.orderNumber || cancelTarget.orderNumber,
              reason: payload.reason || "",
            },
            handler: async (paymentResult) => {
              try {
                await verifyCancellationFeePayment({
                  orderId: cancelTarget._id,
                  reason: payload.reason,
                  notes: payload.notes,
                  razorpay_order_id: paymentResult.razorpay_order_id,
                  razorpay_payment_id: paymentResult.razorpay_payment_id,
                  razorpay_signature: paymentResult.razorpay_signature,
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Cancellation requires payment of the cancellation fee.")),
            },
            theme: { color: "#0f172a" },
          });
          checkout.on?.("payment.failed", (failure) => {
            reject(new Error(failure?.error?.description || "Payment failed. Cancellation not completed."));
          });
          checkout.open();
        });
      }
      setCancelTarget(null);
      setCancelPreview(null);
      setError("");
      await loadOrders();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setCancelLoading(false);
    }
  }

  async function requestReturn(orderId) {
    const reason = await requestInput({ title: "Request return", label: "Reason for return", multiline: true });
    if (!reason) return;

    setBusyId(orderId);
    try {
      await requestUserReturn(orderId, { reason });
      await loadOrders();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyId("");
    }
  }

  async function downloadInvoice(orderId) {
    setBusyId(orderId);
    try {
      await downloadUserInvoice(orderId);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Orders</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track orders, download invoices, and manage cancellations or returns.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["", "Pending", "Shipped", "Delivered", "Returned", "Cancelled"].map((value) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                status === value
                  ? "bg-indigo-600 text-white shadow-md dark:bg-indigo-500"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {value || "All"}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => {
            const cancellationLocked = ["REQUESTED", "APPROVED", "CANCELLED"].includes(order?.cancellation?.status);
            const canCancel = typeof order?.cancellationEligible === "boolean" ? order.cancellationEligible : (["Pending", "Placed"].includes(order.status) && !cancellationLocked);
            const canReturn = order.returnEligible === true;

            return (
              <div key={order._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{order.orderNumber}</div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={order.status} />
                    <StatusBadge value={order.paymentStatus} />
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  <SellerCard seller={order.sellerId} compact />
                  {(order.items || []).map((item) => (
                    <div key={`${order._id}-${item.productId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.5 dark:border-slate-800">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Quantity: {item.quantity}</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[15px] font-bold text-slate-950 dark:text-white">
                      Total: {formatCurrency(order.totalAmount || 0)}
                    </div>
                    {order.refundSummary?.status && order.refundSummary.status !== "NONE" ? (
                      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={order.refundSummary.status} />
                          <span>Refund Amount {formatCurrency(order.refundSummary.amount || 0)}</span>
                          <span>Deduction {formatCurrency(order.refundSummary.deductionAmount || 0)}</span>
                        </div>
                        {order.refundSummary.status === "PENDING" ? (
                          <div>Refund is being processed by finance team.</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={order.sellerId?.storeSlug ? `/vendor/${order.sellerId.storeSlug}` : "#"}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-indigo-100 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-50 active:scale-95 dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      <Store className="h-3 w-3" />
                      Visit Seller Store
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === order._id}
                      onClick={() => downloadInvoice(order._id)}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100 active:scale-95 disabled:opacity-50 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                    >
                      <FileText className="h-3 w-3" />
                      Download Invoice
                    </button>
                    <Link
                      to={`/orders/${order._id}`}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-indigo-100 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-50 active:scale-95 dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      <MapPin className="h-3 w-3" />
                      Track Order
                    </Link>
                    <button
                      type="button"
                      disabled={!canCancel || busyId === order._id}
                      onClick={() => {
                        setCancelTarget(order);
                        setCancelPreview(null);
                        void cancelOrderPreview(order._id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rose-100 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 active:scale-95 disabled:opacity-50 dark:border-rose-500/20 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!canReturn || busyId === order._id}
                      onClick={() => requestReturn(order._id)}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <CornerUpLeft className="h-3 w-3" />
                      Return Order
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No orders found for this filter.
        </div>
      )}

      <CancelOrderModal
        open={Boolean(cancelTarget)}
        loading={cancelLoading}
        preview={cancelPreview}
        onClose={() => {
          setCancelTarget(null);
          setCancelPreview(null);
        }}
        onPreview={(payload) => cancelOrderPreview(cancelTarget?._id, payload)}
        onConfirm={confirmCancelOrder}
      />
    </div>
  );
}
