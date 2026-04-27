import React, { useState } from "react";
import { Truck, Package, CheckCircle2, Clock, AlertCircle, MapPin, Loader2 } from "lucide-react";

const STATUS_COLORS = {
  NOT_SHIPPED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  READY_FOR_PICKUP: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PICKUP_SCHEDULED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  SHIPPED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_ICONS = {
  NOT_SHIPPED: Package,
  READY_FOR_PICKUP: Truck,
  PICKUP_SCHEDULED: Truck,
  SHIPPED: Truck,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: MapPin,
  DELIVERED: CheckCircle2,
  FAILED: AlertCircle,
};

const STATUS_STEPS = {
  SELF: [
    { key: "NOT_SHIPPED", label: "Order Placed", description: "Awaiting shipment" },
    { key: "SHIPPED", label: "Shipped", description: "On the way to you" },
    { key: "DELIVERED", label: "Delivered", description: "Successfully delivered" },
  ],
  PLATFORM: [
    { key: "READY_FOR_PICKUP", label: "Shipment Created", description: "Waiting in pickup queue" },
    { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled", description: "Courier pickup has been booked" },
    { key: "IN_TRANSIT", label: "In Transit", description: "Moving to you" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", description: "Driver on the way" },
    { key: "DELIVERED", label: "Delivered", description: "Successfully delivered" },
  ],
};

export function OrderTrackingPanel({ order, loading }) {
  const [expandedTimeline, setExpandedTimeline] = useState(false);

  const shippingMode = order?.shippingMode || "SELF";
  const steps = STATUS_STEPS[shippingMode] || STATUS_STEPS.SELF;

  const currentStepIndex = steps.findIndex((s) => s.key === order?.shippingStatus);
  const isDelivered = order?.shippingStatus === "DELIVERED";
  const isFailed = order?.shippingStatus === "FAILED";

  const getStepStatus = (index) => {
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "active";
    return "pending";
  };

  const TrackingIcon = STATUS_ICONS[order?.shippingStatus] || Package;

  return (
    <div className="space-y-6">
      {/* Main Tracking Status */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium uppercase text-slate-500 dark:text-slate-400">Current Status</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {order?.shippingStatus?.replace(/_/g, " ") || "Not Shipped"}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {order?.shippingMode === "PLATFORM"
                  ? "Your order is being handled by our logistics partner"
                  : "Your order is being shipped via courier"}
              </p>
            </div>
            <div className={`rounded-full p-4 ${STATUS_COLORS[order?.shippingStatus] || STATUS_COLORS.NOT_SHIPPED}`}>
              <TrackingIcon className="h-8 w-8" />
            </div>
          </div>

          {/* Key Info */}
          {(order?.trackingId || order?.courierName || order?.shippingMode) && (
            <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-3 dark:border-slate-700">
              {order?.trackingId && (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Tracking ID</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900 dark:text-white">{order.trackingId}</p>
                </div>
              )}
              {order?.courierName && (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Courier</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{order.courierName}</p>
                </div>
              )}
              {order?.shippingMode && (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Shipping Mode</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {order.shippingMode === "PLATFORM" ? "Platform Shipping" : "Self Shipping"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tracking URL */}
          {order?.trackingUrl && (
            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Truck className="h-4 w-4" />
                Track with Courier
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">Delivery Timeline</h4>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isCurrentStep = status === "active";
            const isCompleted = status === "completed";

            return (
              <div key={step.key} className="flex gap-4">
                {/* Timeline Node */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                      isCompleted || isCurrentStep
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                        : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`my-1 h-8 w-1 ${
                        isCompleted
                          ? "bg-slate-900 dark:bg-white"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                  )}
                </div>

                {/* Timeline Content */}
                <div className={`flex-1 pt-1 ${isCurrentStep ? "font-semibold" : ""}`}>
                  <h5 className={`text-sm ${isCurrentStep ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                    {step.label}
                  </h5>
                  <p className={`mt-0.5 text-xs ${isCompleted ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {(isDelivered || isFailed) && (
          <div className={`mt-6 rounded-lg p-3 text-sm ${isDelivered ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"}`}>
            {isDelivered ? "✓ Your order has been successfully delivered!" : "✗ There was an issue with your delivery."}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      {order?.timeline && order.timeline.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Activity Timeline</h4>

          <div className="space-y-3">
            {order.timeline.slice(0, expandedTimeline ? order.timeline.length : 3).map((event, idx) => (
              <div key={idx} className="flex gap-3 border-l-2 border-slate-200 py-2 pl-4 dark:border-slate-700">
                <div className="pt-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{event.status || "Update"}</p>
                  {event.note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{event.note}</p>}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {new Date(event.changedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {order.timeline.length > 3 && (
              <button
                onClick={() => setExpandedTimeline(!expandedTimeline)}
                className="w-full rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {expandedTimeline ? "Show Less" : `Show ${order.timeline.length - 3} More Events`}
              </button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}
    </div>
  );
}

/**
 * Simplified badge for quick status display in lists
 */
export function ShippingStatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.NOT_SHIPPED;
  const Icon = STATUS_ICONS[status] || Package;

  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{status?.replace(/_/g, " ")}</span>
    </div>
  );
}
