export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  order?: number;
  banners?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  _id: string;
  name: string;
  slug: string;
  category: string;
}

export interface Seller {
  _id: string;
  isStoreVisible: boolean;
  status: string;
  storeThemeColor?: string;
  companyName?: string;
  shopName?: string;
  bannerUrl?: string;
  logoUrl?: string;
  storeSlug?: string;
}

export interface ProductRatings {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown?: any;
}

export interface ProductAnalytics {
  views: number;
  salesCount: number;
  totalRevenue: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category: string; // usually name
  categoryId: string;
  subCategory?: string; // usually name
  subCategoryId?: string;
  tags?: string;
  price: number;
  discountPrice?: number;
  currency: string;
  stock: number;
  SKU?: string;
  productNumber?: string;
  lowStockThreshold?: number;
  images: string[];
  thumbnail?: string;
  sellerId: Seller;
  status: string;
  isActive: boolean;
  isFeatured?: boolean;
  featured?: boolean;
  ratings?: ProductRatings;
  analytics?: ProductAnalytics;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductFacet {
  key: string;
  type: string;
  name: string;
  group: string;
  order: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{ value: string; label: string; count: number }>;
}

export interface ProductListResponse {
  items: Product[];
  facets: ProductFacet[];
  pagination: Pagination;
}

export interface CatalogQueryState {
  search?: string;
  category?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string; // e.g. "price", "createdAt"
  sortOrder?: "asc" | "desc";
}
