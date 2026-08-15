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
  ratingBreakdown?: {
    five: number;
    four: number;
    three: number;
    two: number;
    one: number;
  };
}

export interface ProductAnalytics {
  views: number;
  salesCount: number;
  totalRevenue: number;
}

export type ProductAttributeValue = string | number | boolean | string[] | number[];
export type ProductAttributes = Record<string, ProductAttributeValue>;

export interface ProductImage {
  url: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface VariantOption {
  key: string;
  name: string;
  value: string;
}

export interface ProductVariant {
  variantId: string;
  title: string;
  attributes: Record<string, string>;
  options: VariantOption[];
  price: number;
  discountPrice?: number;
  weight?: {
    value: number;
    unit: string;
  };
  stock: number;
  sku: string;
  images: ProductImage[];
  isDefault: boolean;
  isActive: boolean;
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
  images: ProductImage[];
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

  // Variant & Dynamic extensions
  attributes?: ProductAttributes;
  variantConfig?: string[];
  variants?: ProductVariant[];
  weight?: {
    value: number;
    unit: string;
  };
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
  [key: string]: any; // Allow arbitrary dynamic filters from backend facets
}
