import { useQuery } from '@tanstack/react-query';
import { getSubCategories } from '../api/catalog';

export const useSubCategories = (categoryId?: string) => {
  return useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: () => getSubCategories(categoryId),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
