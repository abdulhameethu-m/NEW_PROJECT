const express = require("express");
const { authRequired, requireRole, requirePermission } = require("../middleware/auth");
const adminController = require("../controllers/admin.controller");
const revenueController = require("../controllers/revenue.controller");
const productController = require("../controllers/product.controller");
const { validate } = require("../middleware/validate");
const { ADMIN_ROLES } = require("../utils/adminPermissions");
const {
  createProductSchema,
  updateProductSchema,
  rejectProductSchema,
} = require("../utils/validators/product.validation");
const { createAdminOrderSchema, updateAdminOrderSchema } = require("../utils/validators/order.validation");
const {
  createCategorySchema,
  updateCategorySchema,
  toggleCategorySchema,
} = require("../utils/validators/category.validation");
const categoryController = require("../controllers/category.controller");

const router = express.Router();

router.use(authRequired, requireRole(...ADMIN_ROLES));

router.get("/dashboard", requirePermission("dashboard:read"), adminController.dashboard);
router.get("/analytics", requirePermission("analytics:read"), adminController.analytics);
router.get("/revenue", requirePermission("analytics:read"), revenueController.getRevenueSummary);
router.get("/revenue/vendors", requirePermission("analytics:read"), revenueController.getVendorRevenue);
router.get("/revenue/export", requirePermission("analytics:read"), revenueController.exportRevenue);
router.get("/daily-revenue", requirePermission("analytics:read"), adminController.dailyRevenue);
router.get("/audit-logs", requirePermission("audit:read"), adminController.listAuditLogs);

router.get("/users", requirePermission("users:read"), adminController.listUsers);
router.patch("/users/:id/block", requirePermission("users:update"), adminController.toggleUserBlocked);
router.delete("/users/:id", requirePermission("users:delete"), adminController.deleteUser);

// Backward-compatible user status endpoint
router.put("/user/:id/status", requirePermission("users:update"), adminController.setUserStatus);

router.get("/sellers", requirePermission("vendors:read"), adminController.listVendors);
router.patch("/sellers/:id/approve", requirePermission("vendors:approve"), adminController.approveVendor);
router.patch("/sellers/:id/reject", requirePermission("vendors:reject"), express.json(), adminController.rejectVendor);
router.get("/sellers/:id", requirePermission("vendors:read"), adminController.getVendorDetails);

// Backward-compatible vendor routes
router.get("/vendors", requirePermission("vendors:read"), adminController.listVendors);
router.get("/vendor/:id", requirePermission("vendors:read"), adminController.getVendorDetails);
router.put("/vendor/:id/approve", requirePermission("vendors:approve"), adminController.approveVendor);
router.put("/vendor/:id/reject", requirePermission("vendors:reject"), express.json(), adminController.rejectVendor);
router.delete("/vendor/:id", requirePermission("vendors:delete"), adminController.removeVendor);

router.get("/orders", requirePermission("orders:read"), adminController.listOrders);
router.patch("/orders/:id/status", requirePermission("orders:update"), express.json(), adminController.updateOrderStatus);
router.get("/orders/:id", requirePermission("orders:read"), adminController.getOrderById);
router.post("/orders", requirePermission("orders:create"), validate(createAdminOrderSchema), adminController.createOrder);
router.patch("/orders/:id", requirePermission("orders:update"), validate(updateAdminOrderSchema), adminController.updateOrder);
router.delete("/orders/:id", requirePermission("orders:delete"), adminController.deleteOrder);

// Products routes - IMPORTANT: Specific routes must come before parameter routes
router.get("/products", requirePermission("products:read"), productController.getProducts);
router.get("/products/stats", requirePermission("products:read"), productController.getProductStats);
router.get("/products/pending", requirePermission("products:read"), productController.getPendingProducts);
router.post("/products", requirePermission("products:create"), validate(createProductSchema), productController.createProduct);

// Parameter-based product routes (after specific routes)
router.get("/products/:id", requirePermission("products:read"), productController.getProductById);
router.patch("/products/:id", requirePermission("products:update"), validate(updateProductSchema), productController.updateProduct);
router.delete("/products/:id", requirePermission("products:delete"), productController.deleteProduct);
router.patch("/products/:id/approve", requirePermission("products:approve"), productController.approveProduct);
router.patch("/products/:id/reject", requirePermission("products:reject"), validate(rejectProductSchema), productController.rejectProduct);

router.get("/categories", requirePermission("categories:read"), categoryController.getAdminCategories);
router.post("/categories", requirePermission("categories:create"), validate(createCategorySchema), categoryController.createCategory);
router.patch("/categories/:id", requirePermission("categories:update"), validate(updateCategorySchema), categoryController.updateCategory);
router.patch(
  "/categories/:id/toggle",
  requirePermission("categories:update"),
  validate(toggleCategorySchema),
  categoryController.toggleCategory
);

module.exports = router;
