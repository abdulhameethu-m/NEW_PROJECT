import { useContext } from "react";
import { CartDrawerContext } from "../context/CartDrawerContext";

/**
 * Hook to access cart drawer state and methods
 * 
 * Usage:
 * const { openDrawer, closeDrawer, isOpen } = useCartDrawer();
 * 
 * openDrawer(product, variant, quantity);
 */
export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  
  if (!context) {
    throw new Error("useCartDrawer must be used within CartDrawerProvider");
  }

  return context;
}
