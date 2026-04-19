import { useEffect, useState } from "react";

const DARK_MODE_KEY = "darkMode";

export function resetDarkModePreference() {
  try {
    localStorage.setItem(DARK_MODE_KEY, "false");
  } catch {
    // ignore
  }
  document.documentElement.classList.remove("dark");
}

/**
 * useDarkMode Hook
 * 
 * Manages dark mode state across the entire app
 * - Loads preference from localStorage on init
 * - Applies/removes dark class from document
 * - Syncs across browser tabs
 * 
 * @returns {[boolean, (value: boolean) => void]} - [isDarkMode, setDarkMode]
 */
export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === "true";
    
    // Check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Sync dark mode with DOM and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(DARK_MODE_KEY, isDarkMode ? "true" : "false");
  }, [isDarkMode]);

  // Listen for storage changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === DARK_MODE_KEY) {
        setIsDarkMode(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return [isDarkMode, setIsDarkMode];
}
