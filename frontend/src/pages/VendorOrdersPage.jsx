import { useEffect, useState } from "react";
import { ReportingToolbar } from "../components/ReportingToolbar";
import { InlineToast } from "../components/commerce/InlineToast";
import { useReporting } from "../hooks/useReporting";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import { VendorDataTable, VendorSection } from "../components/VendorPanel";
import * as vendorDashboardService from "../services/vendorDashboardService";

const orderStatuses = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

export function VendorOrdersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const reporting = useReporting({
    module: "orders",
  });

  async function load() {
    try {
      const response = await vendorDashboardService.getVendorOrders({ limit: 20, ...reporting.appliedParams });
      setData(response.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load orders.");
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [reporting.appliedParams]);

  async function updateStatus(id, status) {
    try {
      await vendorDashboardService.updateVendorOrderStatus(id, { status });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update order status.");
    }
  }

  async function handleExport(format) {
    try {
      await reporting.exportReport(format);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to export orders.");
    }
  }

  return (
    <VendorSection title="Order Management" description="Accept and move orders through packed, shipped, and delivered states.">
      <div className="mb-4">
        <ReportingToolbar
          startDate={reporting.startDate}
          endDate={reporting.endDate}
          onDateChange={reporting.setDateRange}
          onApply={reporting.applyDateRange}
          onExport={handleExport}
          exportingFormat={reporting.exportingFormat}
          isDirty={reporting.hasPendingChanges}
        />
      </div>
      {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <VendorDataTable
        rows={(data?.orders || []).map((order) => ({
          id: order._id,
          orderNumber: order.orderNumber,
          customer: order.userId?.name || "Customer",
          amount: formatCurrency(order.totalAmount),
          status: order.status,
          paymentStatus: order.paymentStatus,
          placedAt: new Date(order.createdAt).toLocaleString(),
        }))}
        columns={[
          { key: "orderNumber", label: "Order" },
          { key: "customer", label: "Customer" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "paymentStatus", label: "Payment", render: (row) => <StatusBadge value={row.paymentStatus} /> },
          { key: "placedAt", label: "Created" },
          {
            key: "workflow",
            label: "Next Step",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                {orderStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(row.id, status)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    {status}
                  </button>
                ))}
              </div>
            ),
          },
        ]}
      />
      <InlineToast toast={reporting.toast} onClose={reporting.clearToast} />
    </VendorSection>
  );
}
