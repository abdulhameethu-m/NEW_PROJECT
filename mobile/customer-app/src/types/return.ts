export type ReturnReasonCode =
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'WRONG_VARIANT'
  | 'NOT_AS_DESCRIBED'
  | 'MISSING_ITEM'
  | 'QUALITY_ISSUE'
  | 'SIZE_ISSUE'
  | 'OTHER';

export type ReturnStatus =
  | 'REQUESTED'
  | 'ADMIN_REVIEW'
  | 'ADMIN_APPROVED'
  | 'ADMIN_REJECTED'
  | 'RETURN_PICKUP_PENDING'
  | 'RETURN_IN_TRANSIT'
  | 'VENDOR_RECEIVED'
  | 'VENDOR_INSPECTION'
  | 'ACCEPTED'
  | 'VENDOR_DISPUTED'
  | 'ADMIN_DISPUTE_REVIEW'
  | 'REFUND_PENDING'
  | 'REFUND_INITIATED'
  | 'REFUNDED'
  | 'RETURN_REJECTED';

export interface ReturnTimelineEvent {
  action: string;
  previousStatus?: string;
  newStatus?: string;
  actorId?: string;
  actorRole?: string;
  note?: string;
  reason?: string;
  timestamp: string;
}

export interface ReturnPickupDetails {
  trackingId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  courierName?: string;
  scheduledDate?: string;
  pickedUpAt?: string;
}

export interface ReturnRequest {
  _id: string;
  returnNumber?: string;
  orderId: string | {
    _id: string;
    orderNumber?: string;
    totalAmount?: number;
    paymentMethod?: string;
  };
  productId: string | {
    _id: string;
    name?: string;
    title?: string;
    slug?: string;
    images?: Array<{ url: string } | string>;
    subCategoryId?: string;
  };
  variantId?: string;
  variantSku?: string;
  variantTitle?: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  vendorId?: string | {
    _id: string;
    shopName?: string;
    companyName?: string;
  };
  customerId?: string;
  reasonCode: ReturnReasonCode;
  customerDescription?: string;
  customerEvidence?: string[];
  status: ReturnStatus;
  refundAmount?: number;
  refundId?: string;
  trackingId?: string;
  trackingUrl?: string;
  courierName?: string;
  timeline?: ReturnTimelineEvent[];
  requestedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReturnPayload {
  orderId: string;
  productId: string;
  variantSku?: string;
  quantity: number;
  reasonCode: ReturnReasonCode;
  customerDescription: string;
  subCategoryId?: string;
}

export interface ReturnsListResponse {
  returns: ReturnRequest[];
  total: number;
  page: number;
  limit: number;
}
