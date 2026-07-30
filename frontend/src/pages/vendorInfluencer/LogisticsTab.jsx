import { useState } from "react";
import { ArrowRight, ExternalLink, PackageCheck, Truck, Undo2, X } from "lucide-react";
import { EmptyState, formatDateTime, Pagination, ResponsiveTable, StatusBadge, statusText } from "./VendorInfluencerShared";

const DELIVERY_FLOW = ["placed", "packing", "packed", "ready_for_pickup", "picked_up", "shipped", "in_transit", "out_for_delivery", "delivered", "delivery_confirmed"];
const RETURN_FLOW = ["return_placed", "return_packing", "return_ready_for_pickup", "return_shipped", "return_in_transit", "return_out_for_delivery", "return_received", "quality_check", "return_approved", "return_completed"];

function nextStatus(flow = [], current = "") {
  const index = flow.indexOf(current);
  if (index < 0) return flow[0];
  return flow[Math.min(index + 1, flow.length - 1)];
}

function compactAddress(...parts) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}

function AddressBlock({ title, address = {} }) {
  const locality = compactAddress(address.city, [address.state, address.postalCode].filter(Boolean).join(" - "));
  const lines = [
    address.name,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    locality,
    address.country,
  ].filter(Boolean);
  return (
    <div className="min-w-56 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950/60">
      <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      {lines.length ? (
        <address className="mt-1 space-y-0.5 not-italic text-slate-700 dark:text-slate-200">
          {lines.map((line) => <p key={line}>{line}</p>)}
        </address>
      ) : (
        <p className="mt-1 text-slate-500">Not available</p>
      )}
    </div>
  );
}

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function ShippingModal({ state, onClose, onSubmit, busy }) {
  const isReturn = state?.type === "return";
  const row = state?.row || {};
  const [form, setForm] = useState(() => ({
    courierCompany: isReturn ? row.returnCourierCompany || row.courierCompany || "" : row.courierCompany || "",
    trackingNumber: isReturn ? row.returnTrackingNumber || row.trackingNumber || "" : row.trackingNumber || "",
    trackingUrl: isReturn ? row.returnTrackingUrl || row.trackingUrl || "" : row.trackingUrl || "",
    shipmentDate: toInputDate(isReturn ? row.returnShipmentDate || row.shipmentDate : row.shipmentDate),
    estimatedDelivery: toInputDate(isReturn ? row.returnEstimatedDelivery || row.estimatedDelivery : row.estimatedDelivery),
    packageWeight: row.packageWeight || "",
    notes: isReturn ? row.returnNotes || row.notes || "" : row.notes || "",
  }));
  const [error, setError] = useState("");
  if (!state?.open) return null;

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const missing = [
      ["courierCompany", "Courier partner"],
      ["trackingNumber", "Tracking number / AWB"],
      ["trackingUrl", "Tracking URL"],
      ["shipmentDate", "Dispatch date"],
      ["estimatedDelivery", "Estimated delivery date"],
    ].filter(([key]) => !String(form[key] || "").trim());
    if (missing.length) {
      setError(`${missing.map(([, label]) => label).join(", ")} required.`);
      return;
    }
    const payload = isReturn
      ? {
          shipmentStatus: state.status,
          returnCourierCompany: form.courierCompany,
          returnTrackingNumber: form.trackingNumber,
          returnTrackingUrl: form.trackingUrl,
          returnShipmentDate: form.shipmentDate,
          returnEstimatedDelivery: form.estimatedDelivery,
          packageWeight: form.packageWeight,
          returnNotes: form.notes,
        }
      : {
          shipmentStatus: state.status,
          courierCompany: form.courierCompany,
          trackingNumber: form.trackingNumber,
          trackingUrl: form.trackingUrl,
          shipmentDate: form.shipmentDate,
          estimatedDelivery: form.estimatedDelivery,
          packageWeight: form.packageWeight,
          notes: form.notes,
        };
    onSubmit(state.row, state.status, state.type, payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{isReturn ? "Return Shipping" : "Product Shipping"}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{row.campaign?.title || "Campaign"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Courier Partner
            <input value={form.courierCompany} onChange={(event) => setField("courierCompany", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Tracking Number / AWB
            <input value={form.trackingNumber} onChange={(event) => setField("trackingNumber", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
            Tracking URL
            <input value={form.trackingUrl} onChange={(event) => setField("trackingUrl", event.target.value)} placeholder="https://courier.example/track/AWB123" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Dispatch Date
            <input type="date" value={form.shipmentDate} onChange={(event) => setField("shipmentDate", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Estimated Delivery
            <input type="date" value={form.estimatedDelivery} onChange={(event) => setField("estimatedDelivery", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Package Weight
            <input value={form.packageWeight} onChange={(event) => setField("packageWeight", event.target.value)} placeholder="Example: 500 g" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
            Shipping Notes
            <textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
        </div>
        {error ? <p className="mx-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">{error}</p> : null}
        <div className="flex justify-end gap-2 px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
          <button type="submit" disabled={busy} className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            Save & Mark Shipped
          </button>
        </div>
      </form>
    </div>
  );
}

function LogisticsTab({ type = "delivery", data = {}, busyId = "", onPage, onNextStatus }) {
  const isReturn = type === "return";
  const rows = data.items || [];
  const flow = isReturn ? RETURN_FLOW : DELIVERY_FLOW;
  const Icon = isReturn ? Undo2 : PackageCheck;
  const title = isReturn ? "Returned Products" : "Delivered Products";
  const description = isReturn
    ? "Track product return movement from influencer back to your return address."
    : "Track product movement from your warehouse to the influencer delivery address.";
  const [shippingModal, setShippingModal] = useState({ open: false, row: null, status: "", type });

  function handleStatus(row, status) {
    if (["shipped", "return_shipped"].includes(status)) {
      setShippingModal({ open: true, row, status, type });
      return;
    }
    onNextStatus(row, status, {});
  }

  async function submitShipping(row, status, modalType, payload) {
    const ok = await onNextStatus(row, status, payload);
    if (ok !== false) setShippingModal({ open: false, row: null, status: "", type: modalType });
  }

  return (
    <div className="space-y-4">
      <ShippingModal state={shippingModal} busy={Boolean(busyId)} onClose={() => setShippingModal({ open: false, row: null, status: "", type })} onSubmit={submitShipping} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {data.pagination?.total || rows.length} records
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {!rows.length ? (
          <EmptyState message={isReturn ? "No return product records found." : "No delivery product records found."} />
        ) : (
          <>
            <ResponsiveTable
              headers={["Campaign", "Product", "Influencer", "Address", "Tracking", "Status", "Action"]}
              rows={rows}
              renderRow={(row) => {
                const shipmentId = row.id || row._id;
                const currentStatus = row.shipmentStatus || flow[0];
                const targetStatus = nextStatus(flow, currentStatus);
                const atEnd = targetStatus === currentStatus;
                const trackingUrl = isReturn ? row.returnTrackingUrl : row.trackingUrl;
                return (
                  <tr key={shipmentId} className="border-t border-slate-100 align-top dark:border-slate-800">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-950 dark:text-white">{row.campaign?.title || "Campaign"}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">{statusText(row.campaign?.state || "")}</p>
                    </td>
                    <td className="px-3 py-3">
                      {(row.products || []).map((product) => (
                        <p key={product.id} className="font-medium text-slate-700 dark:text-slate-200">{product.name}</p>
                      ))}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{row.influencer?.name || "Influencer"}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.influencer?.email || row.influencer?.username || ""}</p>
                    </td>
                    <td className="px-3 py-3">
                      <AddressBlock title={isReturn ? "Vendor return address" : "Influencer delivery address"} address={isReturn ? row.returnAddressSnapshot : row.deliveryAddressSnapshot} />
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p><span className="font-semibold">Courier:</span> {isReturn ? row.returnCourierCompany || "-" : row.courierCompany || "-"}</p>
                      <p className="mt-1"><span className="font-semibold">Tracking:</span> {isReturn ? row.returnTrackingNumber || "-" : row.trackingNumber || "-"}</p>
                      <p className="mt-1"><span className="font-semibold">Updated:</span> {formatDateTime(row.updatedAt || row.shipmentDate || row.returnShipmentDate)}</p>
                      {trackingUrl ? (
                        <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-300">
                          Track <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </td>
                    <td className="px-3 py-3"><StatusBadge value={currentStatus} /></td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={Boolean(busyId) || atEnd}
                        onClick={() => handleStatus(row, targetStatus)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
                      >
                        {atEnd ? "Complete" : statusText(targetStatus)}
                        {!atEnd ? <ArrowRight className="h-3.5 w-3.5" /> : null}
                      </button>
                    </td>
                  </tr>
                );
              }}
            />
            <Pagination pagination={data.pagination} onPage={onPage} />
          </>
        )}
      </section>
    </div>
  );
}

export default LogisticsTab;
