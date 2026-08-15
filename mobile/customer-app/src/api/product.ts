import { apiClient } from './client';
import { Product } from '../types/catalog';

export const getProductBySlug = async (slug: string): Promise<Product> => {
  const { data } = await apiClient.get(`/products/${slug}`);
  // The backend product controller typically returns `{ success: true, data: Product, message: ... }`
  return data?.data || data;
};
