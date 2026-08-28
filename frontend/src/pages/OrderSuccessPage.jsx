import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ShoppingBag, CreditCard, Wallet, ShieldCheck, Info, MapPin, ArrowRight, Download, Headset, Shield, Truck, RefreshCcw, Clock } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import useAuthCartStore from "../context/authCartStore";
import * as paymentService from "../services/paymentService";
import * as userService from "../services/userService";
import { emitCartChanged } from "../utils/cartState";
import { formatCurrency } from "../utils/formatCurrency";
import { UnifiedPricingBreakdown } from "../components/commerce/UnifiedPricingBreakdown";

const CHECKOUT_SUCCESS_STORAGE_KEY = "checkoutSuccessPayload";

function persistCheckoutSuccessPayload(payload) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHECKOUT_SUCCESS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore session storage failures.
  }
}

function loadPersistedCheckoutSuccessPayload() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SUCCESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    window.sessionStorage.removeItem(CHECKOUT_SUCCESS_STORAGE_KEY);
    return parsed;
  } catch {
    window.sessionStorage.removeItem(CHECKOUT_SUCCESS_STORAGE_KEY);
    return null;
  }
}

function clearCheckoutCartState() {
  const emptyCart = { items: [], totalAmount: 0, itemCount: 0, totalQuantity: 0 };
  useAuthCartStore.getState().setCart(emptyCart);
  emitCartChanged(emptyCart);
}

function getCurrency(order) {
  return order?.pricing?.currency || order?.priceBreakdown?.currency || order?.currency || "INR";
}

function getItemUnitPrice(item) {
  return Number(item?.unitPrice ?? item?.price ?? 0);
}

function getItemTotal(item) {
  if (item?.total !== undefined && item?.total !== null) {
    return Number(item.total || 0);
  }
  return getItemUnitPrice(item) * Number(item?.quantity || 0);
}

function getOrderSubtotal(order) {
  return Number(
    order?.pricing?.subtotal ??
      order?.priceBreakdown?.subtotal ??
      order?.pricingSnapshot?.subtotal ??
      order?.subtotal ??
      0
  );
}

function getOrderTax(order) {
  return Number(
    order?.pricing?.tax ??
      order?.pricing?.taxes ??
      order?.priceBreakdown?.taxAmount ??
      order?.taxAmount ??
      0
  );
}

function getOrderShipping(order) {
  return Number(
    order?.pricing?.shipping ??
      order?.pricing?.deliveryFee ??
      order?.priceBreakdown?.shippingFee ??
      order?.shippingFee ??
      0
  );
}

function getOrderPlatformFee(order) {
  return Number(
    order?.pricing?.platformFee ??
      order?.priceBreakdown?.platformFee ??
      order?.platformFee ??
      0
  );
}

function getOrderDiscount(order) {
  return Number(
    order?.pricing?.discount ??
      order?.pricing?.discounts ??
      order?.priceBreakdown?.discountAmount ??
      order?.discountAmount ??
      0
  );
}

function getOrderAdvanceAmount(order) {
  return Number(order?.advanceAmount ?? order?.codAdvance?.advanceAmount ?? 0);
}

function getOrderRemainingCodAmount(order) {
  const advanceAmount = getOrderAdvanceAmount(order);
  if (order?.remainingCODAmount !== undefined && order?.remainingCODAmount !== null) {
    return Number(order.remainingCODAmount || 0);
  }
  if (order?.codAdvance?.remainingCODAmount !== undefined && order?.codAdvance?.remainingCODAmount !== null) {
    return Number(order.codAdvance.remainingCODAmount || 0);
  }
  return Math.max(0, Number(order?.totalAmount || 0) - advanceAmount);
}

