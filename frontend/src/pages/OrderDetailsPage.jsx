import { useEffect, useMemo, useState } from "react";
import { requestInput } from "../services/notificationService";
import { Link, useParams } from "react-router-dom";
import { Package, History, User, CreditCard, ClipboardList, Store, Receipt, Truck, MapPin, Phone, Mail, Building2, Download, Eye, CornerUpLeft, XCircle, Check } from "lucide-react";
import { CancelOrderModal } from "../components/CancelOrderModal";
import { ReturnOrderModal } from "../components/ReturnOrderModal";
import {
  confirmUserOrderCancellation,
  downloadUserInvoice,
  getUserOrder,
  getUserOrderTracking,
  previewUserOrderCancellation,
  requestUserReturn,
} from "../services/userService";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { SellerCard, StoreRatingDisplay, VisitStoreButton } from "../components/seller/SellerNavigation";
import { UnifiedPricingBreakdown } from "../components/commerce/UnifiedPricingBreakdown";
import { ensureRazorpay } from "../utils/razorpayLoader";
import { verifyCancellationFeePayment } from "../services/paymentService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to load order details.";
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString();
}

function KeyValue({ label, value }) {
  return (
    <div className="min-w-0 w-full">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 min-w-0">{label}</div>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-200 break-words whitespace-normal min-w-0">{value || "Not available"}</div>
    </div>
  );
}

