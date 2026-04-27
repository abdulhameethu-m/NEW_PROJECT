import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { VendorDataTable, VendorSection } from "../components/VendorPanel";
import { useModuleAccess } from "../context/VendorModuleContext";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function VendorDeliveryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const { can } = useModuleAccess();
  const navigate = useNavigate();

  async function load() {
    try {
      const response = await vendorDashboardService.getVendorDelivery({ limit: 20 });
      setData(response.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load delivery records.");
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  return (
    <VendorSection
      title="Delivery"
      description="Assign courier, update tracking, and maintain order shipment visibility."
      action={(
        <Link to="/vendor/pickups" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Ready for Pickup
        </Link>
      )}
    >
      {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <VendorDataTable
        rows={(data?.shipments || []).map((shipment) => ({
          id: shipment._id,
          orderNumber: shipment.orderNumber,
          shippingMode: shipment.shippingMode || "SELF",
          shippingStatus: shipment.shippingStatus || "NOT_SHIPPED",
          pickupStatus: shipment.pickupStatus || "NOT_REQUESTED",
          deliveryPartner: shipment.deliveryPartner || "Unassigned",
          courierName: shipment.courierName || "Pending",
          trackingId: shipment.trackingId || "Not assigned",
          deliveryStatus: shipment.deliveryStatus,
          destination: [shipment.shippingAddress?.city, shipment.shippingAddress?.state].filter(Boolean).join(", ") || "Address pending",
          trackingUrl: shipment.trackingUrl,
          courierAssignedByRole: shipment.courierAssignedByRole || "",
          courierAssignedAt: shipment.courierAssignedAt || "",
          isCourierLocked: shipment.courierAssignedByRole === "ADMIN",
        }))}
        columns={[
          { key: "orderNumber", label: "Order" },
          { key: "shippingMode", label: "Mode", render: (row) => <StatusBadge value={row.shippingMode} /> },
          { key: "deliveryPartner", label: "Courier" },
          { key: "trackingId", label: "Tracking" },
          { key: "pickupStatus", label: "Pickup", render: (row) => <StatusBadge value={row.pickupStatus} /> },
          { key: "destination", label: "Destination" },
          { key: "deliveryStatus", label: "Delivery Status", render: (row) => <StatusBadge value={row.shippingStatus || row.deliveryStatus} /> },
          {
            key: "actions",
            label: "Update",
            render: (row) => (
              can("delivery.update") ? (
                row.isCourierLocked ? (
                  <div className="text-right">
                    <button
                      type="button"
                      disabled
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 dark:border-slate-700"
                    >
                      Assigned by Admin
                    </button>
                    {row.courierAssignedAt ? (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {new Date(row.courierAssignedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button onClick={() => navigate(`/vendor/delivery/${row.id}/edit`)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    {row.deliveryPartner && row.deliveryPartner !== "Unassigned" ? "Edit" : "Assign Courier"}
                  </button>
                )
              ) : (
                <span className="text-xs text-slate-400">Read only</span>
              )
            ),
          },
        ]}
      />
    </VendorSection>
  );
}
