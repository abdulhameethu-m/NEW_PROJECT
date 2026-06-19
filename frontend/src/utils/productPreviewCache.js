const PRODUCT_PREVIEW_PREFIX = "productPreview:";
const PRODUCT_PREVIEW_TTL_MS = 10 * 60 * 1000;

function productIdOf(product = {}) {
  return product?._id || product?.id || "";
}

function hasUsableStockData(product = {}) {
  if (Number.isFinite(Number(product.stock))) return true;
  if (!Array.isArray(product.variants) || !product.variants.length) return false;
  return product.variants.some((variant) => Number.isFinite(Number(variant?.stock)));
}

export function saveProductPreview(product = {}) {
  if (typeof window === "undefined") return;
  const productId = productIdOf(product);
  if (!productId) return;
  if (!hasUsableStockData(product)) return;

  try {
    window.sessionStorage.setItem(
      `${PRODUCT_PREVIEW_PREFIX}${productId}`,
      JSON.stringify({
        cachedAt: Date.now(),
        product,
      })
    );
  } catch {
    // Session storage is an optimization only.
  }
}

export function loadProductPreview(productId) {
  if (typeof window === "undefined" || !productId) return null;

  try {
    const raw = window.sessionStorage.getItem(`${PRODUCT_PREVIEW_PREFIX}${productId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.product || !hasUsableStockData(parsed.product) || Date.now() - Number(parsed.cachedAt || 0) > PRODUCT_PREVIEW_TTL_MS) {
      window.sessionStorage.removeItem(`${PRODUCT_PREVIEW_PREFIX}${productId}`);
      return null;
    }
    return parsed.product;
  } catch {
    return null;
  }
}