export function OrderSuccessPage() {
  const location = useLocation();
  const baseState = location.state || loadPersistedCheckoutSuccessPayload() || {};
  const [state, setState] = useState(baseState);
  const orders = state.orders || [];
  const payment = state.payment || null;
  const processing = Boolean(state.processing);
  const [settleError, setSettleError] = useState(state.verificationError || "");
  const rawPaymentMethod = orders[0]?.paymentMethod || payment?.businessMethod || payment?.paymentMode || payment?.method || "ONLINE";
  const isCod = rawPaymentMethod === "COD" || rawPaymentMethod === "COD_ADVANCE";
  const displayPaymentMethod = rawPaymentMethod === "COD_ADVANCE" ? "COD advance" : rawPaymentMethod;
  const codAdvancePaid = orders.reduce((sum, order) => sum + getOrderAdvanceAmount(order), 0);
  const hasCodAdvance = isCod && codAdvancePaid > 0;
  const codPayable = orders.reduce((sum, order) => sum + getOrderRemainingCodAmount(order), 0);
  const orderGrandTotal = orders.reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState("");

  useEffect(() => {
    if (!processing) return undefined;

    let active = true;

    async function settleSuccessState() {
      const verificationPayload = state.verificationPayload || null;
      const checkoutStartedAt = Number(state.checkoutStartedAt || 0);
      const razorpayOrderId = verificationPayload?.razorpay_order_id || payment?.razorpayOrderId || "";

      function belongsToThisCheckout(order) {
        const createdAt = new Date(order?.createdAt || 0).getTime();
        const paymentOrderId =
          order?.razorpayOrderId ||
          order?.paymentRecordId?.razorpayOrderId ||
          order?.payment?.razorpayOrderId ||
          "";

        if (razorpayOrderId && paymentOrderId && String(paymentOrderId) === String(razorpayOrderId)) {
          return true;
        }
        return checkoutStartedAt > 0 && createdAt >= checkoutStartedAt - 60_000;
      }

      if (verificationPayload) {
        for (let attempt = 1; attempt <= 4 && active; attempt += 1) {
          try {
            const verified = await paymentService.verifyRazorpayPayment(verificationPayload);
            const nextState = {
              orders: verified?.orders || [],
              payment: verified?.payment || null,
            };
            persistCheckoutSuccessPayload(nextState);
            clearCheckoutCartState();
            if (active) setState(nextState);
            return;
          } catch (error) {
            if (active) setSettleError(error?.response?.data?.message || error?.message || "Order creation is still processing.");
            await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
          }
        }
      }

      for (let attempt = 1; attempt <= 4 && active; attempt += 1) {
        try {
          const response = await userService.getUserOrders({ page: 1, limit: 5 });
          const nextOrders = (response?.data?.orders || []).filter(belongsToThisCheckout);
          if (nextOrders.length) {
            const nextState = {
              orders: nextOrders,
              payment: payment || null,
            };
            persistCheckoutSuccessPayload(nextState);
            clearCheckoutCartState();
            if (active) setState(nextState);
            return;
          }
        } catch {
          // Keep retrying briefly while backend finishes settling the order state.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
      }

      if (active) {
        setSettleError("Payment was captured, but the order is not available yet. Please refresh this page before trying again.");
      }
    }

    settleSuccessState();
    return () => {
      active = false;
    };
  }, [payment, processing, state.checkoutStartedAt, state.verificationPayload]);

  if (!orders.length && !processing) {
    return <Navigate to="/orders" replace />;
  }

  async function handleDownloadInvoice(orderId) {
    setDownloadingInvoiceId(orderId);
    try {
      await userService.downloadUserInvoice(orderId);
    } finally {
      setDownloadingInvoiceId("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 pt-6">
      {/* Loading state block */}
      {processing && !orders.length ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
          {settleError ? settleError : "Loading your order summary..."}
        </section>
      ) : null}

      {/* Hero Banner */}
      {!processing && (
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#f2f7ff] to-[#e8f1ff] p-8 md:p-12 shadow-sm border border-blue-100 flex items-center min-h-[220px]">
          <div className="relative z-10 flex items-start gap-6 md:w-2/3">
            <div className="flex-shrink-0 relative mt-1">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20"></div>
              
              {/* Confetti particles */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30 * Math.PI) / 180;
                  const distance = 50 + Math.random() * 30;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [0, Math.random() + 0.5, 0], 
                        x: Math.cos(angle) * distance, 
                        y: Math.sin(angle) * distance,
                        rotate: Math.random() * 360
                      }}
                      transition={{ delay: 0.1, duration: 1.5, ease: "easeOut" }}
                      className={`absolute h-2.5 w-2.5 ${['bg-blue-500', 'bg-purple-500', 'bg-amber-400', 'bg-emerald-500'][i % 4]} ${i % 2 === 0 ? 'rounded-full' : 'rounded-sm'}`}
                    />
                  );
                })}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -15, 15, -15, 15, 0] }}
                transition={{ 
                  scale: { type: "spring", bounce: 0.5 },
                  rotate: { delay: 0.4, duration: 0.5, ease: "easeInOut" }
                }}
                className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-[#0066ff] text-white shadow-xl shadow-blue-500/30"
              >
                <Check className="h-10 w-10" strokeWidth={4} />
              </motion.div>
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-blue-700">Order Confirmed</div>
              <h1 className="mt-2 text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Thank you! Your order<br/>is in the system.</h1>
              <p className="mt-3 text-slate-600 font-medium">
                {isCod
                  ? hasCodAdvance
                    ? `Advance payment of ${formatCurrency(codAdvancePaid)} is recorded. Please keep ${formatCurrency(codPayable)} ready for delivery.`
                    : `Please keep ${formatCurrency(codPayable)} ready for delivery. You can track every vendor shipment from your orders page.`
                  : "Payment status and order routing have been recorded. You can track every vendor shipment from your orders page."}
              </p>
            </div>
          </div>
          
          <div className="hidden md:block absolute right-0 top-0 bottom-0 h-full w-1/2 max-w-sm">
            <img 
              src="/assets/success_illustration.png" 
              alt="Delivery Illustration" 
              className="absolute right-0 bottom-0 h-full w-full object-cover object-right mix-blend-multiply"
              style={{ 
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 30%)'
              }}
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!processing && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} iconColor="text-blue-600" bg="bg-blue-50" label="Orders created" value={String(orders.length)} subtext="Total orders" />
          <StatCard icon={CreditCard} iconColor="text-purple-600" bg="bg-purple-50" label="Payment method" value={displayPaymentMethod} subtext={isCod ? "Cash on Delivery" : "Online"} />
          <StatCard icon={Wallet} iconColor="text-orange-600" bg="bg-orange-50" label={isCod ? (hasCodAdvance ? "Advance paid" : "Payable on delivery") : "Amount Paid"} value={isCod ? formatCurrency(hasCodAdvance ? codAdvancePaid : codPayable) : formatCurrency(orderGrandTotal)} subtext={isCod ? "Collectable amount" : "Fully paid"} />
          <StatCard icon={ShieldCheck} iconColor="text-emerald-600" bg="bg-emerald-50" label="Payment status" value={orders[0]?.paymentStatus || payment?.status || "Pending"} subtext={isCod && !hasCodAdvance ? "To be collected" : "Secured"} />
        </section>
      )}

      {/* COD Instructions Banner */}
      {!processing && isCod && (
        <div className="flex items-start gap-4 rounded-2xl bg-amber-50/50 border border-amber-200 p-6 shadow-sm">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm border border-amber-200">
            <Info className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="text-sm text-amber-900 leading-relaxed">
            <span className="font-bold">Cash on Delivery instructions:</span> 
            {hasCodAdvance
              ? ` Advance paid is ${formatCurrency(codAdvancePaid)}. Balance collectable on delivery is ${formatCurrency(codPayable)}.`
              : ` Collectable amount is ${formatCurrency(codPayable)}. `}
            <br />Our delivery or operations team may contact you before dispatch to confirm the order.
          </div>
        </div>
      )}

      {/* Two Column Layout for Order Items & Price Summary */}
      {!processing && orders.map((order) => (
        <div key={order._id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Order details</h2>
                <div className="ml-auto flex items-center gap-2">
                  <StatusBadge value={order.status} />
                  <StatusBadge value={order.paymentStatus} />
                </div>
              </div>
              
              {/* Order Info */}
              <div className="mt-6">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Order number</div>
                <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">{order.orderNumber}</div>
                <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Placed at: {new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  {order.invoiceNumber && (
                    <div className="flex items-center gap-2">
                      <span>Invoice: {order.invoiceNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-8">
                <h3 className="font-bold text-slate-900 text-lg mb-4">Order items ({order.items?.length || 0})</h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white">
                      <div className="flex items-center gap-4">
                        <img 
                          src={item.image || item.productImage || "https://placehold.co/100x100"} 
                          alt={item.name} 
                          className="h-16 w-16 rounded-xl object-cover bg-slate-50 border border-slate-100"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.variantName && (
                            <div className="mt-0.5 text-xs text-slate-500">{item.variantName}</div>
                          )}
                          <div className="mt-1.5 flex items-center gap-3 text-sm text-slate-500 font-medium">
                            <span>Qty: {item.quantity}</span>
                            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                            <span>Unit: {formatCurrency(getItemUnitPrice(item), { currency: getCurrency(order) })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="font-black text-slate-900 text-right sm:text-lg">
                        {formatCurrency(getItemTotal(item), { currency: getCurrency(order) })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              {order.shippingAddress && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      Delivery address
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#f8fbff] p-6 text-sm text-slate-600 border border-blue-50 relative overflow-hidden">
                    <div className="relative z-10 font-bold text-slate-900 text-base">{order.shippingAddress.fullName}</div>
                    <div className="relative z-10 mt-2 space-y-1">
                      {order.shippingAddress.line1 && <div>{order.shippingAddress.line1}</div>}
                      {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                      <div>
                        {order.shippingAddress.city}
                        {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                        {order.shippingAddress.postalCode && ` - ${order.shippingAddress.postalCode}`}
                      </div>
                      {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                      {order.shippingAddress.phone && <div className="mt-2 font-medium">Phone: {order.shippingAddress.phone}</div>}
                    </div>
                    <MapPin className="absolute -right-8 -bottom-8 h-40 w-40 text-blue-100 opacity-30" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={`/orders/${order._id}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                >
                  <ShoppingBag className="h-4 w-4 text-slate-400" />
                  View full details
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(order._id)}
                  disabled={downloadingInvoiceId === order._id}
                  className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 transition"
                >
                  <Download className="h-4 w-4" />
                  {downloadingInvoiceId === order._id ? "Downloading..." : "Download Invoice"}
                </button>
              </div>
            </section>

            {/* Bottom Global Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/orders" className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-800 transition shadow-sm">
                Go to orders
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/shop" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
                <ShoppingBag className="h-4 w-4" />
                Continue shopping
              </Link>
            </div>
          </div>

          {/* Right Column: Price Summary & Support */}
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">Price<br/>summary</h2>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grand Total</div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">{formatCurrency(order.totalAmount || 0, { currency: getCurrency(order) })}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pricing breakdown</div>
                <div className="text-xs text-slate-500 mb-6">{new Date(order.createdAt).toLocaleString()}</div>

                <div className="text-sm font-medium">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
                    <div>
                      <div className="text-slate-900 font-bold">Subtotal</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">SUBTOTAL</div>
                    </div>
                    <div className="text-slate-900 font-bold">{formatCurrency(getOrderSubtotal(order), { currency: getCurrency(order) })}</div>
                  </div>

                  {getOrderShipping(order) > 0 && (
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 py-2">
                      <div>
                        <div className="text-slate-900 font-bold">Shipping fee</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">CHARGE</div>
                      </div>
                      <div className="text-slate-900 font-bold">
                        {formatCurrency(getOrderShipping(order), { currency: getCurrency(order) })}
                      </div>
                    </div>
                  )}

                  {getOrderPlatformFee(order) > 0 && (
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 py-2">
                      <div>
                        <div className="text-slate-900 font-bold">Platform fee</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">CHARGE</div>
                      </div>
                      <div className="text-slate-900 font-bold">
                        {formatCurrency(getOrderPlatformFee(order), { currency: getCurrency(order) })}
                      </div>
                    </div>
                  )}

                  {getOrderTax(order) > 0 && (
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 py-2">
                      <div>
                        <div className="text-slate-900 font-bold">Tax</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">CHARGE</div>
                      </div>
                      <div className="text-slate-900 font-bold">
                        {formatCurrency(getOrderTax(order), { currency: getCurrency(order) })}
                      </div>
                    </div>
                  )}

                  {/* Render mapping for dynamic charges like "delivery fee" or "extra fee" */}
                  {(order?.pricing?.charges || order?.priceBreakdown?.charges || []).map((charge, idx) => (
                    charge.amount > 0 && (
                      <div key={idx} className="flex items-center justify-between border-b border-dashed border-slate-200 py-2">
                        <div>
                          <div className="text-slate-900 font-bold capitalize">{charge.label || charge.displayName || charge.key?.replace(/_/g, " ")}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">CHARGE</div>
                        </div>
                        <div className="text-slate-900 font-bold">
                          {formatCurrency(charge.amount, { currency: getCurrency(order) })}
                        </div>
                      </div>
                    )
                  ))}

                  {getOrderDiscount(order) > 0 && (
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 py-2">
                      <div>
                        <div className="text-emerald-600 font-bold">Discount</div>
                        <div className="text-[10px] uppercase tracking-wider text-emerald-400 mt-0.5">SAVINGS</div>
                      </div>
                      <div className="text-emerald-600 font-bold">
                        -{formatCurrency(getOrderDiscount(order), { currency: getCurrency(order) })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pb-2 pt-2 text-slate-500 text-xs">
                    <div>Total charges</div>
                    <div>{formatCurrency(getOrderTax(order) + getOrderShipping(order) + getOrderPlatformFee(order) + (order?.pricing?.charges || order?.priceBreakdown?.charges || []).reduce((sum, ch) => sum + Number(ch.amount || 0), 0) - getOrderDiscount(order), { currency: getCurrency(order) })}</div>
                  </div>

                  <div className="flex items-center justify-between rounded-[1rem] bg-[#f0f6ff] p-3 text-blue-700 mt-1 border border-blue-100">
                    <span className="font-bold text-sm">Grand total</span>
                    <span className="font-black text-lg">{formatCurrency(order.totalAmount || 0, { currency: getCurrency(order) })}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-blue-100 bg-gradient-to-b from-[#f8fbff] to-white p-6 md:p-8 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200">
                  <Headset className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Need any help?</h3>
                  <p className="mt-1 text-sm text-slate-500 font-medium leading-relaxed">Our support team is here to help you anytime.</p>
                  <button className="mt-5 flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 transition w-full justify-center shadow-sm">
                    Contact Support
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      ))}

      {/* Trust Badges */}
      {!processing && (
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-200 pt-10 pb-8">
          <TrustBadge icon={Shield} title="Secure Payment" desc="Your payment is 100% safe with us." />
          <TrustBadge icon={Truck} title="Fast Delivery" desc="Quick delivery to your doorstep." />
          <TrustBadge icon={RefreshCcw} title="Easy Returns" desc="Hassle-free returns within 7 days." />
          <TrustBadge icon={Headset} title="24/7 Support" desc="We're here to help you anytime." />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, bg, label, value, subtext }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${bg} ${iconColor}`}>
        <Icon className="h-6 w-6" strokeWidth={2.5} />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
        <div className="text-xl font-black tracking-tight text-slate-900">{value}</div>
        {subtext && <div className="text-xs font-medium text-slate-500 mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

function TrustBadge({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 p-2">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
