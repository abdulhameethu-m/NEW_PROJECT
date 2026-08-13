import { apiClient } from './client';
import { Category, ProductListResponse, CatalogQueryState } from '../types/catalog';

export const getProducts = async (
  params: CatalogQueryState & { page?: number; limit?: number; cursor?: string }
): Promise<ProductListResponse> => {
  const { data } = await apiClient.get<ProductListResponse>('/products/public', {
    params,
  });
  // If the backend returns data inside a `data` field, extract it
  const responseData = (data as any).data || data;
  
  // The backend returns { products: [...] } but our frontend types expect { items: [...] }
  return {
    ...responseData,
    items: responseData.items || responseData.products || [],
  };
};

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await apiClient.get('/categories');
  return data?.data || data;
};

export const getHomepageLayout = async (device: 'desktop' | 'tablet' | 'mobile' = 'mobile') => {
  const { data } = await apiClient.get('/homepage-builder/public', {
    params: { device },
  });
  return data?.data || data;
};
