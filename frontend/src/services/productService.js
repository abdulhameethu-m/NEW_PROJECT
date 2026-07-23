import { api } from "./api";
import { uploadMarketplaceProductImages } from "./productMediaService";

/**
 * Get all public products (for storefront)
 */
export async function getPublicProducts(params = {}) {
  const response = await api.get("/api/products/public", { params });
  return response.data;
}

export async function getPublicProductFilters(params = {}) {
  const response = await api.get("/api/products/filters", { params });
  return response.data;
}

/**
 * Get single product by ID
 */
export async function getProductById(id) {
  const response = await api.get(`/api/products/${id}`);
  return response.data;
}

export async function getRelatedProducts(productId, limit = 4, categoryId = "") {
  const response = await api.get("/api/products/public", {
    params: {
      page: 1,
      limit: Math.max(Number(limit || 4) + 1, 4),
      ...(categoryId ? { categoryId } : {}),
    },
  });

  const products = Array.isArray(response?.data?.data?.products) ? response.data.data.products : [];
  return {
    data: products.filter((product) => String(product?._id) !== String(productId)).slice(0, limit),
  };
}

export async function generateProductNumber(params = {}) {
  const response = await api.get("/api/products/generate-number", { params });
  return response.data;
}

/**
 * Create new product (seller or admin)
 */
export async function createProduct(productData) {
  const response = await api.post("/api/products", productData);
  return response.data;
}

/**
 * Update product
 */
export async function updateProduct(id, updateData) {
  const response = await api.patch(`/api/products/${id}`, updateData);
  return response.data;
}

export async function uploadProductImages(files, metadata = {}, onUploadProgress) {
  return uploadMarketplaceProductImages(files, metadata, onUploadProgress);
}
