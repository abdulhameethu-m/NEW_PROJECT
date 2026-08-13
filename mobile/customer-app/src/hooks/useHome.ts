import { useQuery } from '@tanstack/react-query';
import { getHomepageLayout } from '../api/catalog';

export const useHome = (device: 'desktop' | 'tablet' | 'mobile' = 'mobile') => {
  return useQuery({
    queryKey: ['homepage-layout', device],
    queryFn: () => getHomepageLayout(device),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};