export function OrderDetailsPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [returnOpen, setReturnOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getUserOrder(orderId), getUserOrderTracking(orderId)])
      .then(([orderResponse, trackingResponse]) => {
        if (!cancelled) {
          setOrder(orderResponse.data);
          setTracking(trackingResponse.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(normalizeError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const canReturn = order?.returnEligible === true;
  const cancellationLocked = ["REQUESTED", "APPROVED", "CANCELLED"].includes(order?.cancellation?.status);
  const canCancel = typeof order?.cancellationEligible === "boolean" ? order.cancellationEligible : (["Pending", "Placed", "Packed", "Shipped", "Out for Delivery"].includes(order?.status) && !cancellationLocked);
  const timelineSteps = useMemo(() => order?.timeline?.steps || [], [order]);
  const timelineEvents = useMemo(() => tracking?.timeline || order?.timeline?.events || [], [order, tracking]);

  function handleReturn() {
    setReturnOpen(true);
  }

  async function handleSubmitReturn(payload, files) {
    setActionBusy(true);
    try {
      await requestUserReturn(payload, files);
      const [orderResponse, trackingResponse] = await Promise.all([getUserOrder(orderId), getUserOrderTracking(orderId)]);
      setOrder(orderResponse.data);
      setTracking(trackingResponse.data);
      setError("");
      setReturnOpen(false);
    } catch (err) {
      alert(normalizeError(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDownloadInvoice() {
    setActionBusy(true);
    try {
      await downloadUserInvoice(orderId);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function loadCancelPreview(payload = {}) {
    setActionBusy(true);
    try {
      const response = await previewUserOrderCancellation(orderId, payload);
      setCancelPreview(response.data || response);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmCancellation(payload = {}) {
    setActionBusy(true);
    try {
      const response = await confirmUserOrderCancellation(orderId, payload);
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
            description: feePayment.description || `Cancellation charge for order ${result.orderNumber || order?.orderNumber}`,
            order_id: feePayment.razorpay_order_id || feePayment.razorpayOrderId,
            prefill: {
              name: order?.shippingAddress?.fullName || order?.userId?.name || "",
              contact: order?.shippingAddress?.phone || "",
            },
            notes: {
              orderNumber: result.orderNumber || order?.orderNumber,
              reason: payload.reason || "",
            },
            handler: async (paymentResult) => {
              try {
                await verifyCancellationFeePayment({
                  orderId,
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
      const [orderResponse, trackingResponse] = await Promise.all([getUserOrder(orderId), getUserOrderTracking(orderId)]);
      setOrder(orderResponse.data);
      setTracking(trackingResponse.data);
      setCancelOpen(false);
      setCancelPreview(null);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (!order) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error || "Order not found."}</div>;
  }

  return (
    <div className="print-order-page grid grid-cols-1 gap-6 print:gap-3 w-full min-w-0 overflow-hidden">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 w-full">{error}</div> : null}
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          @media print {
            html, body {
              background: #fff !important;
            }

            body * {
              visibility: hidden;
            }

            .print-order-page,
            .print-order-page * {
              visibility: visible;
            }

            .print-order-page {
              position: absolute;
              left: 0;
              top: 0;
              width: 190mm;
              max-width: 190mm;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }

            .print-order-sheet {
              width: 100% !important;
              border: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              background: #fff !important;
            }

            .print-order-grid {
              display: grid !important;
              grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) !important;
              gap: 10px !important;
              padding: 8px 0 0 0 !important;
            }

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              border: 1px solid #cbd5e1 !important;
              border-radius: 8px !important;
              padding: 10px !important;
              background: #fff !important;
            }

            .print-compact-text {
              font-size: 12px !important;
              line-height: 1.35 !important;
            }

            .print-title {
              font-size: 26px !important;
              line-height: 1.1 !important;
            }

            .print-meta {
              font-size: 11px !important;
              gap: 8px !important;
            }

            .print-products {
              gap: 8px !important;
            }

            .print-product-row {
              gap: 10px !important;
              padding: 8px !important;
              border-radius: 8px !important;
              grid-template-columns: 56px minmax(0, 1fr) auto !important;
            }

            .print-product-image {
              width: 56px !important;
              height: 56px !important;
              border-radius: 6px !important;
            }

            .print-product-meta {
              margin-top: 6px !important;
              gap: 4px !important;
              font-size: 11px !important;
            }

            .print-steps {
              grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
              gap: 6px !important;
            }

            .print-step-card {
              padding: 8px !important;
              border-radius: 8px !important;
            }

            .print-step-card .text-sm {
              font-size: 11px !important;
            }

            .print-step-card .text-xs {
              font-size: 10px !important;
              line-height: 1.25 !important;
            }

            .print-hide-detailed-events {
              display: none !important;
            }

            .print-kv-grid {
              gap: 10px !important;
            }

            .print-kv-grid .text-sm,
            .print-kv-grid .text-xs,
            .print-kv-grid div {
              line-height: 1.3 !important;
            }
          }
        `}
      </style>
      <section className="print-order-sheet overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:rounded-none print:border-0 print:shadow-none">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(135deg,#1e1b4b,#312e81)] px-6 py-6 text-white sm:px-8 print:bg-none print:px-0 print:text-slate-950">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4 w-full min-w-0">
            <div className="min-w-0 flex-1 w-full md:min-w-[300px]">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 print:text-slate-500 md:whitespace-nowrap">Order Summary</div>
              <h1 className="print-title mt-2 text-2xl font-semibold tracking-tight sm:text-3xl break-all md:break-normal min-w-0">{order.orderNumber}</h1>
              <div className="print-meta mt-3 flex flex-wrap gap-4 text-sm text-slate-200 print:text-slate-600 w-full min-w-0">
                <span className="truncate">Invoice: {order.invoiceNumber}</span>
                <span className="truncate">Placed: {formatDateTime(order.orderDate || order.createdAt)}</span>
                <span className="truncate">Estimated delivery: {order.estimatedDeliveryLabel || formatDate(order.estimatedDelivery)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-center md:justify-end gap-2 print:hidden w-full md:w-full lg:w-auto shrink mt-4 md:mt-0">
              <div className="flex gap-2 w-full md:w-auto mb-1 sm:mb-0">
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 ring-1 ring-inset ring-indigo-500/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/20">{order.status}</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">{order.paymentStatus}</span>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleDownloadInvoice}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/20 bg-white/5 px-2 py-2 text-[12px] font-bold text-white backdrop-blur transition hover:bg-white/10 disabled:opacity-50 w-full sm:w-auto sm:px-4 sm:text-[13px]"
                >
                  <Download className="h-4 w-4 shrink-0" /> <span className="truncate">Download Invoice</span>
                </button>
                <Link
                  to={`/orders/${orderId}/invoice`}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-2 text-[12px] font-bold text-indigo-700 transition hover:bg-slate-50 w-full sm:w-auto sm:px-4 sm:text-[13px]"
                >
                  <Eye className="h-4 w-4 shrink-0" /> <span className="truncate">Preview Invoice</span>
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById("order-timeline")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-[12px] bg-white px-2 py-2 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50 w-full sm:w-auto sm:px-4 sm:text-[13px]"
                >
                  <MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">Track Order</span>
                </button>
                <button
                  type="button"
                  disabled={!canReturn || actionBusy}
                  onClick={handleReturn}
                  title={order?.returnEligibilityMessage || "Return Order"}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/20 px-2 py-2 text-[12px] font-bold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto sm:px-4 sm:text-[13px]"
                >
                  <CornerUpLeft className="h-4 w-4 shrink-0" /> <span className="truncate">Return Order</span>
                </button>
                <button
                  type="button"
                  disabled={!canCancel || actionBusy}
                  onClick={() => {
                    setCancelOpen(true);
                    void loadCancelPreview();
                  }}
                  className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-[12px] border border-rose-500/30 px-2 py-2 text-[12px] font-bold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto sm:px-4 sm:text-[13px]"
                >
                  <XCircle className="h-4 w-4 shrink-0" /> <span className="truncate">Cancel Order</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="print-order-grid grid grid-cols-1 items-start gap-6 p-6 sm:p-8 print:px-0 print:py-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] w-full min-w-0">
          <div className="grid grid-cols-1 content-start gap-6 w-full min-w-0">
            <section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Package className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Products</h2>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{order.items?.length || 0} line items</div>
              </div>
              <div className="print-products mt-5 grid grid-cols-1 gap-4 w-full min-w-0">
                {(order.items || []).map((item) => (
                  <div key={item.lineId || `${item.productId}-${item.variantId}`} className="print-product-row grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-[88px_minmax(0,1fr)_auto] w-full min-w-0">
                    <div className="print-product-image h-22 w-22 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                      {item.image ? <img loading="lazy" decoding="async" src={resolveApiAssetUrl(item.image)} alt={item.name} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="print-compact-text text-base font-semibold text-slate-950 dark:text-white">{item.name}</div>
                      <div className="print-compact-text mt-1 text-sm text-slate-500 dark:text-slate-400">{item.variantName || "Standard variant"}</div>
                      {item.variantSku ? <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">SKU: {item.variantSku}</div> : null}
                      <div className="print-product-meta mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                        <span>Qty: {item.quantity}</span>
                        <span>Unit price: {formatCurrency(item.unitPrice, { currency: order.pricing?.currency })}</span>
                        <span>Total: {formatCurrency(item.total, { currency: order.pricing?.currency })}</span>
                      </div>
                    </div>
                    <div className="print-compact-text text-right text-sm font-semibold text-slate-950 dark:text-white">
                      {formatCurrency(item.total, { currency: order.pricing?.currency })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="order-timeline" className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <History className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Order Timeline</h2>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-8 w-full min-w-0">
                <div className="print-steps flex relative overflow-x-auto pb-6 scrollbar-hide snap-x w-full min-w-0">
                  {timelineSteps.map((step, index) => {
                    const isLast = index === timelineSteps.length - 1;
                    return (
                      <div key={step.key} className="print-step flex-1 flex flex-col items-center relative z-10 min-w-[90px] shrink-0 snap-start">
                        {!isLast && (
                          <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 ${step.completed ? "bg-emerald-500" : "border-t-2 border-dashed border-slate-200 bg-transparent dark:border-slate-700"}`} />
                        )}
                        
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step.completed ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-white dark:bg-slate-900"}`}>
                          <div className={`flex h-4 w-4 items-center justify-center rounded-full ${step.completed ? "bg-emerald-500 text-white" : "bg-slate-300 dark:bg-slate-700"}`}>
                            {step.completed && <Check className="h-3 w-3" strokeWidth={3} />}
                          </div>
                        </div>

                        <div className={`mt-3 text-[13px] font-bold ${step.completed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                          {step.label}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center leading-tight">
                          {step.timestamp ? formatDateTime(step.timestamp) : "Pending"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="print-hide-detailed-events grid grid-cols-1 gap-3 w-full min-w-0">
                  {(timelineEvents || []).map((event) => (
                    <div key={event.key || `${event.status}-${event.timestamp}`} className="flex gap-4 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white dark:bg-emerald-500">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </div>
                      <div>
                        <div className="text-[15px] font-bold text-slate-900 dark:text-white">{event.label || event.status}</div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{formatDateTime(event.timestamp)}</div>
                        {event.note ? <div className="mt-2 text-[13px] text-slate-600 dark:text-slate-300">{event.note}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Customer</h2>
              </div>
              <div className="print-kv-grid grid grid-cols-1 gap-6 sm:grid-cols-2 w-full min-w-0">
                <div className="grid grid-cols-1 content-start gap-4 w-full min-w-0">
                  <KeyValue label="Name" value={order.customer?.name} />
                  <KeyValue label="Phone" value={order.customer?.phone} icon={Phone} />
                  <KeyValue label="Email" value={order.customer?.email} icon={Mail} />
                </div>
                <div className="grid grid-cols-1 content-start gap-4 w-full min-w-0">
                  <KeyValue
                    label="Shipping Address"
                    icon={MapPin}
                    value={[
                      order.customer?.shippingAddress?.line1,
                      order.customer?.shippingAddress?.line2,
                      [order.customer?.shippingAddress?.city, order.customer?.shippingAddress?.state, order.customer?.shippingAddress?.postalCode].filter(Boolean).join(", "),
                      order.customer?.shippingAddress?.country,
                    ].filter(Boolean).join(", ")}
                  />
                  <KeyValue
                    label="Billing Address"
                    icon={Building2}
                    value={[
                      order.customer?.billingAddress?.line1,
                      order.customer?.billingAddress?.line2,
                      [order.customer?.billingAddress?.city, order.customer?.billingAddress?.state, order.customer?.billingAddress?.postalCode].filter(Boolean).join(", "),
                      order.customer?.billingAddress?.country,
                    ].filter(Boolean).join(", ")}
                  />
                </div>
              </div>
            </section>

            <section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Payment Details</h2>
              </div>
              <div className="print-kv-grid grid grid-cols-1 gap-6 sm:grid-cols-2 w-full min-w-0">
                <div className="grid grid-cols-1 content-start gap-4 w-full min-w-0">
                  <KeyValue label="Method" value={order.payment?.method} />
                  <KeyValue label="Transaction ID" value={order.payment?.transactionId || "COD"} />
                  <KeyValue label="Payment Timestamp" value={order.payment?.timestamp ? formatDateTime(order.payment.timestamp) : "Awaiting payment"} />
                </div>
                <div className="grid grid-cols-1 content-start gap-4 w-full min-w-0">
                  <KeyValue label="Refund Status" value={order.refundSummary?.status || "NONE"} />
                  <KeyValue label="Refund Amount" value={formatCurrency(order.refundSummary?.amount || 0, { currency: order.pricing?.currency })} />
                  <KeyValue label="Deduction Amount" value={formatCurrency(order.refundSummary?.deductionAmount || 0, { currency: order.pricing?.currency })} />
                </div>
              </div>
              {order.refundSummary?.status === "PENDING" ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Refund is being processed by finance team.
                </div>
              ) : null}
            </section>
          </div>

          <div className="grid grid-cols-1 content-start gap-4 w-full min-w-0">
            <section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Order Overview</h2>
                </div>
                
              </div>
              <div className="print-kv-grid mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 w-full min-w-0">
                <KeyValue label="Payment Status" value={<span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">{order.paymentStatus}</span>} />
                <KeyValue label="Order Status" value={<span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 ring-1 ring-inset ring-indigo-500/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/20">{order.status}</span>} />
                <KeyValue label="Invoice Number" value={order.invoiceNumber} />
                <KeyValue label="Estimated Delivery" value={order.estimatedDeliveryLabel || formatDate(order.estimatedDelivery)} />
              </div>
            </section>

            <section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Store className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Seller</h2>
                </div>
                
              </div>
              <div className="mt-4 w-full min-w-0">
                <SellerCard seller={order.sellerId || order.vendors?.[0]} compact />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span>Store Rating:</span>
                <StoreRatingDisplay seller={order.sellerId || order.vendors?.[0]} />
                <VisitStoreButton seller={order.sellerId || order.vendors?.[0]}>Visit Seller Store</VisitStoreButton>
              </div>
            </section>

            {order.unifiedPricingBreakdown ? (
              <UnifiedPricingBreakdown breakdown={order.unifiedPricingBreakdown} title="Payment Breakdown" compact />
            ) : (
              <section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Payment Breakdown</h2>
                </div>
                
              </div>
                <div className="print-kv-grid mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-300 w-full min-w-0">
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(order.pricing?.subtotal, { currency: order.pricing?.currency })}</span></div>
                  <div className="flex items-center justify-between"><span>Delivery fee</span><span>{formatCurrency(order.pricing?.deliveryFee, { currency: order.pricing?.currency })}</span></div>
                  <div className="flex items-center justify-between"><span>Platform fee</span><span>{formatCurrency(order.pricing?.platformFee, { currency: order.pricing?.currency })}</span></div>
                  <div className="flex items-center justify-between"><span>{order.payment?.method === "COD" ? "COD charges" : "Razorpay charges"}</span><span>{formatCurrency(order.pricing?.paymentFee, { currency: order.pricing?.currency })}</span></div>
                  <div className="flex items-center justify-between"><span>Taxes</span><span>{formatCurrency(order.pricing?.taxes, { currency: order.pricing?.currency })}</span></div>
                  <div className="flex items-center justify-between"><span>Discounts</span><span>-{formatCurrency(order.pricing?.discounts, { currency: order.pricing?.currency })}</span></div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 font-semibold text-slate-950 dark:border-slate-800 dark:text-white">
                    <span>Grand total</span>
                    <span>{formatCurrency(order.pricing?.grandTotal, { currency: order.pricing?.currency })}</span>
                  </div>
                </div>
              </section>
            )}

            <section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Truck className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Shipping Details</h2>
                </div>
                
              </div>
              <div className="print-kv-grid mt-4 grid grid-cols-1 gap-4 w-full min-w-0">
                <KeyValue label="Courier" value={order.shipping?.courier || "Pending assignment"} />
                <KeyValue label="Tracking Number" value={order.shipping?.trackingNumber || "Not assigned"} />
                <KeyValue label="Shipping Method" value={order.shipping?.shippingMethod} />
                <KeyValue label="Delivery Estimate" value={order.estimatedDeliveryLabel || formatDate(order.estimatedDelivery)} />
                {order.shipping?.trackingUrl ? (
                  <a href={order.shipping.trackingUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline print:hidden">
                    Open courier tracking
                  </a>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to="/orders" className="text-sm font-medium text-blue-600 hover:underline">
          Back to orders
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          Print summary
        </button>
      </div>

      <CancelOrderModal
        open={cancelOpen}
        loading={actionBusy}
        preview={cancelPreview}
        onClose={() => {
          setCancelOpen(false);
          setCancelPreview(null);
        }}
        onPreview={loadCancelPreview}
        onConfirm={handleConfirmCancellation}
      />
      <ReturnOrderModal
        open={returnOpen}
        order={order}
        loading={actionBusy}
        onClose={() => setReturnOpen(false)}
        onSubmit={handleSubmitReturn}
      />
    </div>
  );
}
