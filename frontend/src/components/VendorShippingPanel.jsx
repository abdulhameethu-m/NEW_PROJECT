import React, { useState } from "react";
import { Truck, Package, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const SHIPPING_MODES = {
  SELF: {
    id: "SELF",
    title: "Self Shipping",
    description: "Pack and enter courier details yourself",
    icon: Package,
  },
  PLATFORM: {
    id: "PLATFORM",
    title: "Platform Shipping",
    description: "Create shipment via Shiprocket and schedule pickup later",
    icon: Truck,
  },
};

export function VendorShippingPanel({ order, onShippingSubmitted, availableModes = ["SELF", "PLATFORM"] }) {
  const [selectedMode, setSelectedMode] = useState(order?.shippingMode || "SELF");
  const [trackingId, setTrackingId] = useState(order?.trackingId || "");
  const [courierName, setCourierName] = useState(order?.courierName || "");
  const [trackingUrl, setTrackingUrl] = useState(order?.trackingUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isShipped = order?.shippingStatus === "SHIPPED";
  const isShipmentCreated = Boolean(order?.shipmentId) || ["READY_FOR_PICKUP", "PICKUP_SCHEDULED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order?.shippingStatus);
  const canShip = order?.status === "Packed" && !isShipped;

  async function handleSelfShipping(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!trackingId.trim() || !courierName.trim()) {
      setError("Tracking ID and courier name are required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/shipping/vendor/orders/${order._id}/self`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingId: trackingId.trim(),
          courierName: courierName.trim(),
          trackingUrl: trackingUrl.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit tracking");
      }

      const data = await response.json();
      setSuccess("Tracking submitted successfully!");
      onShippingSubmitted?.(data.data);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to submit tracking");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlatformPickup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!availableModes.includes("PLATFORM")) {
      setError("Platform shipping is not enabled for your account");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/shipping/vendor/orders/${order._id}/platform`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create shipment");
      }

      const data = await response.json();
      setSuccess("Shipment created successfully!");
      onShippingSubmitted?.(data.data);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Shipping Options</h3>

      {error && (
        <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Status Display */}
      <div className="mb-6 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Order Status</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{order?.status || "Unknown"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Shipping Status</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{order?.shippingStatus || "NOT_SHIPPED"}</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="mb-6 space-y-3">
        {availableModes.length === 0 ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
            No shipping modes are currently enabled. Please contact admin.
          </div>
        ) : (
          Object.values(SHIPPING_MODES).map((mode) => {
            if (!availableModes.includes(mode.id)) return null;
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            const isDisabled = !canShip || (mode.id === "PLATFORM" && isShipmentCreated) || (mode.id === "SELF" && isShipped);

            return (
              <label
                key={mode.id}
                className={`relative flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="shippingMode"
                  value={mode.id}
                  checked={isSelected}
                  onChange={() => setSelectedMode(mode.id)}
                  disabled={isDisabled}
                  className="h-4 w-4"
                />
                <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{mode.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{mode.description}</p>
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* Mode-specific Forms */}
      {canShip && availableModes.length > 0 && (
        <div className="space-y-6">
          {/* Self Shipping Form */}
          {selectedMode === "SELF" && availableModes.includes("SELF") && (
            <form onSubmit={handleSelfShipping} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tracking ID *</label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="e.g., AWB123456789"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unique tracking number from courier</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Courier Name *</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g., FedEx, UPS, DHL"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tracking URL (Optional)</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://tracking.courier.com/..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !trackingId.trim() || !courierName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                {loading ? "Submitting..." : "Submit Tracking"}
              </button>
            </form>
          )}

          {/* Platform Shipping Form */}
          {selectedMode === "PLATFORM" && availableModes.includes("PLATFORM") && (
            <form onSubmit={handlePlatformPickup} className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Clicking "Create Shipment" will only create the shipment. Schedule pickup later from the pickup queue to batch multiple shipments together.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50 dark:bg-blue-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                {loading ? "Creating..." : "Create Shipment"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Current Tracking Info */}
      {(order?.trackingId || order?.shippingStatus !== "NOT_SHIPPED") && (
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Current Tracking Information</p>
          <div className="space-y-2 text-sm">
            {order?.trackingId && <div><strong>Tracking ID:</strong> {order.trackingId}</div>}
            {order?.courierName && <div><strong>Courier:</strong> {order.courierName}</div>}
            {order?.trackingUrl && (
              <div>
                <strong>Track:</strong>{" "}
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">
                  View Tracking
                </a>
              </div>
            )}
            {order?.shipmentId && <div><strong>Shipment ID:</strong> {order.shipmentId}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
