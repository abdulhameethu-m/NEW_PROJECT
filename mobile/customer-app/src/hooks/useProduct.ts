import { useQuery } from '@tanstack/react-query';
import { getProductBySlug } from '../api/product';

export const useProduct = (slug?: string) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
