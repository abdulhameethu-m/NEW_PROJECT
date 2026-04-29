import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import { formatWeight, getWeightUnit, getWeightValue } from "../utils/weight";
import * as vendorDashboardService from "../services/vendorDashboardService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

function getPickupLocationReadiness(shippingSettings = {}) {
  const pickupLocation =
    shippingSettings?.pickupLocations?.find?.((location) => location?.isDefault) ||
    shippingSettings?.pickupLocations?.[0] ||
    shippingSettings?.pickupAddress ||
    null;

  const missing = [];
  if (!pickupLocation?.name) missing.push("name");
  if (!pickupLocation?.phone) missing.push("phone");
  if (!pickupLocation?.addressLine1) missing.push("address");
  if (!pickupLocation?.city) missing.push("city");
  if (!pickupLocation?.state) missing.push("state");
  if (!pickupLocation?.pincode) missing.push("pincode");
  if (!pickupLocation?.country) missing.push("country");

  return {
    pickupLocation,
    missing,
    isComplete: missing.length === 0,
  };
}

function resolvePickupAddress(order, pickupReadiness) {
  return (
    order?.pickupAddressSnapshot ||
    pickupReadiness?.pickupLocation ||
    null
  );
}

const STATUS_OPTIONS = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

export function VendorOrderDetailsPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [availableModes, setAvailableModes] = useState(["SELF"]);
  const [selectedMode, setSelectedMode] = useState("SELF");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Placed");
  const [trackingId, setTrackingId] = useState("");
  const [partner, setPartner] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [courierName, setCourierName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [pickupReadiness, setPickupReadiness] = useState({ pickupLocation: null, missing: [], isComplete: false });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      vendorDashboardService.getVendorOrderById(id),
      vendorDashboardService.getVendorShippingSettings().catch(() => null),
    ])
      .then(([orderRes, shippingRes]) => {
        const nextOrder = orderRes?.data ?? orderRes;
        const shippingSettings = shippingRes?.data ?? shippingRes;
        const effectiveModes = shippingSettings?.effectiveShippingModes;
        const nextAvailableModes = Array.isArray(effectiveModes) && effectiveModes.length ? effectiveModes : ["SELF"];
        const initialMode = nextAvailableModes.includes(nextOrder?.shippingMode) ? nextOrder.shippingMode : (shippingSettings?.defaultShippingMode || nextAvailableModes[0] || "SELF");
        if (cancelled) return;
        setOrder(nextOrder);
        setAvailableModes(nextAvailableModes);
        setSelectedMode(initialMode);
        setStatus(nextOrder?.status || "Placed");
        setTrackingId(nextOrder?.trackingId || "");
        setPartner(nextOrder?.deliveryPartner || "");
        setTrackingUrl(nextOrder?.trackingUrl || "");
        setCourierName(nextOrder?.courierName || "");
        setPickupReadiness(getPickupLocationReadiness(shippingSettings));
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
  const hasBothModes = availableModes.includes("SELF") && availableModes.includes("PLATFORM");
  const selectedModeIsSelf = selectedMode === "SELF";
  const selectedModeIsPlatform = selectedMode === "PLATFORM";
  const pickupAddress = resolvePickupAddress(order, pickupReadiness);
  const paymentSummary = {
    subtotal: Number(order?.subtotal || 0),
    shippingFee: Number(order?.shippingFee || 0),
    platformFee: Number(order?.platformFee || 0),
    tax: Number(order?.taxAmount || 0),
    discount: Number(order?.discountAmount || 0),
    total: Number(order?.totalAmount || 0),
  };

  function validateTrackingFields() {
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
    setSelectedMode((current) => {
      if (availableModes.includes(current)) return current;
      if (availableModes.includes(updated?.shippingMode)) return updated.shippingMode;
      return availableModes[0] || "SELF";
    });
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
    if (!availableModes.includes("SELF")) {
      setError("Self shipping is not enabled by admin for your account.");
      return;
    }
    if (!selectedModeIsSelf) {
      setError("Select Self Shipping to submit your courier and tracking details.");
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
        shippingMode: selectedMode,
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

  async function createShipment() {
    if (!availableModes.includes("PLATFORM")) {
      setError("Platform shipping is not enabled by admin for your account.");
      return;
    }
    if (!pickupReadiness.isComplete) {
      setError(`Complete your default pickup location before creating a shipment. Missing: ${pickupReadiness.missing.join(", ")}.`);
      return;
    }
    if (!selectedModeIsPlatform) {
      setError("Select Platform Shipping to create shipment.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await vendorDashboardService.requestVendorOrderPickup(id, {
        shippingMode: selectedMode,
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
            disabled={!canSave || !selectedModeIsSelf || !availableModes.includes("SELF")}
            onClick={markAsShipped}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Self Ship
          </button>
          <button
            type="button"
            disabled={!canSave || !selectedModeIsPlatform || !availableModes.includes("PLATFORM") || !pickupReadiness.isComplete || Boolean(order?.shipmentId) || ["READY_FOR_PICKUP", "PICKUP_SCHEDULED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order?.shippingStatus)}
            onClick={createShipment}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create Shipment
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
                <div key={`${item.productId?._id || `${item.name}-${index}`}-${item.variantId || "base"}`} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="truncate font-semibold text-slate-950 dark:text-white">{item.name}</div>
                    {item.variantTitle || item.variantId ? (
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        Variant: {item.variantTitle || Object.entries(item.variantAttributes || {}).map(([key, value]) => `${key}: ${value}`).join(" / ")}
                      </div>
                    ) : null}
                    {getWeightValue(item) > 0 ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Weight: {formatWeight(getWeightValue(item), getWeightUnit(item))}
                        {Number(item.quantity || 0) > 1
                          ? ` each • ${formatWeight(getWeightValue(item) * Number(item.quantity || 0), getWeightUnit(item))} total`
                          : ""}
                      </div>
                    ) : null}
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Qty {item.quantity} · Unit {formatCurrency(item.price)}
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

          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
            <div className="mb-2 font-semibold text-slate-950 dark:text-white">Payment summary</div>
            <div className="grid gap-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(paymentSummary.subtotal)}</span></div>
              <div className="flex items-center justify-between"><span>Shipping Fee</span><span>{formatCurrency(paymentSummary.shippingFee)}</span></div>
              <div className="flex items-center justify-between"><span>Platform Fee</span><span>{formatCurrency(paymentSummary.platformFee)}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>{formatCurrency(paymentSummary.tax)}</span></div>
              <div className="flex items-center justify-between"><span>Discount</span><span>- {formatCurrency(paymentSummary.discount)}</span></div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 font-semibold text-slate-950 dark:border-slate-800 dark:text-white"><span>Total Amount</span><span>{formatCurrency(paymentSummary.total)}</span></div>
            </div>
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
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Pickup address</div>
            <div className="mt-3 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-950 dark:text-white">{pickupAddress?.name || "Not captured yet"}</div>
              <div>{pickupAddress?.phone || "No pickup phone"}</div>
              <div>{pickupAddress?.addressLine1 || "No pickup address"}</div>
              {pickupAddress?.addressLine2 ? <div>{pickupAddress.addressLine2}</div> : null}
              <div>
                {[pickupAddress?.city, pickupAddress?.state, pickupAddress?.pincode].filter(Boolean).join(", ") ||
                  "Pickup city/state/pincode not available"}
              </div>
              <div>{pickupAddress?.country || ""}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Update</div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vendor shipping options</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: "SELF",
                      title: "Self Shipping",
                      description: "Vendor enters courier name and tracking ID.",
                    },
                    {
                      id: "PLATFORM",
                      title: "Platform Shipping",
                      description: "Create shipment now and batch pickup later from the queue.",
                    },
                  ]
                    .filter((mode) => availableModes.includes(mode.id))
                    .map((mode) => (
                      <label
                        key={mode.id}
                        className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${
                          selectedMode === mode.id
                            ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-950"
                            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="vendorShippingMode"
                            value={mode.id}
                            checked={selectedMode === mode.id}
                            onChange={() => setSelectedMode(mode.id)}
                            disabled={saving || loading}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-semibold text-slate-950 dark:text-white">{mode.title}</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{mode.description}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {hasBothModes
                    ? "Admin enabled both modes, so you can choose either self shipping or platform pickup for this order."
                    : availableModes.includes("SELF")
                      ? "Admin enabled only self shipping, so you can ship this order yourself."
                      : "Admin enabled only platform shipping, so you can create shipment for this order."}
                </div>
              </div>

              {availableModes.includes("PLATFORM") && !pickupReadiness.isComplete ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Platform shipment creation is blocked until your default pickup location is complete. Missing: {pickupReadiness.missing.join(", ")}.{" "}
                  <Link to="/vendor/settings" className="font-semibold underline">
                    Update pickup settings
                  </Link>
                </div>
              ) : null}

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
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Pickup batch</div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">{order?.pickupBatchId || "Not scheduled"}</div>
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
                  disabled={!selectedModeIsSelf}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tracking ID</span>
                <input
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  disabled={!selectedModeIsSelf}
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
                {selectedModeIsPlatform
                  ? "Platform shipping creates a Shiprocket shipment first. Use the Ready for Pickup queue to batch multiple shipments into one pickup request."
                  : "Self shipping requires the vendor to enter a real courier name and tracking ID before moving the order to shipped."}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
