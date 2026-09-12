export interface UserAddress {
  _id?: string;
  name: string;
  phone: string;
  addressLine: string;
  district?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  district?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ShippingOption {
  provider: string;
  quoteId: string;
  fee?: number;
  estimatedDays?: string;
  title?: string;
}

export interface PreparedCheckoutCharge {
  id?: string;
  key: string;
  name?: string;
  displayName?: string;
  amount: number;
  category?: string;
  type?: string;
}

export interface PreparedCheckoutSummary {
  currency: string;
  subtotal: number;
  charges: PreparedCheckoutCharge[];
  chargesTotal: number;
  total: number;
  totalAmount: number;
  itemCount: number;
  shippingFee: number;
  taxAmount: number;
  shipping?: {
    zone?: string;
    options?: ShippingOption[];
  };
  paymentMethod?: 'ONLINE' | 'COD';
  codAvailability?: {
    codAvailable: boolean;
    reasons?: string[];
  };
  codAdvance?: {
    enabled: boolean;
    advanceAmount: number;
    remainingCODAmount: number;
  };
}

export interface CreateOrderPayload {
  shippingAddress: ShippingAddress;
  paymentMethod: 'ONLINE' | 'COD';
  trackingToken?: string | null;
  shippingQuoteId?: string;
  selectedProvider?: string;
}

export interface CreatedOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantTitle?: string;
}

export interface CreatedOrder {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  shippingAddress: ShippingAddress;
  items: CreatedOrderItem[];
  createdAt?: string;
}

export interface CreateOrderResult {
  orders: CreatedOrder[];
  orderGroupId: string;
  payment?: any;
}
