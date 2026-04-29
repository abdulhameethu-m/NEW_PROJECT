import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { getUserInvoiceUrl, getUserOrder, getUserOrderTracking } from "../services/userService";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { formatWeight, getWeightUnit, getWeightValue } from "../utils/weight";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to load order details.";
}

export function OrderDetailsPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (error || !order) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error || "Order not found."}</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Order details</div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{order.orderNumber}</h1>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{new Date(order.createdAt).toLocaleString()}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge value={order.paymentStatus} />
          <a
            href={getUserInvoiceUrl(order._id)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Download invoice
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Items</h2>
          <div className="mt-5 grid gap-4">
            {(order.items || []).map((item) => (
              <div key={`${order._id}-${item.productId}`} className="flex gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                  {item.image ? <img src={resolveApiAssetUrl(item.image)} alt={item.name} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  {(() => {
                    const itemWeight = getWeightValue(item);
                    const itemWeightUnit = getWeightUnit(item);
                    const totalWeight = itemWeight * Number(item.quantity || 0);
                    return (
                      <>
                  <div className="font-semibold text-slate-950 dark:text-white">{item.name}</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quantity: {item.quantity}</div>
                  {itemWeight > 0 ? (
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Weight: {formatWeight(itemWeight, itemWeightUnit)}
                      {Number(item.quantity || 0) > 1 ? ` each • ${formatWeight(totalWeight, itemWeightUnit)} total` : ""}
                    </div>
                  ) : null}
                  <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                    {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                  </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Delivery tracking</h2>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              <div>Shipping mode: {tracking?.shippingMode || order.shippingMode || "SELF"}</div>
              <div className="mt-1">Shipping status: {tracking?.shippingStatus || order.shippingStatus || "NOT_SHIPPED"}</div>
              <div className="mt-1">Pickup status: {tracking?.pickupStatus || order.pickupStatus || "NOT_REQUESTED"}</div>
              <div>Partner: {tracking?.deliveryPartner || "Pending assignment"}</div>
              <div className="mt-1">Courier: {tracking?.courierName || order.courierName || "Pending assignment"}</div>
              <div className="mt-1">Tracking ID: {tracking?.trackingId || "Not assigned yet"}</div>
              {tracking?.trackingUrl ? (
                <a href={tracking.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-blue-600 hover:underline">
                  Open tracking link
                </a>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3">
              {(tracking?.timeline || []).map((entry, index) => (
                <div key={`${entry.status}-${index}`} className="flex gap-3">
                  <div className="mt-1 h-3 w-3 rounded-full bg-slate-900 dark:bg-white" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{entry.status}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(entry.changedAt).toLocaleString()}</div>
                    {entry.note ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.note}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Shipping address</h2>
            <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <div>{order.shippingAddress?.fullName}</div>
              <div>{order.shippingAddress?.phone}</div>
              <div>{order.shippingAddress?.line1}</div>
              {order.shippingAddress?.line2 ? <div>{order.shippingAddress.line2}</div> : null}
              <div>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
              </div>
              <div>{order.shippingAddress?.country}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Order summary</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal || 0)}</span></div>
              <div className="flex items-center justify-between"><span>Shipping</span><span>{formatCurrency(order.shippingFee || 0)}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>{formatCurrency(order.taxAmount || 0)}</span></div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 font-semibold text-slate-950 dark:border-slate-800 dark:text-white"><span>Total</span><span>{formatCurrency(order.totalAmount || 0)}</span></div>
            </div>
          </div>
        </section>
      </div>

      <div>
        <Link to="/orders" className="text-sm font-medium text-blue-600 hover:underline">
          Back to orders
        </Link>
      </div>
    </div>
  );
}
