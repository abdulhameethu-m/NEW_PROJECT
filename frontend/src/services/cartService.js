import { api } from "./api";

function notifyCartChanged(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cart:changed", { detail }));
}

export async function getCart() {
  const { data } = await api.get("/api/cart");
  return data;
}

export async function addToCart(productId, quantity = 1, variantId = "") {
  const { data } = await api.post("/api/cart/add", { productId, quantity, variantId });
  notifyCartChanged(data?.data || data);
  return data;
}

export async function updateCartItem(productId, quantity, variantId = "") {
  const { data } = await api.patch("/api/cart/update", { productId, quantity, variantId });
  notifyCartChanged(data?.data || data);
  return data;
}

export async function removeCartItem(productId, variantId = "") {
  const { data } = await api.delete("/api/cart/remove", { data: { productId, variantId } });
  notifyCartChanged(data?.data || data);
  return data;
}

export async function clearCart() {
  const { data } = await api.delete("/api/cart/clear");
  notifyCartChanged(data?.data || data);
  return data;
}

