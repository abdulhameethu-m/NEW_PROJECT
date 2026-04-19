const { ok, fail } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const productService = require("../services/product.service");
const productRepo = require("../repositories/product.repository");

/**
 * CREATE PRODUCT
 * POST /products
 * Available for: ADMIN, SELLER
 * Admin products: auto-approved
 * Seller products: require approval
 */
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, price, stock, SKU, images } = req.body;

  // Get seller info if user is seller
  let sellerId = null;
  if (req.user.role === "vendor") {
    // Assuming vendor profile is stored with userId reference
    const vendorModule = require("../repositories/vendor.repository");
    const vendor = await vendorModule.findByUserId(req.user.sub);
    if (!vendor) {
      return fail(res, 400, "Vendor profile not found. Please complete onboarding.");
    }
    sellerId = vendor._id;
  }

  const product = await productService.createProduct(req.body, req.user.sub, req.user.role === "admin" ? "admin" : "seller", sellerId);

  const statusCode = req.user.role === "admin" ? 201 : 202; // 202 Accepted for pending approval
  const message = req.user.role === "admin" ? "Product created and approved" : "Product created and pending approval";

  return ok(res, product, message);
});

/**
 * GET ALL PRODUCTS
 * GET /products
 * Filters: category, status, page, limit, search, minPrice, maxPrice, sortBy
 * For users: only shows APPROVED & ACTIVE
 * For sellers: shows their own products
 * For admins: shows all
 */
const getProducts = asyncHandler(async (req, res) => {
  let filters = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    category: req.query.category,
    search: req.query.search,
    minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
    sortBy: req.query.sortBy || "createdAt",
    sortOrder: req.query.sortOrder === "asc" ? 1 : -1,
  };

  // Enforce visibility rules based on role
  if (req.user.role === "user") {
    // Users can only see approved and active products
    const result = await productService.getPublicProducts(filters);
    return ok(res, result, "Products retrieved");
  } else if (req.user.role === "vendor") {
    // Vendors see only their own products
    const vendorModule = require("../repositories/vendor.repository");
    const vendor = await vendorModule.findByUserId(req.user.sub);
    if (!vendor) {
      return fail(res, 400, "Vendor profile not found");
    }

    filters.status = req.query.status; // Vendors can filter by status
    const result = await productService.getSellerProducts(vendor._id, filters);
    return ok(res, result, "Your products retrieved");
  } else {
    // Admins see all products
    filters.status = req.query.status;
    const result = await productService.getProducts(filters);
    return ok(res, result, "All products retrieved");
  }
});

/**
 * GET PUBLIC PRODUCTS (for storefront)
 * GET /products/public
 * Returns only APPROVED & ACTIVE products
 */
const getPublicProducts = asyncHandler(async (req, res) => {
  const filters = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    category: req.query.category,
    search: req.query.search,
    minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
    sortBy: req.query.sortBy || "createdAt",
    sortOrder: req.query.sortOrder === "asc" ? 1 : -1,
  };

  const result = await productService.getPublicProducts(filters);
  return ok(res, result, "Public products retrieved");
});

/**
 * GET PRODUCT BY ID
 * GET /products/:id
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  // Record view for public products
  if (product.isActive && product.status === "APPROVED") {
    await productService.recordView(req.params.id);
  }

  return ok(res, product, "Product retrieved");
});

/**
 * UPDATE PRODUCT
 * PUT/PATCH /products/:id
 * Sellers can only update their own products
 * Admins can update any product
 */
const updateProduct = asyncHandler(async (req, res) => {
  let sellerId = null;
  if (req.user.role === "vendor") {
    const vendorModule = require("../repositories/vendor.repository");
    const vendor = await vendorModule.findByUserId(req.user.sub);
    if (!vendor) {
      return fail(res, 400, "Vendor profile not found");
    }
    sellerId = vendor._id;
  }

  const product = await productService.updateProduct(
    req.params.id,
    req.body,
    req.user.sub,
    req.user.role === "admin" ? "admin" : "seller",
    sellerId
  );

  return ok(res, product, "Product updated");
});

/**
 * DELETE PRODUCT
 * DELETE /products/:id
 * Soft delete - sets isActive to false
 */
const deleteProduct = asyncHandler(async (req, res) => {
  let sellerId = null;
  if (req.user.role === "vendor") {
    const vendorModule = require("../repositories/vendor.repository");
    const vendor = await vendorModule.findByUserId(req.user.sub);
    if (!vendor) {
      return fail(res, 400, "Vendor profile not found");
    }
    sellerId = vendor._id;
  }

  const product = await productService.deleteProduct(
    req.params.id,
    req.user.sub,
    req.user.role === "admin" ? "admin" : "seller",
    sellerId
  );

  return ok(res, product, "Product deleted");
});

/**
 * ADMIN APPROVAL ENDPOINTS
 */

/**
 * GET PENDING PRODUCTS (for admin approval)
 * GET /admin/products/pending
 * Admin only
 */
const getPendingProducts = asyncHandler(async (req, res) => {
  const filters = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await productService.getPendingProducts(filters);
  return ok(res, result, "Pending products retrieved");
});

/**
 * APPROVE PRODUCT
 * PATCH /admin/products/:id/approve
 * Admin only
 */
const approveProduct = asyncHandler(async (req, res) => {
  const product = await productService.approveProduct(req.params.id, req.user.sub);
  return ok(res, product, "Product approved");
});

/**
 * REJECT PRODUCT
 * PATCH /admin/products/:id/reject
 * Admin only
 * Requires: rejectionReason in body
 */
const rejectProduct = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    return fail(res, 400, "Rejection reason is required");
  }

  const product = await productService.rejectProduct(req.params.id, rejectionReason, req.user.sub);
  return ok(res, product, "Product rejected");
});

/**
 * GET PRODUCT STATISTICS
 * GET /admin/products/stats
 * Admin only
 */
const getProductStats = asyncHandler(async (req, res) => {
  const stats = await productService.getProductStats();
  return ok(res, stats, "Product statistics retrieved");
});

module.exports = {
  createProduct,
  getProducts,
  getPublicProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  getProductStats,
};
