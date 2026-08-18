const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "src/pages/OrderDetailsPage.jsx");
let content = fs.readFileSync(filePath, "utf8");

// Helper to replace section headers
function replaceHeader(title, iconComponent, extraContent = "") {
  const searchStr = `<h2 className="text-lg font-semibold text-slate-950 dark:text-white">${title}</h2>`;
  const replaceStr = `<div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <${iconComponent} className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">${title}</h2>
                </div>
                ${extraContent}
              </div>`;
  content = content.replace(searchStr, replaceStr);
}

// 1. Change card styles
content = content.replace(/rounded-3xl border border-slate-200 p-5/g, "rounded-[1.25rem] border border-slate-200 p-6");

// 2. Replace Products Header manually since it has the line items div
const productHeaderSearch = `<div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Products</h2>
                <div className="text-sm text-slate-500 dark:text-slate-400">{order.items?.length || 0} line items</div>
              </div>`;
const productHeaderReplace = `<div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Package className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Products</h2>
                </div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{order.items?.length || 0} line items</div>
              </div>`;
content = content.replace(productHeaderSearch, productHeaderReplace);
if (content.includes("mt-5 grid gap-4")) {
  content = content.replace(`className="print-products mt-5 grid gap-4"`, `className="print-products mt-6 grid gap-4"`);
}

// 3. Replace all other headers
replaceHeader("Order Timeline", "History");
replaceHeader("Order Overview", "ClipboardList");
replaceHeader("Seller", "Store");
replaceHeader("Payment Breakdown", "Receipt");
replaceHeader("Shipping Details", "Truck");

// Customer and Payment Details require structural changes for the grid layouts

// 4. Customer section structural replace
const customerSearchRegex = /<section className="print-card[^>]*>[\s\S]*?<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Customer<\/h2>[\s\S]*?<\/section>/;
const customerReplace = `<section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300">
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
            </section>`;

content = content.replace(customerSearchRegex, customerReplace);

// 5. Payment Details structural replace
const paymentSearchRegex = /<section className="print-card[^>]*>[\s\S]*?<h2 className="text-lg font-semibold text-slate-950 dark:text-white">Payment Details<\/h2>[\s\S]*?<\/section>/;
const paymentReplace = `<section className="print-card rounded-[1.25rem] border border-slate-200 p-6 dark:border-slate-800 print:rounded-none print:border print:border-slate-300">
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
            </section>`;

content = content.replace(paymentSearchRegex, paymentReplace);

fs.writeFileSync(filePath, content, "utf8");
console.log("Replaced successfully!");
