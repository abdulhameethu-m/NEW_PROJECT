import { create } from "zustand";
import { normalizeCartPayload } from "../utils/cartState";

const emptyCart = normalizeCartPayload({ items: [], totalAmount: 0 });

const useAuthCartStore = create((set) => ({
  cart: emptyCart,
  setCart: (cart) => set({ cart: normalizeCartPayload(cart) }),
  clearCart: () => set({ cart: emptyCart }),
}));

export default useAuthCartStore;
