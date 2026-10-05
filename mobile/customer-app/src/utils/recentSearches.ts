import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = '@uchangeme_recent_searches';
const MAX_RECENT_SEARCHES = 10;

/**
 * Retrieve list of recent search queries from local storage.
 */
export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    return [];
  } catch (error) {
    console.warn('[RecentSearches] Failed to read recent searches from storage:', error);
    return [];
  }
}

/**
 * Save a new search query to local storage.
 * Places the query at the beginning, removes duplicates (case-insensitive),
 * and caps at MAX_RECENT_SEARCHES items.
 */
export async function saveRecentSearch(term: string): Promise<string[]> {
  const cleanTerm = term.trim();
  if (!cleanTerm) {
    return await getRecentSearches();
  }

  try {
    const existing = await getRecentSearches();
    // Filter out any existing matching search query (case-insensitive)
    const filtered = existing.filter((item) => item.toLowerCase() !== cleanTerm.toLowerCase());
    const updated = [cleanTerm, ...filtered].slice(0, MAX_RECENT_SEARCHES);

    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[RecentSearches] Failed to save recent search to storage:', error);
    return [];
  }
}

/**
 * Remove a specific search term from recent searches.
 */
export async function removeRecentSearch(term: string): Promise<string[]> {
  try {
    const existing = await getRecentSearches();
    const updated = existing.filter((item) => item.toLowerCase() !== term.trim().toLowerCase());
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[RecentSearches] Failed to remove recent search:', error);
    return [];
  }
}

/**
 * Clear all recent searches from local storage.
 */
export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.warn('[RecentSearches] Failed to clear recent searches:', error);
  }
}
