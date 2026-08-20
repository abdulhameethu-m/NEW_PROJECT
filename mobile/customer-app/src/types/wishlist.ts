export interface WishlistItem {
  _id: string; // The wishlist entry ID
  product: {
    _id: string;
    name: string;
    category: string;
    price: number;
    discountPrice?: number;
    images?: Array<{ url: string; isPrimary: boolean; _id?: string }>;
    stock: number;
    status: string;
    isActive: boolean;
    slug: string;
  };
  addedAt: string;
}

export interface WishlistMutationResponse {
  saved: boolean;
  productId: string;
  variantId?: string | null;
  selectedAttributes?: Record<string, any>;
}
