import{a as e}from"./rolldown-runtime-JBjygSuY.js";import{i as t,r as n}from"./vendor-animation-BYLj7tg4.js";import{n as r,u as i}from"./vendor-router-SC0RZL3U.js";import{t as a}from"./resolveUrl-DRGNg6Bn.js";import{o}from"./notificationService-59Q7krcI.js";import{t as s}from"./formatCurrency-DWPX4cg6.js";import{E as c,c as l,h as u,m as d,n as f,w as p}from"./userService-CYF1UUHg.js";import{t as m}from"./StatusBadge-DFDNAIsl.js";import{t as h}from"./UnifiedPricingBreakdown-DAibOzyp.js";import{a as g,i as _,n as v}from"./SellerNavigation-DNYuliU4.js";import{t as y}from"./CancelOrderModal-BtX6zBm5.js";var b=e(t(),1),x=n();function S(e){return e?.response?.data?.message||e?.message||`Failed to load order details.`}function C(e){if(!e)return`Not available`;let t=new Date(e);return Number.isNaN(t.getTime())?`Not available`:t.toLocaleString()}function w(e){if(!e)return`Not available`;let t=new Date(e);return Number.isNaN(t.getTime())?`Not available`:t.toLocaleDateString()}function T({label:e,value:t}){return(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`div`,{className:`text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400`,children:e}),(0,x.jsx)(`div`,{className:`mt-1 text-sm text-slate-700 dark:text-slate-200`,children:t||`Not available`})]})}function E(){let{orderId:e}=i(),[t,n]=(0,b.useState)(null),[E,D]=(0,b.useState)(null),[O,k]=(0,b.useState)(!0),[A,j]=(0,b.useState)(``),[M,N]=(0,b.useState)(!1),[P,F]=(0,b.useState)(!1),[I,L]=(0,b.useState)(null);(0,b.useEffect)(()=>{let t=!1;return Promise.all([d(e),u(e)]).then(([e,r])=>{t||(n(e.data),D(r.data))}).catch(e=>{t||j(S(e))}).finally(()=>{t||k(!1)}),()=>{t=!0}},[e]);let R=t?.status===`Delivered`,z=[`REQUESTED`,`APPROVED`,`CANCELLED`].includes(t?.cancellation?.status),B=[`Pending`,`Placed`,`Packed`,`Shipped`,`Out for Delivery`].includes(t?.status)&&!z,V=(0,b.useMemo)(()=>t?.timeline?.steps||[],[t]),H=(0,b.useMemo)(()=>E?.timeline||t?.timeline?.events||[],[t,E]);async function U(){let t=await o({title:`Request return`,label:`Reason for return`,multiline:!0});if(t){N(!0);try{await c(e,{reason:t});let[r,i]=await Promise.all([d(e),u(e)]);n(r.data),D(i.data),j(``)}catch(e){j(S(e))}finally{N(!1)}}}async function W(){N(!0);try{await l(e),j(``)}catch(e){j(S(e))}finally{N(!1)}}async function G(t={}){N(!0);try{let n=await p(e,t);L(n.data||n),j(``)}catch(e){j(S(e))}finally{N(!1)}}async function K(t={}){N(!0);try{await f(e,t);let[r,i]=await Promise.all([d(e),u(e)]);n(r.data),D(i.data),F(!1),L(null),j(``)}catch(e){j(S(e))}finally{N(!1)}}return O?(0,x.jsx)(`div`,{className:`h-80 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800`}):t?(0,x.jsxs)(`div`,{className:`print-order-page grid gap-6 print:gap-3`,children:[A?(0,x.jsx)(`div`,{className:`rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700`,children:A}):null,(0,x.jsx)(`style`,{children:`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          @media print {
            html, body {
              background: #fff !important;
            }

            body * {
              visibility: hidden;
            }

            .print-order-page,
            .print-order-page * {
              visibility: visible;
            }

            .print-order-page {
              position: absolute;
              left: 0;
              top: 0;
              width: 190mm;
              max-width: 190mm;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }

            .print-order-sheet {
              width: 100% !important;
              border: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              background: #fff !important;
            }

            .print-order-grid {
              display: grid !important;
              grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) !important;
              gap: 10px !important;
              padding: 8px 0 0 0 !important;
            }

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              border: 1px solid #cbd5e1 !important;
              border-radius: 8px !important;
              padding: 10px !important;
              background: #fff !important;
            }

            .print-compact-text {
              font-size: 12px !important;
              line-height: 1.35 !important;
            }

            .print-title {
              font-size: 26px !important;
              line-height: 1.1 !important;
            }

            .print-meta {
              font-size: 11px !important;
              gap: 8px !important;
            }

            .print-products {
              gap: 8px !important;
            }

            .print-product-row {
              gap: 10px !important;
              padding: 8px !important;
              border-radius: 8px !important;
              grid-template-columns: 56px minmax(0, 1fr) auto !important;
            }

            .print-product-image {
              width: 56px !important;
              height: 56px !important;
              border-radius: 6px !important;
            }

            .print-product-meta {
              margin-top: 6px !important;
              gap: 4px !important;
              font-size: 11px !important;
            }

            .print-steps {
              grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
              gap: 6px !important;
            }

            .print-step-card {
              padding: 8px !important;
              border-radius: 8px !important;
            }

            .print-step-card .text-sm {
              font-size: 11px !important;
            }

            .print-step-card .text-xs {
              font-size: 10px !important;
              line-height: 1.25 !important;
            }

            .print-hide-detailed-events {
              display: none !important;
            }

            .print-kv-grid {
              gap: 10px !important;
            }

            .print-kv-grid .text-sm,
            .print-kv-grid .text-xs,
            .print-kv-grid div {
              line-height: 1.3 !important;
            }
          }
        `}),(0,x.jsxs)(`section`,{className:`print-order-sheet overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:rounded-none print:border-0 print:shadow-none`,children:[(0,x.jsx)(`div`,{className:`bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(135deg,#0f172a,#1e293b)] px-6 py-6 text-white sm:px-8 print:bg-none print:px-0 print:text-slate-950`,children:(0,x.jsxs)(`div`,{className:`flex flex-wrap items-start justify-between gap-4`,children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`div`,{className:`text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 print:text-slate-500`,children:`Order Summary`}),(0,x.jsx)(`h1`,{className:`print-title mt-2 text-2xl font-semibold tracking-tight sm:text-3xl`,children:t.orderNumber}),(0,x.jsxs)(`div`,{className:`print-meta mt-3 flex flex-wrap gap-4 text-sm text-slate-200 print:text-slate-600`,children:[(0,x.jsxs)(`span`,{children:[`Invoice: `,t.invoiceNumber]}),(0,x.jsxs)(`span`,{children:[`Placed: `,C(t.orderDate||t.createdAt)]}),(0,x.jsxs)(`span`,{children:[`Estimated delivery: `,t.estimatedDeliveryLabel||w(t.estimatedDelivery)]})]})]}),(0,x.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2 print:hidden`,children:[(0,x.jsx)(m,{value:t.status}),(0,x.jsx)(m,{value:t.paymentStatus}),(0,x.jsx)(`button`,{type:`button`,disabled:M,onClick:W,className:`rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/15 disabled:opacity-50`,children:`Download Invoice`}),(0,x.jsx)(r,{to:`/orders/${e}/invoice`,className:`rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100`,children:`Preview Invoice`}),(0,x.jsx)(`button`,{type:`button`,onClick:()=>document.getElementById(`order-timeline`)?.scrollIntoView({behavior:`smooth`,block:`start`}),className:`rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100`,children:`Track Order`}),(0,x.jsx)(`button`,{type:`button`,disabled:!R||M,onClick:U,className:`rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50`,children:`Return Order`}),(0,x.jsx)(`button`,{type:`button`,disabled:!B||M,onClick:()=>{F(!0),G()},className:`rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50`,children:`Cancel Order`})]})]})}),(0,x.jsxs)(`div`,{className:`print-order-grid grid gap-6 p-6 sm:p-8 print:px-0 print:py-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]`,children:[(0,x.jsxs)(`div`,{className:`grid gap-6`,children:[(0,x.jsxs)(`section`,{className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsxs)(`div`,{className:`flex items-center justify-between gap-3`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Products`}),(0,x.jsxs)(`div`,{className:`text-sm text-slate-500 dark:text-slate-400`,children:[t.items?.length||0,` line items`]})]}),(0,x.jsx)(`div`,{className:`print-products mt-5 grid gap-4`,children:(t.items||[]).map(e=>(0,x.jsxs)(`div`,{className:`print-product-row grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-[88px_minmax(0,1fr)_auto]`,children:[(0,x.jsx)(`div`,{className:`print-product-image h-22 w-22 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800`,children:e.image?(0,x.jsx)(`img`,{src:a(e.image),alt:e.name,className:`h-full w-full object-cover`}):null}),(0,x.jsxs)(`div`,{className:`min-w-0`,children:[(0,x.jsx)(`div`,{className:`print-compact-text text-base font-semibold text-slate-950 dark:text-white`,children:e.name}),(0,x.jsx)(`div`,{className:`print-compact-text mt-1 text-sm text-slate-500 dark:text-slate-400`,children:e.variantName||`Standard variant`}),e.variantSku?(0,x.jsxs)(`div`,{className:`mt-1 text-xs font-medium uppercase tracking-wide text-slate-400`,children:[`SKU: `,e.variantSku]}):null,(0,x.jsxs)(`div`,{className:`print-product-meta mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3`,children:[(0,x.jsxs)(`span`,{children:[`Qty: `,e.quantity]}),(0,x.jsxs)(`span`,{children:[`Unit price: `,s(e.unitPrice,{currency:t.pricing?.currency})]}),(0,x.jsxs)(`span`,{children:[`Total: `,s(e.total,{currency:t.pricing?.currency})]})]})]}),(0,x.jsx)(`div`,{className:`print-compact-text text-right text-sm font-semibold text-slate-950 dark:text-white`,children:s(e.total,{currency:t.pricing?.currency})})]},e.lineId||`${e.productId}-${e.variantId}`))})]}),(0,x.jsxs)(`section`,{id:`order-timeline`,className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Order Timeline`}),(0,x.jsxs)(`div`,{className:`mt-5 grid gap-4`,children:[(0,x.jsx)(`div`,{className:`print-steps grid gap-3 md:grid-cols-5`,children:V.map((e,t)=>(0,x.jsxs)(`div`,{className:`print-step-card relative rounded-2xl border border-slate-200 p-4 dark:border-slate-800`,children:[(0,x.jsx)(`div`,{className:`h-3 w-3 rounded-full ${e.completed?`bg-emerald-500`:`bg-slate-300 dark:bg-slate-700`}`}),t<V.length-1?(0,x.jsx)(`div`,{className:`pointer-events-none absolute left-8 right-[-16px] top-[1.15rem] hidden h-px bg-slate-200 md:block dark:bg-slate-800`}):null,(0,x.jsx)(`div`,{className:`mt-3 text-sm font-semibold text-slate-950 dark:text-white`,children:e.label}),(0,x.jsx)(`div`,{className:`mt-1 text-xs text-slate-500 dark:text-slate-400`,children:e.timestamp?C(e.timestamp):`Pending`})]},e.key))}),(0,x.jsx)(`div`,{className:`print-hide-detailed-events grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70`,children:(H||[]).map(e=>(0,x.jsxs)(`div`,{className:`flex gap-3`,children:[(0,x.jsx)(`div`,{className:`mt-1 h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-white`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`div`,{className:`text-sm font-semibold text-slate-950 dark:text-white`,children:e.label||e.status}),(0,x.jsx)(`div`,{className:`text-xs text-slate-500 dark:text-slate-400`,children:C(e.timestamp)}),e.note?(0,x.jsx)(`div`,{className:`mt-1 text-sm text-slate-600 dark:text-slate-300`,children:e.note}):null]})]},e.key||`${e.status}-${e.timestamp}`))})]})]})]}),(0,x.jsxs)(`div`,{className:`grid gap-4`,children:[(0,x.jsxs)(`section`,{className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Order Overview`}),(0,x.jsxs)(`div`,{className:`print-kv-grid mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1`,children:[(0,x.jsx)(T,{label:`Payment Status`,value:t.paymentStatus}),(0,x.jsx)(T,{label:`Order Status`,value:t.status}),(0,x.jsx)(T,{label:`Invoice Number`,value:t.invoiceNumber}),(0,x.jsx)(T,{label:`Estimated Delivery`,value:t.estimatedDeliveryLabel||w(t.estimatedDelivery)})]})]}),(0,x.jsxs)(`section`,{className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Seller`}),(0,x.jsx)(`div`,{className:`mt-4`,children:(0,x.jsx)(v,{seller:t.sellerId||t.vendors?.[0],compact:!0})}),(0,x.jsxs)(`div`,{className:`mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300`,children:[(0,x.jsx)(`span`,{children:`Store Rating:`}),(0,x.jsx)(_,{seller:t.sellerId||t.vendors?.[0]}),(0,x.jsx)(g,{seller:t.sellerId||t.vendors?.[0],children:`Visit Seller Store`})]})]}),(0,x.jsxs)(`section`,{className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Customer`}),(0,x.jsxs)(`div`,{className:`print-kv-grid mt-4 grid gap-4`,children:[(0,x.jsx)(T,{label:`Name`,value:t.customer?.name}),(0,x.jsx)(T,{label:`Phone`,value:t.customer?.phone}),(0,x.jsx)(T,{label:`Email`,value:t.customer?.email}),(0,x.jsx)(T,{label:`Shipping Address`,value:[t.customer?.shippingAddress?.line1,t.customer?.shippingAddress?.line2,[t.customer?.shippingAddress?.city,t.customer?.shippingAddress?.state,t.customer?.shippingAddress?.postalCode].filter(Boolean).join(`, `),t.customer?.shippingAddress?.country].filter(Boolean).join(`, `)}),(0,x.jsx)(T,{label:`Billing Address`,value:[t.customer?.billingAddress?.line1,t.customer?.billingAddress?.line2,[t.customer?.billingAddress?.city,t.customer?.billingAddress?.state,t.customer?.billingAddress?.postalCode].filter(Boolean).join(`, `),t.customer?.billingAddress?.country].filter(Boolean).join(`, `)})]})]}),t.unifiedPricingBreakdown?(0,x.jsx)(h,{breakdown:t.unifiedPricingBreakdown,title:`Payment Breakdown`,compact:!0}):(0,x.jsxs)(`section`,{className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Payment Breakdown`}),(0,x.jsxs)(`div`,{className:`print-kv-grid mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300`,children:[(0,x.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,x.jsx)(`span`,{children:`Subtotal`}),(0,x.jsx)(`span`,{children:s(t.pricing?.subtotal,{currency:t.pricing?.currency})})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,x.jsx)(`span`,{children:`Delivery fee`}),(0,x.jsx)(`span`,{children:s(t.pricing?.deliveryFee,{currency:t.pricing?.currency})})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,x.jsx)(`span`,{children:`Platform fee`}),(0,x.jsx)(`span`,{children:s(t.pricing?.platformFee,{currency:t.pricing?.currency})})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,x.jsx)(`span`,{children:t.payment?.method===`COD`?`COD charges`:`Razorpay charges`}),(0,x.jsx)(`span`,{children:s(t.pricing?.paymentFee,{currency:t.pricing?.currency})})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,x.jsx)(`span`,{children:`Taxes`}),(0,x.jsx)(`span`,{children:s(t.pricing?.taxes,{currency:t.pricing?.currency})})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,x.jsx)(`span`,{children:`Discounts`}),(0,x.jsxs)(`span`,{children:[`-`,s(t.pricing?.discounts,{currency:t.pricing?.currency})]})]}),(0,x.jsxs)(`div`,{className:`mt-2 flex items-center justify-between border-t border-slate-200 pt-3 font-semibold text-slate-950 dark:border-slate-800 dark:text-white`,children:[(0,x.jsx)(`span`,{children:`Grand total`}),(0,x.jsx)(`span`,{children:s(t.pricing?.grandTotal,{currency:t.pricing?.currency})})]})]})]}),(0,x.jsxs)(`section`,{className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Payment Details`}),(0,x.jsxs)(`div`,{className:`print-kv-grid mt-4 grid gap-4`,children:[(0,x.jsx)(T,{label:`Method`,value:t.payment?.method}),(0,x.jsx)(T,{label:`Transaction ID`,value:t.payment?.transactionId||`COD`}),(0,x.jsx)(T,{label:`Payment Timestamp`,value:t.payment?.timestamp?C(t.payment.timestamp):`Awaiting payment`}),(0,x.jsx)(T,{label:`Refund Status`,value:t.refundSummary?.status||`NONE`}),(0,x.jsx)(T,{label:`Refund Amount`,value:s(t.refundSummary?.amount||0,{currency:t.pricing?.currency})}),(0,x.jsx)(T,{label:`Deduction Amount`,value:s(t.refundSummary?.deductionAmount||0,{currency:t.pricing?.currency})})]}),t.refundSummary?.status===`PENDING`?(0,x.jsx)(`div`,{className:`mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800`,children:`Refund is being processed by finance team.`}):null]}),(0,x.jsxs)(`section`,{className:`print-card rounded-3xl border border-slate-200 p-5 dark:border-slate-800 print:rounded-none print:border print:border-slate-300`,children:[(0,x.jsx)(`h2`,{className:`text-lg font-semibold text-slate-950 dark:text-white`,children:`Shipping Details`}),(0,x.jsxs)(`div`,{className:`print-kv-grid mt-4 grid gap-4`,children:[(0,x.jsx)(T,{label:`Courier`,value:t.shipping?.courier||`Pending assignment`}),(0,x.jsx)(T,{label:`Tracking Number`,value:t.shipping?.trackingNumber||`Not assigned`}),(0,x.jsx)(T,{label:`Shipping Method`,value:t.shipping?.shippingMethod}),(0,x.jsx)(T,{label:`Delivery Estimate`,value:t.estimatedDeliveryLabel||w(t.estimatedDelivery)}),t.shipping?.trackingUrl?(0,x.jsx)(`a`,{href:t.shipping.trackingUrl,target:`_blank`,rel:`noreferrer`,className:`text-sm font-medium text-blue-600 hover:underline print:hidden`,children:`Open courier tracking`}):null]})]})]})]})]}),(0,x.jsxs)(`div`,{className:`flex items-center justify-between gap-3 print:hidden`,children:[(0,x.jsx)(r,{to:`/orders`,className:`text-sm font-medium text-blue-600 hover:underline`,children:`Back to orders`}),(0,x.jsx)(`button`,{type:`button`,onClick:()=>window.print(),className:`rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200`,children:`Print summary`})]}),(0,x.jsx)(y,{open:P,loading:M,preview:I,onClose:()=>{F(!1),L(null)},onPreview:G,onConfirm:K})]}):(0,x.jsx)(`div`,{className:`rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700`,children:A||`Order not found.`})}export{E as OrderDetailsPage};