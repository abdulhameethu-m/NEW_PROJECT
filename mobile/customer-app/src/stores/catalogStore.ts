import { create } from 'zustand';
import { CatalogQueryState } from '../types/catalog';

interface CatalogStore extends CatalogQueryState {
  setSearch: (search: string | undefined) => void;
  setCategory: (categoryId: string | undefined) => void;
  setFilters: (filters: Partial<CatalogQueryState>) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  reset: () => void;
}

const initialState: CatalogQueryState = {
  search: undefined,
  category: undefined,
  categoryId: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  // arbitrary dynamic fields will be merged here
};

export const useCatalogStore = create<CatalogStore>((set) => ({
  ...initialState,
  setSearch: (search) => set({ search }),
  setCategory: (categoryId) => set({ categoryId, category: undefined }), // Resetting name-based category if ID is used
  setFilters: (filters) => set((state) => ({ ...state, ...filters })),
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
  reset: () => set(initialState),
}));
