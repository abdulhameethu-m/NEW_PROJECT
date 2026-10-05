import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSearchSuggestions, SearchAutocompleteResult } from '../api/search';

export function useSearchAutocomplete(rawQuery: string, debounceMs: number = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [rawQuery, debounceMs]);

  const trimmedQuery = debouncedQuery.trim();
  const isEnabled = trimmedQuery.length >= 2;

  const queryResult = useQuery<SearchAutocompleteResult>({
    queryKey: ['search-autocomplete', trimmedQuery],
    queryFn: () => getSearchSuggestions(trimmedQuery, 8),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });

  return {
    ...queryResult,
    debouncedQuery: trimmedQuery,
    suggestions: isEnabled ? queryResult.data?.items || [] : [],
    totalCount: isEnabled ? queryResult.data?.total || 0 : 0,
    isSearching: isEnabled && (queryResult.isLoading || queryResult.isFetching),
  };
}
