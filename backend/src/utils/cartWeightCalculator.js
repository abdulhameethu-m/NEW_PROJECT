const { AppError } = require("./AppError");

/**
 * Cart Weight Calculation Utilities
 * Handles weight aggregation for shipping calculations
 */

/**
 * Calculate total weight from cart items
 * @param {Array} cartItems - Array of cart items with product data
 * @returns {number} Total weight in kg
 */
function calculateCartWeight(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 0;
  }

  try {
    let totalWeight = 0;

    for (const item of cartItems) {
      const productWeight = getItemWeight(item);
      const itemTotalWeight = productWeight * (item.quantity || 1);
      totalWeight += itemTotalWeight;
    }

    // Preserve gram-level precision in kg values.
    return Math.round(totalWeight * 1000) / 1000;
  } catch (error) {
    throw new AppError(
      `Error calculating cart weight: ${error.message}`,
      400,
      "WEIGHT_CALCULATION_ERROR"
    );
  }
}

/**
 * Get weight of a single item
 * @param {Object} item - Cart item object
 * @returns {number} Weight in kg
 */
function getItemWeight(item) {
  if (item?.weight && typeof item.weight === "object") {
    const snapshotWeight = Number(item.weight.value);
    if (Number.isFinite(snapshotWeight) && snapshotWeight > 0) {
      return snapshotWeight;
    }
  }

  const product = item.product || item;

  // Try structured weight field first
  if (product.weight && typeof product.weight === "object") {
    const weight = product.weight.value;
    if (typeof weight === "number" && weight > 0) {
      return weight;
    }
  }

  // Fallback for legacy weight field (number)
  if (typeof product.weight === "number" && product.weight > 0) {
    return product.weight;
  }

  throw new AppError(
    `Product ${product.name || product._id} does not have valid weight. Weight must be > 0kg`,
    400,
    "MISSING_PRODUCT_WEIGHT"
  );
}

/**
 * Validate that all items have weight
 * @param {Array} cartItems - Array of cart items
 * @throws {AppError} If any item is missing weight
 */
function validateAllItemsHaveWeight(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new AppError("Cart is empty", 400, "EMPTY_CART");
  }

  for (const item of cartItems) {
    try {
      getItemWeight(item);
    } catch (error) {
      throw new AppError(
        `Item validation failed: ${error.message}`,
        400,
        "ITEM_WEIGHT_VALIDATION_FAILED"
      );
    }
  }
}

/**
 * Get weight breakdown by item
 * Useful for debugging and detailed calculations
 * @param {Array} cartItems - Array of cart items
 * @returns {Array} Array of {itemName, quantity, weight, totalWeight}
 */
function getWeightBreakdown(cartItems) {
  if (!Array.isArray(cartItems)) {
    return [];
  }

  return cartItems.map((item) => {
    const product = item.product || item;
    const itemWeight = getItemWeight(item);
    const quantity = item.quantity || 1;

    return {
      productId: product._id || product.id,
      productName: product.name || "Unknown",
      quantity,
      weightPerUnit: itemWeight,
      totalWeight: Math.round(itemWeight * quantity * 1000) / 1000,
    };
  });
}

module.exports = {
  calculateCartWeight,
  getItemWeight,
  validateAllItemsHaveWeight,
  getWeightBreakdown,
};
