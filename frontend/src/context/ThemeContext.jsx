import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { resolveApiAssetUrl } from "../utils/resolveUrl"; // We might not need this if no assets, but keeping for standard

const ThemeContext = createContext({
  loading: true,
  activeTheme: null,
  reload: async () => {},
});

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
}

function applyThemeVariables(theme) {
  if (typeof document === "undefined" || !theme) return;
  const root = document.documentElement;

  const setVar = (key, value) => {
    if (value) root.style.setProperty(`--theme-${key}`, value);
  };

  // Global Colors
  if (theme.colors) {
    setVar("primary", theme.colors.primary);
    setVar("secondary", theme.colors.secondary);
    setVar("accent", theme.colors.accent);
    setVar("background", theme.colors.background);
    setVar("surface", theme.colors.surface);
    setVar("text", theme.colors.text);
    setVar("muted-text", theme.colors.mutedText);
    setVar("border", theme.colors.border);
  }

  // Navbar
  if (theme.navbar) {
    setVar("navbar-background", theme.navbar.background);
    setVar("navbar-text", theme.navbar.text);
    setVar("navbar-hover", theme.navbar.hoverText);
    setVar("navbar-active", theme.navbar.activeText);
    setVar("navbar-icon", theme.navbar.icon);
    setVar("navbar-border", theme.navbar.border);
    setVar("search-background", theme.navbar.searchBackground);
    setVar("search-text", theme.navbar.searchText);
    setVar("cart-icon", theme.navbar.cartIcon);
    setVar("wishlist-icon", theme.navbar.wishlistIcon);
    setVar("account-icon", theme.navbar.accountIcon);
  }

  // Footer
  if (theme.footer) {
    setVar("footer-background", theme.footer.background);
    setVar("footer-text", theme.footer.text);
    setVar("footer-heading", theme.footer.heading);
    setVar("footer-link", theme.footer.link);
    setVar("footer-link-hover", theme.footer.hoverLink);
    setVar("footer-border", theme.footer.border);
    setVar("social-icon", theme.footer.socialIcon);
    setVar("newsletter-background", theme.footer.newsletterBackground);
    setVar("newsletter-button", theme.footer.newsletterButton);
    setVar("newsletter-text", theme.footer.newsletterText);
  }

  // Product Grid
  if (theme.productGrid) {
    setVar("product-card-background", theme.productGrid.cardBackground);
    setVar("product-card-border", theme.productGrid.cardBorder);
    setVar("product-title", theme.productGrid.title);
    setVar("product-price", theme.productGrid.price);
    setVar("product-old-price", theme.productGrid.oldPrice);
    setVar("product-discount-background", theme.productGrid.discountBackground);
    setVar("product-discount-text", theme.productGrid.discountText);
    setVar("product-rating", theme.productGrid.rating);
    setVar("product-button-background", theme.productGrid.buttonBackground);
    setVar("product-button-text", theme.productGrid.buttonText);
    setVar("product-button-hover", theme.productGrid.buttonHover);
    setVar("product-wishlist", theme.productGrid.wishlist);
    setVar("product-wishlist-active", theme.productGrid.wishlistActive);
  }

  // Buttons
  if (theme.buttons) {
    setVar("primary-button", theme.buttons.primaryBackground);
    setVar("primary-button-text", theme.buttons.primaryText);
    setVar("primary-button-hover", theme.buttons.primaryHover);
    setVar("secondary-button", theme.buttons.secondaryBackground);
    setVar("secondary-button-text", theme.buttons.secondaryText);
    setVar("secondary-button-hover", theme.buttons.secondaryHover);
    setVar("button-border", theme.buttons.border);
  }
}

// Apply a flat map of CSS variable overrides (e.g. from admin draft preview).
function applyPreviewVariableOverrides(variables) {
  if (typeof document === "undefined" || !variables) return;
  const root = document.documentElement;
  Object.entries(variables).forEach(([key, value]) => {
    if (value) root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState(null);

  // Keep a ref to any live preview overrides sent via postMessage from the admin panel.
  // Using a ref (not state) avoids unnecessary re-renders.
  const previewOverridesRef = useRef(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await axios.get(`${apiBaseUrl}/api/public/themes/active`);
      const theme = response.data?.data;
      setActiveTheme(theme);
      applyThemeVariables(theme);
      // Re-apply any draft preview overrides so they always win over the saved theme.
      if (previewOverridesRef.current) {
        applyPreviewVariableOverrides(previewOverridesRef.current);
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic theme. Relying on CSS fallbacks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  useEffect(() => {
    const handleUpdate = () => {
      reload().catch(() => {});
    };
    window.addEventListener("theme:updated", handleUpdate);
    return () => window.removeEventListener("theme:updated", handleUpdate);
  }, [reload]);

  // Listen for live preview messages from the Admin Dynamic Theme editor.
  // The admin panel embeds the storefront in an iframe and sends postMessage
  // updates whenever the user changes a colour in the editor.
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept same-origin messages.
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "THEME_PREVIEW_UPDATE") return;

      const variables = event.data.variables || {};
      // Store the overrides so they can be re-applied after any future theme fetch.
      previewOverridesRef.current = variables;
      // Apply immediately.
      applyPreviewVariableOverrides(variables);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const value = useMemo(() => ({ loading, activeTheme, reload }), [activeTheme, loading, reload]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useDynamicTheme() {
  return useContext(ThemeContext);
}
