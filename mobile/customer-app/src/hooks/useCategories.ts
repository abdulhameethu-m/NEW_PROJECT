import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../api/catalog';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
