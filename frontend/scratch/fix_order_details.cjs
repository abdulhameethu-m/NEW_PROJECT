const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), "src/pages/OrderDetailsPage.jsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Update Imports
if (!content.includes('lucide-react')) {
  content = content.replace('import { Link, useParams } from "react-router-dom";', 'import { Link, useParams } from "react-router-dom";\nimport { Package, History, User, CreditCard, ClipboardList, Store, Receipt, Truck, MapPin, Phone, Mail, Building2, Download, Eye, CornerUpLeft, XCircle } from "lucide-react";');
} else {
  content = content.replace(/import \{.*?\} from "lucide-react";/, 'import { Package, History, User, CreditCard, ClipboardList, Store, Receipt, Truck, MapPin, Phone, Mail, Building2, Download, Eye, CornerUpLeft, XCircle } from "lucide-react";');
}

// 2. Update KeyValue
content = content.replace(
`function KeyValue({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{value || "Not available"}</div>
    </div>
  );
}`,
`function KeyValue({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 flex items-start gap-1.5 text-[14px] font-medium text-slate-700 dark:text-slate-200">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" /> : null}
        <span>{value || "Not available"}</span>
      </div>
    </div>
  );
}`
);

// 3. Update top banner to match target image (dark gradient bg, • separators)
content = content.replace(
`className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(135deg,#0f172a,#1e293b)] px-6 py-6 text-white sm:px-8 print:bg-none print:px-0 print:text-slate-950"`,
`className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(135deg,#1e1b4b,#312e81)] px-6 py-6 text-white sm:px-8 print:bg-none print:px-0 print:text-slate-950"`
);

// Add bullets between meta items
content = content.replace(
`<span>Invoice: {order.invoiceNumber}</span>
                <span>Placed: {formatDateTime(order.orderDate || order.createdAt)}</span>
                <span>Estimated delivery: {order.estimatedDeliveryLabel || formatDate(order.estimatedDelivery)}</span>`,
`<span>Invoice: {order.invoiceNumber}</span>
                <span className="hidden sm:inline">•</span>
                <span>Placed: {formatDateTime(order.orderDate || order.createdAt)}</span>
                <span className="hidden sm:inline">•</span>
                <span>Estimated delivery: {order.estimatedDeliveryLabel || formatDate(order.estimatedDelivery)}</span>`
);

// 4. Update Header Buttons
const buttonRegex = /<div className="flex flex-wrap items-center gap-2 print:hidden">[\s\S]*?<\/div>/;
content = content.replace(buttonRegex, 
`<div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 ring-1 ring-inset ring-indigo-500/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/20">{order.status}</span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">{order.paymentStatus}</span>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleDownloadInvoice}
                className="inline-flex items-center gap-2 rounded-[12px] border border-white/20 bg-white/5 px-4 py-2 text-[13px] font-bold text-white backdrop-blur transition hover:bg-white/10 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download Invoice
              </button>
              <Link
                to={\`/orders/\${orderId}/invoice\`}
                className="inline-flex items-center gap-2 rounded-[12px] bg-white px-4 py-2 text-[13px] font-bold text-indigo-700 transition hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" /> Preview Invoice
              </Link>
              <button
                type="button"
                onClick={() => document.getElementById("order-timeline")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex items-center gap-2 rounded-[12px] bg-white px-4 py-2 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <MapPin className="h-4 w-4" /> Track Order
              </button>
              <button
                type="button"
                disabled={!canReturn || actionBusy}
                onClick={handleReturn}
                className="inline-flex items-center gap-2 rounded-[12px] border border-white/20 px-4 py-2 text-[13px] font-bold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CornerUpLeft className="h-4 w-4" /> Return Order
              </button>
              <button
                type="button"
                disabled={!canCancel || actionBusy}
                onClick={() => {
                  setCancelOpen(true);
                  void loadCancelPreview();
                }}
                className="inline-flex items-center gap-2 rounded-[12px] border border-rose-500/30 px-4 py-2 text-[13px] font-bold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Cancel Order
              </button>
            </div>`
);

// 5. Replace card styling generally
content = content.replace(/rounded-3xl border border-slate-200 p-5/g, "rounded-[1.25rem] border border-slate-200 p-6");

// Helper
function replaceSectionHeader(title, icon, exactHtmlTitleRegex, customRight = null) {
  let search = exactHtmlTitleRegex;
  let rep = `<div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <${icon} className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">${title}</h2>
                </div>
                ${customRight ? customRight : ''}
              </div>`;
  content = content.replace(search, rep);
}

