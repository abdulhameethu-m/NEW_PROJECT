import { apiClient } from './client';
import { Product } from '../types/catalog';

export interface SearchAutocompleteResult {
  items: Product[];
  total: number;
}

export const TRENDING_SEARCH_TAGS = [
  'Silk Sarees',
  'Cotton Kurtis',
  'Handmade Pottery',
  'Traditional Kurtas',
  'Brass Diyas',
  'Handwoven Shawls',
  'Organic Spices',
  'Temple Jewellery',
  'Festive Sets',
  'Linen Shirts',
];

/**
 * Fetch autocomplete product suggestions matching the search query.
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 8
): Promise<SearchAutocompleteResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { items: [], total: 0 };
  }

  const { data } = await apiClient.get('/products/public', {
    params: {
      search: trimmed,
      limit,
    },
  });

  const responseData = (data as any).data || data;
  const items: Product[] = responseData.items || responseData.products || [];
  const total: number = responseData.pagination?.total ?? items.length;

  return { items, total };
}
