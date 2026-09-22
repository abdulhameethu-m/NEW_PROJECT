export interface InvoiceItem {
  name: string;
  variantName?: string;
  variantSku?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
  taxAmount?: number;
  hsnCode?: string;
}

export interface InvoicePartyAddress {
  fullName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface InvoiceParty {
  id?: string;
  name?: string;
  shopName?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  gstin?: string;
  panNumber?: string;
  address?: string | InvoicePartyAddress;
  shippingAddress?: InvoicePartyAddress;
  billingAddress?: InvoicePartyAddress;
}

export interface InvoiceCharge {
  name?: string;
  displayName?: string;
  amount: number;
  key?: string;
}

export interface InvoicePricing {
  subtotal: number;
  discount?: number;
  discountAmount?: number;
  shipping?: number;
  shippingFee?: number;
  tax?: number;
  taxAmount?: number;
  chargesTotal?: number;
  grandTotal: number;
  currency?: string;
  charges?: InvoiceCharge[];
}

export interface InvoicePayment {
  method: string;
  status: string;
  transactionId?: string;
  paidAt?: string;
}

export interface InvoiceBankDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  accountHolderName?: string;
}

export interface InvoiceOrganization {
  organizationName: string;
  gstNumber?: string;
  cinNumber?: string;
  panNumber?: string;
  supportEmail?: string;
  supportPhone?: string;
  billingAddress?: string;
  registeredAddress?: string;
  taxLabel?: string;
  invoicePrefix?: string;
  footerNotes?: string;
  companyWebsite?: string;
  logoUrl?: string;
  signatureUrl?: string;
  bankDetails?: InvoiceBankDetails;
}

export interface InvoiceMetadata {
  id?: string;
  version?: number;
  customNotes?: string;
  footerText?: string;
  billingLabel?: string;
  sellerLabel?: string;
  gstLabel?: string;
  generatedAt?: string;
  generatedBy?: string;
}

export interface InvoiceShipping {
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  logisticsProvider?: string;
  shipmentId?: string;
  estimatedDelivery?: string;
}

export interface InvoiceSupport {
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  taxLabel?: string;
}

export interface InvoicePreview {
  _id?: string;
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceIssuedAt: string;
  orderDate: string;
  status?: string;
  paymentStatus?: string;
  customer: InvoiceParty;
  vendors?: InvoiceParty[];
  items: InvoiceItem[];
  pricing: InvoicePricing;
  payment: InvoicePayment;
  organization: InvoiceOrganization;
  shipping?: InvoiceShipping;
  support?: InvoiceSupport;
  metadata?: InvoiceMetadata;
}

export interface InvoicePreviewResponse {
  success: boolean;
  message?: string;
  data: InvoicePreview;
}
