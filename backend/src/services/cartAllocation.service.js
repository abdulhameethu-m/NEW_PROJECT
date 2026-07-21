const { AppError } = require("../utils/AppError");
const { logger } = require("../utils/logger");

const DEFAULT_SIZE_PRIORITY = ["M", "L", "S", "XL", "XXL", "XXXL", "XS", "XXS"];

function normalizeAttributeValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getVariantSizePriority(variant, sizePriority = DEFAULT_SIZE_PRIORITY) {
  const variantSize = normalizeAttributeValue(variant?.attributes?.size || variant?.size || "");
  const priorityMap = new Map(sizePriority.map((value, index) => [value.trim().toLowerCase(), index]));
  return priorityMap.has(variantSize) ? priorityMap.get(variantSize) : sizePriority.length;
}

function parseSortOrder(variant) {
  const order = Number(variant?.sortOrder);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

function getCartItemKey(productId, variantId = "") {
  return `${String(productId || "")}::${String(variantId || "")}`;
}

function buildCartItemCounts(cartItems = []) {
  const map = new Map();
  for (const item of Array.isArray(cartItems) ? cartItems : []) {
    const productId = item?.productId?._id || item?.productId;
    if (!productId) continue;
    const variantId = String(item.variantId || item.variant?.variantId || "");
    const quantity = Number(item?.quantity || 0);
    if (!quantity) continue;
    const key = getCartItemKey(productId, variantId);
    map.set(key, (map.get(key) || 0) + quantity);
  }
  return map;
}

function getVariantAvailableQuantity(productId, variant, cartItemCounts = new Map()) {
  const stock = Number(variant.stock || 0);
  const reservedStock = Number(variant.reservedStock || 0);
  const key = getCartItemKey(productId, variant?.variantId || "");
  const inCart = Number(cartItemCounts.get(key) || 0);
  return Math.max(0, stock - reservedStock - inCart);
}

function getLegacyAvailableQuantity(product, cartItemCounts = new Map()) {
  const stock = Number(product.stock || 0);
  const reservedStock = Number(product.reservedStock || 0);
  const key = getCartItemKey(product._id || product.id, "");
  const inCart = Number(cartItemCounts.get(key) || 0);
  return Math.max(0, stock - reservedStock - inCart);
}

class CartAllocationService {
  /**
   * Centralized allocation engine for resolving variants.
   *
   * @param {Object} product The product document.
   * @param {Array} cartItems Current items in the cart.
   * @param {Number} requestedQuantity Number of items to add.
   * @param {String} requestedVariantId (Optional) specific variant requested by the user.
   * @returns {Object} { action, message, variant, availableStock }
   */
  allocate(product, cartItems = [], requestedQuantity = 1, requestedVariantId = "") {
    if (!product) {
      throw new AppError("Product is required", 400, "VALIDATION_ERROR");
    }
    if (product.status !== "APPROVED" || product.isActive !== true) {
      throw new AppError("Product not available", 400, "NOT_AVAILABLE");
    }

    const qty = Number(requestedQuantity || 1);
    if (qty < 1) {
      throw new AppError("Quantity must be >= 1", 400, "VALIDATION_ERROR");
    }

    const activeVariants = Array.isArray(product.variants)
      ? product.variants.filter((v) => v?.isActive !== false)
      : [];

    const isSmartCartEnabled = process.env.SMART_CART_ENABLED !== "false";
    const effectiveCartItems = isSmartCartEnabled ? cartItems : [];
    const cartItemCounts = buildCartItemCounts(effectiveCartItems);

    // Legacy products without variants
    if (!activeVariants.length) {
      const available = getLegacyAvailableQuantity(product, cartItemCounts);
      if (available <= 0) {
        return {
          action: "MAXIMUM_STOCK_REACHED",
          message: "Maximum Stock Reached",
          variant: null,
          availableStock: 0,
        };
      }
      if (available < qty) {
        throw new AppError(`Only ${available} item${available === 1 ? "" : "s"} available`, 400, "INSUFFICIENT_STOCK");
      }
      const existingQty = cartItemCounts.get(getCartItemKey(product._id || product.id, "")) || 0;
      return {
        action: existingQty > 0 ? "QUANTITY_UPDATED" : "ADDED",
        message: existingQty > 0 ? "Quantity Updated" : "Added To Cart",
        variant: null,
        availableStock: available,
      };
    }

    // Explicit Variant Selection (Product Details Page)
    if (requestedVariantId) {
      const variant = activeVariants.find((v) => String(v.variantId) === String(requestedVariantId));
      if (!variant) {
        return {
          action: "INVALID_VARIANT",
          message: "Selected Variant is not available.",
          variant: null,
          availableStock: 0,
        };
      }

      const available = getVariantAvailableQuantity(product._id || product.id, variant, cartItemCounts);
      if (available <= 0) {
        return {
          action: "OUT_OF_STOCK",
          message: "Selected Variant is Out of Stock. Please choose another available variant.",
          variant,
          availableStock: 0,
        };
      }
      if (available < qty) {
        throw new AppError(`Only ${available} item${available === 1 ? "" : "s"} available for selected variant`, 400, "INSUFFICIENT_STOCK");
      }
      
      const existingQty = cartItemCounts.get(getCartItemKey(product._id || product.id, variant.variantId)) || 0;
      return {
        action: existingQty > 0 ? "QUANTITY_UPDATED" : "ADDED",
        message: existingQty > 0 ? "Quantity Updated" : "Added To Cart",
        variant,
        availableStock: available,
      };
    }

    // Smart Auto-Allocation (Product Cards, Quick Add)
    // 1. Determine configured variant sequence (never sort by available inventory)
    const sortedVariants = activeVariants
      .map((variant, index) => ({
        variant,
        sortOrder: parseSortOrder(variant),
        sizePriority: getVariantSizePriority(variant),
        title: String(variant.title || variant.variantId || "").trim().toLowerCase(),
        index,
      }))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        if (a.sizePriority !== b.sizePriority) return a.sizePriority - b.sizePriority;
        if (a.title !== b.title) return a.title.localeCompare(b.title);
        return a.index - b.index;
      });

    // 2. Identify highest allocated variant currently in the cart for this product
    const productItemsInCart = Array.isArray(effectiveCartItems) 
      ? effectiveCartItems.filter(item => String(item?.productId?._id || item?.productId) === String(product._id || product.id))
      : [];

    let targetVariant = null;
    let action = "ADDED";
    let message = "Added To Cart";
    let availableStock = 0;

    if (productItemsInCart.length > 0) {
      let highestAllocatedVariantIndex = -1;
      for (const item of productItemsInCart) {
        const vId = item.variantId || item.variant?.variantId || "";
        const index = sortedVariants.findIndex(v => String(v.variant.variantId) === String(vId));
        if (index > highestAllocatedVariantIndex) {
          highestAllocatedVariantIndex = index;
        }
      }

      // 3. Check if current highest allocated variant has remaining inventory
      if (highestAllocatedVariantIndex >= 0) {
        const currentAllocated = sortedVariants[highestAllocatedVariantIndex];
        const available = getVariantAvailableQuantity(product._id || product.id, currentAllocated.variant, cartItemCounts);
        if (available >= qty) {
          targetVariant = currentAllocated.variant;
          availableStock = available;
          action = "QUANTITY_UPDATED";
          message = "Quantity Updated";
        }
      }
    }

    // 4. If current variant is full (or no variants in cart), find the next available variant in the sequence
    if (!targetVariant) {
      for (const entry of sortedVariants) {
        const available = getVariantAvailableQuantity(product._id || product.id, entry.variant, cartItemCounts);
        if (available >= qty) {
          targetVariant = entry.variant;
          availableStock = available;
          
          if (productItemsInCart.length > 0) {
            action = "NEXT_VARIANT_ALLOCATED";
            message = "Added Next Available Variant";
            logger.info("Smart Cart Engine: Next variant auto-allocated sequentially", { 
              productId: product._id || product.id, 
              variantId: targetVariant.variantId 
            });
          }
          break;
        }
      }
    }

    // 5. Maximum inventory reached for all variants
    if (!targetVariant) {
      logger.info("Smart Cart Engine: Maximum stock reached", { productId: product._id || product.id, requestedQuantity: qty });
      return {
        action: "MAXIMUM_STOCK_REACHED",
        message: "Maximum Stock Reached",
        variant: null,
        availableStock: 0,
      };
    }

    return {
      action,
      message,
      variant: targetVariant,
      availableStock,
    };
  }
}

module.exports = new CartAllocationService();
