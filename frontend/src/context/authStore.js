import { create } from "zustand";
import { resetDarkModePreference } from "../hooks/useDarkMode";

const STORAGE_KEY = "amazon_like_auth";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function save(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      })
    );
  } catch {
    // ignore
  }
}

const initial = load() || { token: null, refreshToken: null, user: null };

export const useAuthStore = create((set, get) => ({
  token: initial.token,
  refreshToken: initial.refreshToken,
  user: initial.user,
  isAuthenticated: !!initial.token,
  
  setAuth: ({ token, accessToken, refreshToken, user }) => {
    const nextToken = accessToken || token;
    const nextState = {
      token: nextToken || null,
      refreshToken: refreshToken || null,
      user: user || null,
      isAuthenticated: !!nextToken,
    };
    set(nextState);
    save(nextState);
  },
  
  logout: () => {
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    resetDarkModePreference();
  },

  setUser: (user) => {
    const nextState = { ...get(), user: user || null, isAuthenticated: Boolean(get().token) };
    set(nextState);
    save(nextState);
  },
  
  getToken: () => get().token,
}));
