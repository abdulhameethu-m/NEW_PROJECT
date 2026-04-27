import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import * as vendorDashboardService from "../services/vendorDashboardService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

const STATUS_OPTIONS = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

export function VendorOrderDetailsPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Placed");
  const [trackingId, setTrackingId] = useState("");
  const [partner, setPartner] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [courierName, setCourierName] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    vendorDashboardService
      .getVendorOrderById(id)
      .then((res) => {
        const nextOrder = res?.data ?? res;
        if (cancelled) return;
        setOrder(nextOrder);
        setStatus(nextOrder?.status || "Placed");
        setTrackingId(nextOrder?.trackingId || "");
        setPartner(nextOrder?.deliveryPartner || "");
        setTrackingUrl(nextOrder?.trackingUrl || "");
        setCourierName(nextOrder?.courierName || "");
      })
      .catch((err) => {
        if (!cancelled) setError(normalizeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const items = order?.items || [];
  const user = order?.userId;
  const address = order?.shippingAddress;
  const canSave = useMemo(() => !!order && !saving && !loading, [order, saving, loading]);
  const hasTrackingFields = Boolean(trackingId.trim() && trackingUrl.trim());

  function validateTrackingFields() {
    if ((trackingId.trim() && !trackingUrl.trim()) || (!trackingId.trim() && trackingUrl.trim())) {
      return "Tracking ID and Tracking URL must be added together.";
    }

    if (trackingUrl.trim()) {
      try {
        const parsed = new URL(trackingUrl.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return "Tracking URL must start with http or https.";
        }
      } catch {
        return "Enter a valid tracking URL.";
      }
    }

    return "";
  }

  async function refreshOrder() {
    const refreshed = await vendorDashboardService.getVendorOrderById(id);
    const updated = refreshed?.data ?? refreshed;
    setOrder(updated);
    setStatus(updated?.status || "Placed");
    setTrackingId(updated?.trackingId || "");
    setPartner(updated?.deliveryPartner || "");
    setTrackingUrl(updated?.trackingUrl || "");
    setCourierName(updated?.courierName || "");
  }

  async function saveChanges(statusOverride) {
    const nextFieldError = validateTrackingFields();
    setFieldError(nextFieldError);
    if (nextFieldError) return;

    const nextStatus = statusOverride || status;
    const requests = [];
    const currentStatus = order?.status || "Placed";
    const statusChanged = nextStatus !== currentStatus;
    if (statusChanged) {
      requests.push(vendorDashboardService.updateVendorOrderStatus(id, { status: nextStatus }));
    }

    if (!requests.length) return;

    setSaving(true);
    setError("");
    try {
      await Promise.all(requests);
      await refreshOrder();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function markAsShipped() {
    if ((order?.shippingMode || "SELF") === "PLATFORM") {
      setError("Platform shipping orders must be moved through pickup request.");
      return;
    }
    if (!trackingId.trim() || !courierName.trim()) {
      setFieldError("Tracking ID and courier name are required for self shipping.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await vendorDashboardService.markVendorOrderShipped(id, {
        shippingMode: "SELF",
        trackingId,
        courierName,
      });
      await refreshOrder();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function requestPickup() {
    setSaving(true);
    setError("");
    try {
      await vendorDashboardService.requestVendorOrderPickup(id, {
        shippingMode: "PLATFORM",
      });
      await refreshOrder();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Order</div>
          <div className="mt-1 truncate text-xl font-semibold text-slate-950 dark:text-white">
            {loading ? "Loading..." : order?.orderNumber || id}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/vendor/delivery"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back
          </Link>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => saveChanges()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            disabled={!canSave || (order?.shippingMode || "SELF") !== "SELF"}
            onClick={markAsShipped}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Self Ship
          </button>
          <button
            type="button"
            disabled={!canSave || (order?.shippingMode || "SELF") !== "PLATFORM" || !["NOT_REQUESTED", "FAILED"].includes(order?.pickupStatus || "NOT_REQUESTED")}
            onClick={requestPickup}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Request Pickup
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {fieldError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {fieldError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">Items</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{items.length} line items</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={order?.paymentStatus} />
              <StatusBadge value={order?.status} />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))
            ) : items.length ? (
              items.map((item, index) => (
                <div key={item.productId?._id || `${item.name}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950 dark:text-white">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Qty {item.quantity} · {formatCurrency(item.price)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {formatCurrency((item.price || 0) * (item.quantity || 0))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No items found.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
            <div className="text-slate-500 dark:text-slate-400">Total</div>
            <div className="font-semibold text-slate-950 dark:text-white">{formatCurrency(order?.totalAmount || 0)}</div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Customer</div>
              <div className="mt-3 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-950 dark:text-white">{user?.name || "Unknown"}</div>
                <div>{user?.email || "No email"}</div>
                <div>{user?.phone || ""}</div>
              </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Shipping address</div>
            <div className="mt-3 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-950 dark:text-white">{address?.fullName}</div>
              <div>{address?.phone}</div>
              <div>{address?.line1}</div>
              {address?.line2 ? <div>{address.line2}</div> : null}
              <div>
                {address?.city}, {address?.state} {address?.postalCode}
              </div>
              <div>{address?.country}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Update</div>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Shipping mode</div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">{order?.shippingMode || "SELF"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Shipping status</div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">{order?.shippingStatus || "NOT_SHIPPED"}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Pickup status</div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">{order?.pickupStatus || "NOT_REQUESTED"}</div>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Courier name</span>
                <input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  disabled={(order?.shippingMode || "SELF") !== "SELF"}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tracking ID</span>
                <input
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  disabled={(order?.shippingMode || "SELF") !== "SELF"}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Logistics partner</span>
                <input
                  value={partner}
                  disabled
                  readOnly
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tracking URL</span>
                <input
                  value={trackingUrl}
                  disabled
                  readOnly
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                {(order?.shippingMode || "SELF") === "PLATFORM"
                  ? "Platform shipping orders use pickup request and logistics webhooks for tracking updates."
                  : "Self shipping requires the vendor to enter a real courier name and tracking ID before moving the order to shipped."}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
