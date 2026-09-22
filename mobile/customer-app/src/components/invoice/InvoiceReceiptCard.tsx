import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  FileText,
  Building2,
  User,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShoppingBag,
  CreditCard,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react-native';
import { InvoicePreview } from '../../types/invoice';

interface InvoiceReceiptCardProps {
  invoice: InvoicePreview;
}

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
  return `₹${amount.toLocaleString('en-IN')}`;
};

function formatAddressString(addr?: any): string {
  if (!addr) return 'Address on file';
  if (typeof addr === 'string') return addr;
  return (
    [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country]
      .filter(Boolean)
      .join(', ') || 'Address on file'
  );
}

export const InvoiceReceiptCard: React.FC<InvoiceReceiptCardProps> = ({ invoice }) => {
  const org = invoice.organization || { organizationName: 'UChooseMe' };
  const customer = invoice.customer || {};
  const vendor = invoice.vendors?.[0] || {};
  const pricing = invoice.pricing || { subtotal: 0, grandTotal: 0 };
  const payment = invoice.payment || { method: 'ONLINE', status: 'PAID' };

  const isPaid = payment.status?.toLowerCase() === 'paid' || payment.method !== 'COD';

  const customerAddress = formatAddressString(customer.shippingAddress || customer.address);
  const sellerAddress = formatAddressString(vendor.address || org.registeredAddress || org.billingAddress);

  return (
    <View style={styles.cardContainer}>
      {/* Paper Top Accent */}
      <View style={styles.topAccentBar} />

      {/* Invoice Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandName} allowFontScaling={false}>
            {org.organizationName || 'UChooseMe'}
          </Text>
          {org.gstNumber ? (
            <Text style={styles.brandGst} allowFontScaling={false}>
              GSTIN: <Text style={{ fontWeight: '700' }}>{org.gstNumber}</Text>
            </Text>
          ) : null}
          <Text style={styles.brandWeb} allowFontScaling={false}>
            {org.companyWebsite || 'www.uchooseme.com'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.taxInvoiceTag}>
            <FileText size={12} color="#0284c7" style={{ marginRight: 4 }} />
            <Text style={styles.taxInvoiceTagText} allowFontScaling={false}>
              TAX INVOICE
            </Text>
          </View>
          <Text style={styles.invoiceNumberText} allowFontScaling={false}>
            #{invoice.invoiceNumber || invoice.orderNumber}
          </Text>
          <Text style={styles.invoiceDateText} allowFontScaling={false}>
            Date: {formatDate(invoice.invoiceIssuedAt || invoice.orderDate)}
          </Text>
        </View>
      </View>

      <View style={styles.dashedDivider} />

      {/* Order Reference Row */}
      <View style={styles.refRow}>
        <Text style={styles.refLabel} allowFontScaling={false}>
          ORDER NUMBER
        </Text>
        <Text style={styles.refValue} allowFontScaling={false}>
          #{invoice.orderNumber}
        </Text>
      </View>

      {/* Two Parties: Sold By & Bill To */}
      <View style={styles.partiesContainer}>
        {/* Sold By */}
        <View style={styles.partyBox}>
          <View style={styles.partyHeaderRow}>
            <Building2 size={13} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.partyBoxTitle} allowFontScaling={false}>
              SOLD BY (SELLER)
            </Text>
          </View>
          <Text style={styles.partyName} numberOfLines={1} allowFontScaling={false}>
            {vendor.shopName || vendor.name || org.organizationName}
          </Text>
          {vendor.gstin || vendor.gstNumber ? (
            <Text style={styles.partyGst} allowFontScaling={false}>
              GSTIN: {vendor.gstin || vendor.gstNumber}
            </Text>
          ) : null}
          <Text style={styles.partyAddress} numberOfLines={2} allowFontScaling={false}>
            {sellerAddress}
          </Text>
        </View>

        {/* Bill To */}
        <View style={styles.partyBox}>
          <View style={styles.partyHeaderRow}>
            <User size={13} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.partyBoxTitle} allowFontScaling={false}>
              BILLED & SHIPPED TO
            </Text>
          </View>
          <Text style={styles.partyName} numberOfLines={1} allowFontScaling={false}>
            {customer.name || 'Customer'}
          </Text>
          {customer.phone ? (
            <Text style={styles.partyGst} allowFontScaling={false}>
              Ph: {customer.phone}
            </Text>
          ) : null}
          <Text style={styles.partyAddress} numberOfLines={2} allowFontScaling={false}>
            {customerAddress}
          </Text>
        </View>
      </View>

      <View style={styles.solidDivider} />

      {/* Items Section Header */}
      <Text style={styles.sectionHeading} allowFontScaling={false}>
        ITEMS ORDERED ({invoice.items?.length || 0})
      </Text>

      {/* Items Table */}
      <View style={styles.itemsTable}>
        <View style={styles.itemsTableHeader}>
          <Text style={[styles.thText, { flex: 1.8 }]} allowFontScaling={false}>
            ITEM
          </Text>
          <Text style={[styles.thText, { width: 40, textAlign: 'center' }]} allowFontScaling={false}>
            QTY
          </Text>
          <Text style={[styles.thText, { width: 75, textAlign: 'right' }]} allowFontScaling={false}>
            PRICE
          </Text>
          <Text style={[styles.thText, { width: 85, textAlign: 'right' }]} allowFontScaling={false}>
            TOTAL
          </Text>
        </View>

        {invoice.items?.map((item, idx) => (
          <View key={`${item.name}-${idx}`} style={styles.itemRow}>
            <View style={{ flex: 1.8, paddingRight: 6 }}>
              <Text style={styles.itemNameText} numberOfLines={2} allowFontScaling={false}>
                {item.name}
              </Text>
              {item.variantName || item.variantSku ? (
                <Text style={styles.itemVariantText} allowFontScaling={false}>
                  {item.variantName || item.variantSku}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.itemQtyText, { width: 40, textAlign: 'center' }]} allowFontScaling={false}>
              {item.quantity}
            </Text>
            <Text style={[styles.itemPriceText, { width: 75, textAlign: 'right' }]} allowFontScaling={false}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text style={[styles.itemTotalText, { width: 85, textAlign: 'right' }]} allowFontScaling={false}>
              {formatCurrency(item.total || item.unitPrice * item.quantity)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.solidDivider} />

      {/* Price Summary Breakdown */}
      <View style={styles.breakdownSection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel} allowFontScaling={false}>
            Items Subtotal
          </Text>
          <Text style={styles.summaryValue} allowFontScaling={false}>
            {formatCurrency(pricing.subtotal)}
          </Text>
        </View>

        {pricing.shipping || pricing.shippingFee ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel} allowFontScaling={false}>
              Delivery / Shipping
            </Text>
            <Text style={styles.summaryValue} allowFontScaling={false}>
              {formatCurrency(pricing.shipping || pricing.shippingFee || 0)}
            </Text>
          </View>
        ) : null}

        {pricing.discount || pricing.discountAmount ? (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#059669' }]} allowFontScaling={false}>
              Discount Applied
            </Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]} allowFontScaling={false}>
              -{formatCurrency(pricing.discount || pricing.discountAmount || 0)}
            </Text>
          </View>
        ) : null}

        {pricing.tax || pricing.taxAmount ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel} allowFontScaling={false}>
              Taxes (GST Included)
            </Text>
            <Text style={styles.summaryValue} allowFontScaling={false}>
              {formatCurrency(pricing.tax || pricing.taxAmount || 0)}
            </Text>
          </View>
        ) : null}

        {pricing.charges?.map((c, cIdx) => (
          <View key={`charge-${cIdx}`} style={styles.summaryRow}>
            <Text style={styles.summaryLabel} allowFontScaling={false}>
              {c.displayName || c.name || 'Additional Fee'}
            </Text>
            <Text style={styles.summaryValue} allowFontScaling={false}>
              {formatCurrency(c.amount)}
            </Text>
          </View>
        ))}

        <View style={styles.totalDivider} />

        <View style={styles.grandTotalRow}>
          <View>
            <Text style={styles.grandTotalLabel} allowFontScaling={false}>
              Grand Total
            </Text>
            <Text style={styles.taxInclusiveNote} allowFontScaling={false}>
              (Inclusive of all applicable taxes)
            </Text>
          </View>
          <Text style={styles.grandTotalValue} allowFontScaling={false}>
            {formatCurrency(pricing.grandTotal)}
          </Text>
        </View>
      </View>

      <View style={styles.dashedDivider} />

      {/* Payment & Settlement Badge */}
      <View style={styles.settlementSection}>
        <View style={styles.paymentInfoCol}>
          <Text style={styles.paymentMethodLabel} allowFontScaling={false}>
            PAYMENT MODE
          </Text>
          <Text style={styles.paymentMethodValue} allowFontScaling={false}>
            {payment.method === 'COD' ? 'Cash on Delivery' : 'Online / Prepaid'}
          </Text>
          {payment.transactionId ? (
            <Text style={styles.txnIdText} allowFontScaling={false}>
              Txn Ref: {payment.transactionId}
            </Text>
          ) : null}
        </View>

        <View style={[styles.statusStamp, isPaid ? styles.stampPaid : styles.stampCod]}>
          {isPaid ? (
            <CheckCircle2 size={13} color="#059669" style={{ marginRight: 4 }} />
          ) : (
            <Clock size={13} color="#d97706" style={{ marginRight: 4 }} />
          )}
          <Text
            style={[styles.statusStampText, isPaid ? styles.stampPaidText : styles.stampCodText]}
            allowFontScaling={false}
          >
            {isPaid ? 'PAID' : 'COD DUE'}
          </Text>
        </View>
      </View>

      {/* Footer Legal Note */}
      <View style={styles.footerNoteBox}>
        <Text style={styles.footerNoteText} allowFontScaling={false}>
          This is an official computer-generated Tax Invoice generated under Section 31 of CGST Act. No physical signature is required.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  topAccentBar: {
    height: 6,
    backgroundColor: '#0284c7',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  brandGst: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  brandWeb: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  taxInvoiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  taxInvoiceTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.5,
  },
  invoiceNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  invoiceDateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  solidDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  partiesContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  partyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partyBoxTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  partyGst: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 2,
  },
  partyAddress: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  itemsTable: {
    paddingHorizontal: 16,
  },
  itemsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemVariantText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  itemQtyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  itemPriceText: {
    fontSize: 12,
    color: '#334155',
  },
  itemTotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  breakdownSection: {
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 8,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  taxInclusiveNote: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0284c7',
  },
  settlementSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafaf9',
  },
  paymentInfoCol: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  paymentMethodValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  txnIdText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  statusStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  stampPaid: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  stampCod: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusStampText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stampPaidText: {
    color: '#059669',
  },
  stampCodText: {
    color: '#d97706',
  },
  footerNoteBox: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerNoteText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 14,
  },
});
