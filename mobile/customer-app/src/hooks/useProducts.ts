import { useInfiniteQuery } from '@tanstack/react-query';
import { getProducts } from '../api/catalog';
import { CatalogQueryState } from '../types/catalog';

export const useProducts = (queryState: CatalogQueryState) => {
  return useInfiniteQuery({
    queryKey: ['products', queryState],
    queryFn: ({ pageParam = 1 }) => getProducts({ ...queryState, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // API returns pagination: { total, page, limit, pages }
      if (lastPage.pagination && lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
