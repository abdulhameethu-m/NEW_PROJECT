export interface CartItemProduct {
  _id: string;
  name: string;
  slug: string;
  images?: Array<{ url: string; isPrimary: boolean; _id?: string }>;
  price: number;
  discountPrice?: number;
  stock: number;
  isActive: boolean;
  status: string;
  sellerId?: string | Record<string, any>;
}

export interface CartItemSeller {
  _id: string;
  companyName: string;
  shopName: string;
  storeSlug: string;
  logoUrl?: string;
  status: string;
  isStoreVisible: boolean;
}

export interface CartItem {
  _id?: string;
  productId: CartItemProduct;
  sellerId: CartItemSeller | string;
  quantity: number;
  price: number; // Snapshot price at time of cart addition
  image: string;
  variantId: string;
  variantSku: string;
  variantTitle: string;
  variantAttributes: Record<string, string>;
  attribution?: any;
}

export interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartMutationResponse {
  action?: 'MAXIMUM_STOCK_REACHED' | 'OUT_OF_STOCK' | 'INVALID_VARIANT' | 'SUCCESS' | string;
  message?: string;
  allocatedVariant?: { id: string; name: string } | null;
  originalVariant?: { id: string } | null;
  cart: Cart;
  addedItem?: CartItem | null;
}
