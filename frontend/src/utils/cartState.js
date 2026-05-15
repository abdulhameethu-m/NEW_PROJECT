export function getCartItemKey(productId, variantId = "") {
  return `${String(productId || "")}::${String(variantId || "")}`;
}

export function extractProductId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return String(value._id || value.id || value.productId || "");
  }
  return "";
}

export function extractVariantId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return String(value.variantId || value.id || "");
  }
  return "";
}

export function getCartSubtotal(items = []) {
  return items.reduce((sum, item) => {
    const price = Number(item?.discountedPrice ?? item?.price ?? 0);
    const quantity = Number(item?.quantity || 0);
    return sum + price * quantity;
  }, 0);
}

export function getCartTotalQuantity(items = []) {
  return items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
}

export function normalizeCartPayload(payload) {
  const candidate =
    payload?.data && Array.isArray(payload.data.items)
      ? payload.data
      : payload?.userCart && Array.isArray(payload.userCart.items)
        ? payload.userCart
        : payload;

  const items = Array.isArray(candidate?.items) ? candidate.items : [];
  const totalAmount = Number(candidate?.totalAmount ?? getCartSubtotal(items));
  const totalQuantity = Number(candidate?.totalQuantity ?? getCartTotalQuantity(items));
  const itemCount = Number(candidate?.itemCount ?? items.length);

  return {
    ...(candidate && typeof candidate === "object" ? candidate : {}),
    items,
    totalAmount,
    totalQuantity,
    itemCount,
  };
}

export function emitCartChanged(cartLike) {
  if (typeof window === "undefined") return;
  const detail = normalizeCartPayload(cartLike);
  window.dispatchEvent(new CustomEvent("cart:changed", { detail }));
}
