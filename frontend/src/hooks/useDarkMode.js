import { useEffect, useState } from "react";
import { useAuthStore } from "../context/authStore";
import { updateThemePreference as persistThemePreference } from "../services/authService";

const DARK_MODE_KEY = "darkMode";

export function resetDarkModePreference() {
  try {
    localStorage.setItem(DARK_MODE_KEY, "false");
  } catch {
    // ignore
  }
  document.documentElement.classList.remove("dark");
}

function getStoredTheme() {
  try {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) {
      return saved === "true" ? "dark" : "light";
    }
  } catch {
    // ignore
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useDarkMode() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const accountTheme = useAuthStore.getState().user?.preferences?.theme;
    return (accountTheme || getStoredTheme()) === "dark";
  });

  useEffect(() => {
    if (user?.preferences?.theme) {
      setIsDarkMode(user.preferences.theme === "dark");
      return;
    }

    setIsDarkMode(getStoredTheme() === "dark");
  }, [user?._id, user?.preferences?.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);

    if (!user?._id) {
      try {
        localStorage.setItem(DARK_MODE_KEY, isDarkMode ? "true" : "false");
      } catch {
        // ignore
      }
    }
  }, [isDarkMode, user?._id]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === DARK_MODE_KEY && !user?._id) {
        setIsDarkMode(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?._id]);

  const setDarkMode = (value) => {
    const nextValue = typeof value === "function" ? value(isDarkMode) : Boolean(value);
    const nextTheme = nextValue ? "dark" : "light";

    setIsDarkMode(nextValue);

    if (!user?._id) {
      try {
        localStorage.setItem(DARK_MODE_KEY, nextValue ? "true" : "false");
      } catch {
        // ignore
      }
      return;
    }

    setUser({
      ...user,
      preferences: {
        ...(user.preferences || {}),
        theme: nextTheme,
      },
    });

    persistThemePreference(nextTheme).catch(() => {
      setIsDarkMode((user.preferences?.theme || "light") === "dark");
    });
  };

  return [isDarkMode, setDarkMode];
}
