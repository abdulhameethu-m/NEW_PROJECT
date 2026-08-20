import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Product } from '../types/catalog';

export const getRelatedProducts = async (productId: string, limit: number = 4, categoryId: string = ""): Promise<Product[]> => {
  const response = await apiClient.get('/products/public', {
    params: {
      page: 1,
      // Fetch 1 additional item because we will filter out the requested product itself
      limit: Math.max(Number(limit || 4) + 1, 4),
      ...(categoryId ? { categoryId } : {}),
    },
  });

  const products: Product[] = Array.isArray(response.data?.data?.products) 
    ? response.data.data.products 
    : [];

  return products
    .filter((product) => String(product?._id) !== String(productId))
    .slice(0, limit);
};

export function useRelatedProducts(productId: string, limit: number = 4) {
  return useQuery<Product[], Error>({
    queryKey: ['relatedProducts', productId, limit],
    queryFn: () => getRelatedProducts(productId, limit),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // Classify recommended hits as stale after 5 minutes
  });
}
