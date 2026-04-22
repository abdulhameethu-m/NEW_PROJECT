import { useEffect, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { VendorDataTable, VendorSection } from "../components/VendorPanel";
import { useModuleAccess } from "../context/VendorModuleContext";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function VendorDeliveryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const { can } = useModuleAccess();

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

  async function updateShipment(id, row) {
    const deliveryPartner = window.prompt("Courier name", row.deliveryPartner || "Shiprocket");
    if (deliveryPartner == null) return;
    const trackingId = window.prompt("Tracking ID", row.trackingId || "");
    if (trackingId == null) return;
    const trackingUrl = window.prompt("Tracking URL", row.trackingUrl || "");
    if (trackingUrl == null) return;

    try {
      await vendorDashboardService.updateVendorDelivery(id, {
        deliveryPartner,
        trackingId,
        trackingUrl,
        deliveryStatus: trackingId ? "SHIPPED" : row.deliveryStatus,
      });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update shipment.");
    }
  }

  return (
    <VendorSection title="Delivery" description="Assign courier, update tracking, and maintain order shipment visibility.">
      {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <VendorDataTable
        rows={(data?.shipments || []).map((shipment) => ({
          id: shipment._id,
          orderNumber: shipment.orderNumber,
          deliveryPartner: shipment.deliveryPartner || "Unassigned",
          trackingId: shipment.trackingId || "Not assigned",
          deliveryStatus: shipment.deliveryStatus,
          destination: [shipment.shippingAddress?.city, shipment.shippingAddress?.state].filter(Boolean).join(", ") || "Address pending",
          trackingUrl: shipment.trackingUrl,
        }))}
        columns={[
          { key: "orderNumber", label: "Order" },
          { key: "deliveryPartner", label: "Courier" },
          { key: "trackingId", label: "Tracking" },
          { key: "destination", label: "Destination" },
          { key: "deliveryStatus", label: "Delivery Status", render: (row) => <StatusBadge value={row.deliveryStatus} /> },
          {
            key: "actions",
            label: "Update",
            render: (row) => (
              can("delivery.update") ? (
                <button onClick={() => updateShipment(row.id, row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Assign Courier
                </button>
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
