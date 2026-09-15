import { ShippingAddress } from './checkout';

export interface OrderItem {
  productId: string | {
    _id: string;
    name: string;
    slug?: string;
    images?: Array<{ url: string; alt?: string; isPrimary?: boolean }>;
    subCategoryId?: string;
  };
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
  variantSku?: string;
  variantTitle?: string;
  variantAttributes?: Record<string, string>;
}

export interface OrderTimelineEvent {
  status: string;
  note?: string;
  timestamp: string;
}

export interface OrderCancellation {
  status: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  requestedAt?: string;
  cancellationFee?: number;
  rejectionReason?: string;
}

export interface OrderRefundSummary {
  status: string;
  method?: string;
  amount: number;
  deductionAmount?: number;
  grossAmount?: number;
  processedAt?: string;
}

export interface PriceBreakdownItem {
  subtotal: number;
  shippingFee: number;
  codFee?: number;
  gatewayFee?: number;
  taxAmount: number;
  discountAmount?: number;
  chargesTotal?: number;
  totalAmount: number;
  currency?: string;
  charges?: Array<{
    key?: string;
    name?: string;
    displayName?: string;
    amount: number;
  }>;
}

export interface Order {
  _id: string;
  orderNumber: string;
  invoiceNumber?: string;
  userId: string;
  sellerId?: {
    _id: string;
    shopName?: string;
    companyName?: string;
    storeSlug?: string;
    logoUrl?: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  platformFee?: number;
  taxAmount: number;
  discountAmount?: number;
  chargesTotal?: number;
  totalAmount: number;
  currency: string;
  status:
    | 'Pending'
    | 'Placed'
    | 'Packed'
    | 'Shipped'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Return Requested'
    | 'Returned'
    | 'Cancelled';
  paymentStatus:
    | 'Pending'
    | 'Partially Paid'
    | 'Paid'
    | 'Failed'
    | 'Refunded'
    | 'Partially Refunded';
  paymentMethod: 'ONLINE' | 'COD';
  shippingAddress: ShippingAddress;
  deliveryPartner?: string;
  shippingMode?: string;
  shippingStatus?: string;
  courierName?: string;
  trackingId?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancellation?: OrderCancellation;
  refundSummary?: OrderRefundSummary;
  priceBreakdown?: PriceBreakdownItem;
  timeline?: OrderTimelineEvent[];
  returnEligible?: boolean;
  returnEligibilityMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTrackingInfo {
  orderId: string;
  status: string;
  deliveryStatus?: string;
  shippingMode?: string;
  shippingStatus?: string;
  pickupStatus?: string;
  courierName?: string;
  shipmentId?: string;
  deliveryPartner?: string;
  trackingId?: string;
  trackingUrl?: string;
  timeline?: OrderTimelineEvent[];
}

export interface OrdersPagination {
  page: number;
  limit: number;
  pages: number;
  total: number;
}

export interface OrdersListResponse {
  orders: Order[];
  pagination: OrdersPagination;
}
