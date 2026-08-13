import { create } from "zustand";
import { adminHttp } from "../services/adminHttp";
import { showSuccess, showError } from "../services/notificationService";

export const useThemeStore = create((set, get) => ({
  themes: [],
  activeTheme: null,
  selectedTheme: null,
  draftTheme: null,
  loading: false,
  saving: false,
  activating: false,
  error: null,

  loadThemes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await adminHttp.get("/api/admin/dynamic-themes");
      const themes = response.data?.data || [];
      const active = themes.find(t => t.isActive);
      
      set({ 
        themes, 
        activeTheme: active || null,
        loading: false 
      });
    } catch (err) {
      set({ error: err?.response?.data?.message || "Failed to load themes", loading: false });
    }
  },

  setDraftTheme: (theme) => {
    set({ draftTheme: JSON.parse(JSON.stringify(theme)) });
  },

  selectTheme: (themeId) => {
    const theme = get().themes.find(t => t._id === themeId);
    if (theme) {
      set({ selectedTheme: theme, draftTheme: JSON.parse(JSON.stringify(theme)) });
    }
  },

  updateDraftSection: (section, updates) => {
    set((state) => {
      if (!state.draftTheme) return state;
      const updatedTheme = { ...state.draftTheme };
      if (section === "global") {
        updatedTheme.colors = { ...updatedTheme.colors, ...updates };
      } else {
        updatedTheme[section] = { ...updatedTheme[section], ...updates };
      }
      return { draftTheme: updatedTheme };
    });
  },

  updateGlobalConfig: (updates) => {
    set((state) => {
      if (!state.draftTheme) return state;
      return { draftTheme: { ...state.draftTheme, ...updates } };
    });
  },

  createTheme: async (themeData) => {
    set({ saving: true, error: null });
    try {
      const response = await adminHttp.post("/api/admin/dynamic-themes", themeData);
      const newTheme = response.data?.data;
      set((state) => ({ 
        themes: [newTheme, ...state.themes],
        saving: false
      }));
      showSuccess("Theme created successfully");
      return newTheme;
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Failed to create theme";
      set({ error: errorMsg, saving: false });
      showError(errorMsg);
      throw err;
    }
  },

  saveDraft: async () => {
    const { draftTheme } = get();
    if (!draftTheme || !draftTheme._id) return;
    
    set({ saving: true, error: null });
    try {
      const response = await adminHttp.put(`/api/admin/dynamic-themes/${draftTheme._id}`, draftTheme);
      const updatedTheme = response.data?.data;
      
      set((state) => ({
        themes: state.themes.map(t => t._id === updatedTheme._id ? updatedTheme : t),
        selectedTheme: updatedTheme,
        draftTheme: JSON.parse(JSON.stringify(updatedTheme)),
        saving: false
      }));
      showSuccess("Draft saved successfully");
      return updatedTheme;
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Failed to save theme";
      set({ error: errorMsg, saving: false });
      showError(errorMsg);
      throw err;
    }
  },

  deleteTheme: async (themeId) => {
    try {
      await adminHttp.delete(`/api/admin/dynamic-themes/${themeId}`);
      set((state) => ({
        themes: state.themes.filter(t => t._id !== themeId),
        selectedTheme: state.selectedTheme?._id === themeId ? null : state.selectedTheme,
        draftTheme: state.draftTheme?._id === themeId ? null : state.draftTheme
      }));
      showSuccess("Theme deleted");
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Failed to delete theme";
      showError(errorMsg);
      throw err;
    }
  },

  activateTheme: async (themeId) => {
    set({ activating: true });
    try {
      const response = await adminHttp.patch(`/api/admin/dynamic-themes/${themeId}/activate`);
      const activatedTheme = response.data?.data;
      
      set((state) => ({
        themes: state.themes.map(t => ({
          ...t,
          isActive: t._id === themeId
        })),
        activeTheme: activatedTheme,
        activating: false
      }));
      showSuccess("Theme activated");
      return activatedTheme;
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Failed to activate theme";
      set({ activating: false });
      showError(errorMsg);
      throw err;
    }
  },

  duplicateTheme: async (themeId) => {
    const { themes } = get();
    const sourceTheme = themes.find(t => t._id === themeId);
    if (!sourceTheme) return;

    const newThemeData = {
      ...sourceTheme,
      name: `${sourceTheme.name} (Copy)`,
      slug: `${sourceTheme.slug}-copy-${Date.now()}`,
      isActive: false,
      isDefault: false
    };
    delete newThemeData._id;
    delete newThemeData.createdAt;
    delete newThemeData.updatedAt;

    return get().createTheme(newThemeData);
  },

  resetDraft: () => {
    const { selectedTheme } = get();
    if (selectedTheme) {
      set({ draftTheme: JSON.parse(JSON.stringify(selectedTheme)) });
    }
  }
}));
