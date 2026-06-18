const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const { authRequired, requireRole } = require("../middleware/auth");
const { requireApprovedVendor } = require("../middleware/vendorApproval");

const inventoryReadAuth = [authRequired, requireRole("vendor", "admin"), requireApprovedVendor];
const inventoryWriteAuth = [authRequired, requireRole("vendor", "admin"), requireApprovedVendor];

/**
 * Product Inventory Routes
 */

// Get product inventory overview (all variants)
router.get("/product/:productId", inventoryReadAuth, inventoryController.getProductInventory);

// Get specific variant inventory details
router.get("/product/:productId/variant/:variantId", inventoryReadAuth, inventoryController.getVariantInventory);

// Get available stock for a variant
router.get("/product/:productId/variant/:variantId/available", inventoryReadAuth, inventoryController.getAvailableStock);

// Get variant inventory ledger/history
router.get("/product/:productId/variant/:variantId/ledger", inventoryReadAuth, inventoryController.getVariantLedger);

/**
 * Seller Inventory Management Routes (Protected)
 */

// Get seller's inventory summary
router.get("/seller/summary", inventoryReadAuth, inventoryController.getSellerInventorySummary);

// Get seller's low stock variants
router.get("/seller/low-stock", inventoryReadAuth, inventoryController.getSellersLowStockVariants);

/**
 * Inventory Adjustment Routes (Protected - Admin/Seller)
 */

// Manual stock adjustment
router.post("/product/:productId/variant/:variantId/adjust", inventoryWriteAuth, inventoryController.adjustStock);

// Update threshold
router.patch("/product/:productId/variant/:variantId/threshold", inventoryWriteAuth, inventoryController.updateThreshold);

/**
 * Export Routes (Protected)
 */

// Export product inventory as CSV
router.get("/product/:productId/export/csv", inventoryReadAuth, inventoryController.exportInventoryCSV);

module.exports = router;
