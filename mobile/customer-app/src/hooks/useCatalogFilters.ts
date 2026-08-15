import { useQuery } from '@tanstack/react-query';
import { getProductFilters } from '../api/catalog';
import { CatalogQueryState } from '../types/catalog';

export const useCatalogFilters = (queryState: CatalogQueryState, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['product_filters', queryState],
    queryFn: () => getProductFilters(queryState),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    enabled, // only fetch when necessary (e.g., filter modal opens)
  });
};