replaceSectionHeader("Products", "Package", /<div className="flex items-center justify-between gap-3">\s*<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Products<\/h2>\s*<div className="text-sm text-slate-500 dark:text-slate-400">\{order\.items\?\.length \|\| 0\} line items<\/div>\s*<\/div>/, '<div className="text-sm text-slate-500 dark:text-slate-400">{order.items?.length || 0} line items</div>');
replaceSectionHeader("Order Timeline", "History", /<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Order Timeline<\/h2>/);
replaceSectionHeader("Order Overview", "ClipboardList", /<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Order Overview<\/h2>/);
replaceSectionHeader("Seller", "Store", /<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Seller<\/h2>/);
replaceSectionHeader("Payment Breakdown", "Receipt", /<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Payment Breakdown<\/h2>/);
replaceSectionHeader("Shipping Details", "Truck", /<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Shipping Details<\/h2>/);

// 6. Rewrite Customer and Payment details (they are after Order Timeline in the original code)
const customerRegex = /<section className="print-card[^>]*>\s*<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Customer<\/h2>[\s\S]*?<\/section>/;
content = content.replace(customerRegex, `<section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Customer</h2>
              </div>
              <div className="print-kv-grid grid gap-6 sm:grid-cols-2">
                <div className="grid content-start gap-4">
                  <KeyValue label="Name" value={order.customer?.name} />
                  <KeyValue label="Phone" value={order.customer?.phone} icon={Phone} />
                  <KeyValue label="Email" value={order.customer?.email} icon={Mail} />
                </div>
                <div className="grid content-start gap-4">
                  <KeyValue
                    label="Shipping Address"
                    icon={MapPin}
                    value={[
                      order.customer?.shippingAddress?.line1,
                      order.customer?.shippingAddress?.line2,
                      [order.customer?.shippingAddress?.city, order.customer?.shippingAddress?.state, order.customer?.shippingAddress?.postalCode].filter(Boolean).join(", "),
                      order.customer?.shippingAddress?.country,
                    ].filter(Boolean).join(", ")}
                  />
                  <KeyValue
                    label="Billing Address"
                    icon={Building2}
                    value={[
                      order.customer?.billingAddress?.line1,
                      order.customer?.billingAddress?.line2,
                      [order.customer?.billingAddress?.city, order.customer?.billingAddress?.state, order.customer?.billingAddress?.postalCode].filter(Boolean).join(", "),
                      order.customer?.billingAddress?.country,
                    ].filter(Boolean).join(", ")}
                  />
                </div>
              </div>
            </section>`);

const paymentRegex = /<section className="print-card[^>]*>\s*<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Payment Details<\/h2>[\s\S]*?<\/section>/;
content = content.replace(paymentRegex, `<section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Payment Details</h2>
              </div>
              <div className="print-kv-grid grid gap-6 sm:grid-cols-2">
                <div className="grid content-start gap-4">
                  <KeyValue label="Method" value={order.payment?.method} />
                  <KeyValue label="Transaction ID" value={order.payment?.transactionId || "COD"} />
                  <KeyValue label="Payment Timestamp" value={order.payment?.timestamp ? formatDateTime(order.payment.timestamp) : "Awaiting payment"} />
                </div>
                <div className="grid content-start gap-4">
                  <KeyValue label="Refund Status" value={order.refundSummary?.status || "NONE"} />
                  <KeyValue label="Refund Amount" value={formatCurrency(order.refundSummary?.amount || 0, { currency: order.pricing?.currency })} />
                  <KeyValue label="Deduction Amount" value={formatCurrency(order.refundSummary?.deductionAmount || 0, { currency: order.pricing?.currency })} />
                </div>
              </div>
              {order.refundSummary?.status === "PENDING" ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Refund is being processed by finance team.
                </div>
              ) : null}
            </section>`);

// Make Statuses in Overview show properly with badges
content = content.replace(
`<KeyValue label="Payment Status" value={order.paymentStatus} />`,
`<KeyValue label="Payment Status" value={<span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">{order.paymentStatus}</span>} />`
);
content = content.replace(
`<KeyValue label="Order Status" value={order.status} />`,
`<KeyValue label="Order Status" value={<span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 ring-1 ring-inset ring-indigo-500/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/20">{order.status}</span>} />`
);


fs.writeFileSync(filePath, content, "utf8");
console.log("Replaced cleanly.");
