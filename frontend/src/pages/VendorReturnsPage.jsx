import { useEffect, useState } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { StatusBadge } from "../components/StatusBadge";
import { VendorDataTable, VendorSection } from "../components/VendorPanel";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function VendorReturnsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await vendorDashboardService.getVendorReturns({ limit: 20 });
      setData(response.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load returns.");
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function updateReturn(id, status) {
    const resolutionNote = window.prompt("Resolution note", "");
    if (resolutionNote == null) return;
    const refundAmount = status === "REFUNDED" ? window.prompt("Refund amount", "0") : 0;
    if (refundAmount == null) return;

    try {
      await vendorDashboardService.updateVendorReturn(id, {
        status,
        resolutionNote,
        refundAmount: Number(refundAmount || 0),
      });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update return request.");
    }
  }

  return (
    <VendorSection title="Returns & Refunds" description="Approve, reject, or refund return requests with a decision trail.">
      {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <VendorDataTable
        rows={(data?.returns || []).map((item) => ({
          id: item._id,
          order: item.orderId?.orderNumber || "Order",
          customer: item.customerId?.name || "Customer",
          reason: item.reason,
          refundAmount: formatCurrency(item.refundAmount || 0),
          status: item.status,
        }))}
        columns={[
          { key: "order", label: "Order" },
          { key: "customer", label: "Customer" },
          { key: "reason", label: "Reason" },
          { key: "refundAmount", label: "Refund" },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
          {
            key: "actions",
            label: "Decision",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                {["APPROVED", "REJECTED", "REFUNDED"].map((status) => (
                  <button key={status} onClick={() => updateReturn(row.id, status)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    {status}
                  </button>
                ))}
              </div>
            ),
          },
        ]}
      />
    </VendorSection>
  );
}
