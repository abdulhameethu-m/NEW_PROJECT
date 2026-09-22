import { InvoicePreview } from '../types/invoice';

export function generateInvoiceHtml(invoice: InvoicePreview): string {
  const org = invoice.organization || { organizationName: 'UChooseMe Store' };
  const customer = invoice.customer || {};
  const vendor = invoice.vendors?.[0] || {};
  const pricing = invoice.pricing || { subtotal: 0, grandTotal: 0 };
  const payment = invoice.payment || { method: 'ONLINE', status: 'PAID' };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatCurrency = (amount: number = 0) => {
    return `&#8377;${amount.toLocaleString('en-IN')}`;
  };

  const customerAddress = typeof customer.shippingAddress === 'object'
    ? [
        customer.shippingAddress.line1,
        customer.shippingAddress.line2,
        customer.shippingAddress.city,
        customer.shippingAddress.state,
        customer.shippingAddress.postalCode,
        customer.shippingAddress.country,
      ].filter(Boolean).join(', ')
    : customer.shippingAddress || customer.address || 'Address on file';

  const sellerAddress = typeof vendor.address === 'object'
    ? [
        vendor.address.line1,
        vendor.address.line2,
        vendor.address.city,
        vendor.address.state,
        vendor.address.postalCode,
      ].filter(Boolean).join(', ')
    : vendor.address || org.registeredAddress || org.billingAddress || 'Warehouse Location';

  const itemsHtml = (invoice.items || [])
    .map((item, idx) => `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${item.name}</div>
          ${item.variantName || item.variantSku ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Variant: ${item.variantName || item.variantSku}</div>` : ''}
          ${item.hsnCode ? `<div style="font-size: 10px; color: #94a3b8;">HSN: ${item.hsnCode}</div>` : ''}
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #0f172a; font-weight: 500;">${item.quantity}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #0f172a;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(item.total || item.unitPrice * item.quantity)}</td>
      </tr>
    `)
    .join('');

  const isPaid = payment.status?.toLowerCase() === 'paid' || payment.method !== 'COD';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tax Invoice - ${invoice.invoiceNumber || invoice.orderNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          margin: 0;
          padding: 0;
          color: #0f172a;
          background: #ffffff;
          font-size: 13px;
          line-height: 1.5;
        }
        .invoice-box {
          max-width: 800px;
          margin: auto;
          padding: 24px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 16px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 800;
          color: #0284c7;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .invoice-badge {
          text-align: right;
        }
        .invoice-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
        }
        .invoice-num {
          font-size: 13px;
          color: #0284c7;
          font-weight: 700;
          margin-top: 4px;
        }
        .meta-grid {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .meta-box {
          width: 50%;
          padding: 12px 14px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          vertical-align: top;
        }
        .meta-box-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 6px;
        }
        .meta-name {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .meta-text {
          font-size: 12px;
          color: #475569;
          line-height: 1.4;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th {
          background-color: #f1f5f9;
          color: #334155;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 8px;
          border-bottom: 2px solid #cbd5e1;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .summary-left {
          width: 55%;
          vertical-align: top;
          padding-right: 20px;
        }
        .summary-right {
          width: 45%;
          vertical-align: top;
        }
        .price-breakdown {
          width: 100%;
          border-collapse: collapse;
        }
        .price-breakdown td {
          padding: 6px 0;
          font-size: 13px;
        }
        .price-breakdown .label {
          color: #64748b;
        }
        .price-breakdown .value {
          text-align: right;
          font-weight: 600;
          color: #1e293b;
        }
        .total-row td {
          border-top: 2px solid #0f172a;
          border-bottom: 2px solid #0f172a;
          padding: 10px 0;
          font-size: 15px;
          font-weight: 800;
        }
        .total-row .total-value {
          color: #0284c7;
          text-align: right;
        }
        .stamp-box {
          border: 2px dashed ${isPaid ? '#059669' : '#d97706'};
          color: ${isPaid ? '#059669' : '#d97706'};
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 8px 14px;
          display: inline-block;
          border-radius: 6px;
          transform: rotate(-3deg);
          margin-top: 12px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <!-- Top Header -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: middle;">
              <h1 class="brand-title">${org.organizationName || 'UChooseMe'}</h1>
              <div class="brand-subtitle">
                ${org.gstNumber ? `GSTIN: <strong>${org.gstNumber}</strong>` : ''} 
                ${org.cinNumber ? ` | CIN: ${org.cinNumber}` : ''}
              </div>
              <div class="brand-subtitle">
                ${org.companyWebsite || 'www.uchooseme.com'} | ${org.supportEmail || 'support@uchooseme.com'}
              </div>
            </td>
            <td class="invoice-badge" style="vertical-align: middle;">
              <div class="invoice-title">Tax Invoice</div>
              <div class="invoice-num">#${invoice.invoiceNumber || invoice.orderNumber}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                Date: <strong>${formatDate(invoice.invoiceIssuedAt || invoice.orderDate)}</strong>
              </div>
              <div style="font-size: 12px; color: #64748b;">
                Order Ref: <strong>#${invoice.orderNumber}</strong>
              </div>
            </td>
          </tr>
        </table>

        <!-- Two Column Parties Grid -->
        <table class="meta-grid">
          <tr>
            <td class="meta-box" style="margin-right: 8px;">
              <div class="meta-box-title">Sold By (Seller)</div>
              <div class="meta-name">${vendor.shopName || vendor.name || org.organizationName}</div>
              ${vendor.gstin || vendor.gstNumber ? `<div class="meta-text"><strong>GSTIN:</strong> ${vendor.gstin || vendor.gstNumber}</div>` : ''}
              <div class="meta-text">${sellerAddress}</div>
              ${vendor.phone ? `<div class="meta-text">Phone: ${vendor.phone}</div>` : ''}
            </td>
            <td style="width: 16px;"></td>
            <td class="meta-box">
              <div class="meta-box-title">Billed & Shipped To (Buyer)</div>
              <div class="meta-name">${customer.name || 'Customer'}</div>
              <div class="meta-text">${customerAddress}</div>
              ${customer.phone ? `<div class="meta-text">Phone: ${customer.phone}</div>` : ''}
              ${customer.email ? `<div class="meta-text">Email: ${customer.email}</div>` : ''}
            </td>
          </tr>
        </table>

        <!-- Ordered Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="text-align: left;">Item Description</th>
              <th style="width: 70px; text-align: center;">Qty</th>
              <th style="width: 100px; text-align: right;">Unit Price</th>
              <th style="width: 110px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Pricing Summary & Settlement Status -->
        <table class="summary-table">
          <tr>
            <td class="summary-left">
              <div class="stamp-box">
                ${isPaid ? 'Payment Confirmed' : 'Cash On Delivery'}
              </div>
              <div style="margin-top: 14px; font-size: 12px; color: #475569;">
                <div><strong>Payment Mode:</strong> ${payment.method === 'COD' ? 'Cash on Delivery' : 'Online / Prepaid'}</div>
                ${payment.transactionId ? `<div><strong>Txn Ref:</strong> ${payment.transactionId}</div>` : ''}
                ${invoice.shipping?.courier ? `<div><strong>Shipped Via:</strong> ${invoice.shipping.courier} ${invoice.shipping.trackingNumber ? `(AWB: ${invoice.shipping.trackingNumber})` : ''}</div>` : ''}
              </div>
              ${org.footerNotes ? `<div style="margin-top: 12px; font-size: 11px; color: #94a3b8; font-style: italic;">${org.footerNotes}</div>` : ''}
            </td>
            <td class="summary-right">
              <table class="price-breakdown">
                <tr>
                  <td class="label">Items Subtotal</td>
                  <td class="value">${formatCurrency(pricing.subtotal)}</td>
                </tr>
                ${pricing.shipping || pricing.shippingFee ? `
                  <tr>
                    <td class="label">Shipping / Delivery Fee</td>
                    <td class="value">${formatCurrency(pricing.shipping || pricing.shippingFee || 0)}</td>
                  </tr>
                ` : ''}
                ${pricing.discount || pricing.discountAmount ? `
                  <tr>
                    <td class="label" style="color: #059669;">Discounts Applied</td>
                    <td class="value" style="color: #059669;">-${formatCurrency(pricing.discount || pricing.discountAmount || 0)}</td>
                  </tr>
                ` : ''}
                ${pricing.tax || pricing.taxAmount ? `
                  <tr>
                    <td class="label">Taxes & GST</td>
                    <td class="value">${formatCurrency(pricing.tax || pricing.taxAmount || 0)}</td>
                  </tr>
                ` : ''}
                ${pricing.charges?.map((c) => `
                  <tr>
                    <td class="label">${c.displayName || c.name || 'Additional Fee'}</td>
                    <td class="value">${formatCurrency(c.amount)}</td>
                  </tr>
                `).join('') || ''}
                <tr class="total-row">
                  <td>Grand Total</td>
                  <td class="total-value">${formatCurrency(pricing.grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div class="footer">
          This is a computer-generated tax invoice and requires no physical signature. Questions? Contact ${org.supportEmail || 'support@uchooseme.com'}.
        </div>
      </div>
    </body>
    </html>
  `;
}
