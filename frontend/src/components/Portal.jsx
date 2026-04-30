import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Portal component to render content outside the DOM hierarchy
 * Useful for dropdowns, modals, tooltips that need to be above everything
 */
export function Portal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
