import { Pagination, Product } from './catalog';

export interface VendorAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface VendorStore {
  _id: string;
  vendorCode?: string;
  storeSlug: string;
  storeUrl?: string;
  vendorName: string;
  companyName?: string;
  logoUrl?: string;
  bannerUrl?: string;
  verified?: boolean;
  rating?: number;
  totalReviews?: number;
  followersCount?: number;
  productsCount?: number;
  yearsOnPlatform?: number;
  storeDescription?: string;
  supportEmail?: string;
  supportPhone?: string;
  address?: string | VendorAddress;
  defaultCourier?: string;
  payoutSchedule?: string;
  shippingSettings?: {
    defaultShippingMode?: string;
    allowedShippingModes?: string[];
  };
  storeSocialVisibility?: Record<string, boolean>;
  storeCategories?: string[];
  storeAbout?: Record<string, any>;
  storeThemeColor?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    ogImage?: string;
    canonicalUrl?: string;
    schemaType?: string;
  };
}

export interface VendorStoreReview {
  _id: string;
  productId?: {
    _id: string;
    name: string;
    images?: Array<{ url: string; isPrimary?: boolean }>;
  };
  customerId?: {
    _id: string;
    name?: string;
    avatarUrl?: string;
  } | null;
  rating: number;
  title?: string;
  review?: string;
  images?: string[];
  videos?: string[];
  verifiedPurchase?: boolean;
  helpfulCount?: number;
  createdAt: string;
  vendorReply?: string;
  vendorReplyDate?: string;
}

export interface StoreCollection {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
  isActive: boolean;
}

export interface StorefrontData {
  vendor: VendorStore;
  isFollowing: boolean;
  collections?: StoreCollection[];
  featuredProducts?: Product[];
  newArrivals?: Product[];
  bestSellers?: Product[];
  topRatedProducts?: Product[];
  dealsOfTheDay?: Product[];
  recentlyAddedProducts?: Product[];
  recommendedProducts?: Product[];
}

export interface StorefrontResponse {
  success: boolean;
  message?: string;
  data: StorefrontData;
}

export interface StoreProductsResponse {
  success: boolean;
  message?: string;
  data: {
    vendor: VendorStore;
    isFollowing: boolean;
    products: Product[];
    pagination: Pagination;
  };
}

export interface StoreReviewsResponse {
  success: boolean;
  message?: string;
  data: {
    vendor: VendorStore;
    isFollowing: boolean;
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<string, number>;
    reviews: VendorStoreReview[];
    pagination: Pagination;
  };
}

export interface FollowedStoreItem {
  followedAt: string;
  notificationEnabled?: boolean;
  vendor: VendorStore;
  latestProducts?: Product[];
  latestOffers?: Product[];
}

export interface FollowedStoresResponse {
  success: boolean;
  message?: string;
  data: {
    stores: FollowedStoreItem[];
    pagination: Pagination;
  };
}

export interface PublicStoresResponse {
  success: boolean;
  message?: string;
  data: VendorStore[];
}

export interface VendorStoreQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  sortBy?: 'newest' | 'best_selling' | 'highest_rated' | 'price_low' | 'price_high' | 'discount';
  minPrice?: number;
  maxPrice?: number;
  availability?: 'in_stock' | 'out_of_stock';
  rating?: number;
}
