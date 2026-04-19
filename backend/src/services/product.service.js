const { AppError } = require("../utils/AppError");
const productRepo = require("../repositories/product.repository");
const { Vendor } = require("../models/Vendor");
const vendorRepo = require("../repositories/vendor.repository");
const { generateSlug } = require("../utils/slug");

async function ensureAdminVendor(userId) {
  // Admin-created products must still map to a Vendor because cart/order schemas require it.
  // We create (or reuse) an approved vendor profile for the admin user.
  const vendor = await vendorRepo.upsertByUserId(userId, {
    status: "approved",
    stepCompleted: 4,
    companyName: "Platform Store",
    shopName: "Platform Store",
    storeDescription: "Products sold directly by the platform.",
    supportEmail: undefined,
    supportPhone: undefined,
  });
  return vendor;
}

class ProductService {
  /**
   * Create a new product
   * @param {Object} productData - Product details
   * @param {String} userId - User ID (who is creating)
   * @param {String} userRole - User role (admin or seller)
   * @param {String} sellerId - Vendor/Seller ID (required for sellers)
   */
  async createProduct(productData, userId, userRole, sellerId = null) {
    // Validate inputs
    if (!productData.name || !productData.description || !productData.category) {
      throw new AppError("Missing required fields: name, description, category", 400, "VALIDATION_ERROR");
    }

    if (userRole === "seller" && !sellerId) {
      throw new AppError("Seller ID is required for seller products", 400, "INVALID_SELLER");
    }

    if (userRole === "seller") {
      // Verify vendor exists and belongs to user
      const vendor = await Vendor.findOne({ _id: sellerId, userId });
      if (!vendor) {
        throw new AppError("Vendor not found or does not belong to you", 403, "FORBIDDEN");
      }

      // Check vendor approval status
      if (vendor.status !== "approved") {
        throw new AppError("Your vendor account is not approved yet", 403, "VENDOR_NOT_APPROVED");
      }
    }

    if (userRole === "admin" && !sellerId) {
      const vendor = await ensureAdminVendor(userId);
      sellerId = vendor._id;
    }

    // Generate slug from name
    const slug = generateSlug(productData.name);

    // Check if slug already exists
    const existingProduct = await productRepo.findBySlug(slug);
    if (existingProduct) {
      throw new AppError("Product with this name already exists", 409, "DUPLICATE_PRODUCT");
    }

    // Check if SKU already exists
    if (productData.SKU) {
      const skuExists = await productRepo.findBySKU(productData.SKU);
      if (skuExists) {
        throw new AppError("SKU already exists", 409, "DUPLICATE_SKU");
      }
    }

    // Determine status based on role
    const status = userRole === "admin" ? "APPROVED" : "PENDING";
    const isActive = userRole === "admin" ? true : false;

    const productPayload = {
      ...productData,
      slug,
      status,
      isActive,
      createdBy: userId,
      creatorType: userRole === "admin" ? "ADMIN" : "SELLER",
      ...(sellerId && { sellerId }),
      // Auto-approve admin products
      ...(userRole === "admin" && {
        approvedAt: new Date(),
        approvedBy: userId,
      }),
    };

    const product = await productRepo.create(productPayload);
    return product;
  }

  /**
   * Update product
   * @param {String} productId - Product ID
   * @param {Object} updateData - Data to update
   * @param {String} userId - User ID (who is updating)
   * @param {String} userRole - User role
   */
  async updateProduct(productId, updateData, userId, userRole, sellerId = null) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    // Authorization check
    if (userRole === "seller") {
      // Sellers can only edit their own products
      if (product.sellerId?.toString() !== sellerId?.toString()) {
        throw new AppError("You can only edit your own products", 403, "FORBIDDEN");
      }
      // Sellers cannot change status
      delete updateData.status;
      delete updateData.creatorType;
      delete updateData.createdBy;
    }

    // Don't allow changing slug (product slug should be immutable after creation)
    delete updateData.slug;

    const updatedProduct = await productRepo.updateById(productId, updateData);
    return updatedProduct;
  }

  /**
   * Delete product (soft delete)
   * @param {String} productId - Product ID
   * @param {String} userId - User ID
   * @param {String} userRole - User role
   * @param {String} sellerId - Seller ID
   */
  async deleteProduct(productId, userId, userRole, sellerId = null) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    // Authorization check
    if (userRole === "seller") {
      if (product.sellerId?.toString() !== sellerId?.toString()) {
        throw new AppError("You can only delete your own products", 403, "FORBIDDEN");
      }
    }

    const deletedProduct = await productRepo.softDeleteById(productId);
    return deletedProduct;
  }

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }
    return product;
  }

  /**
   * Get all products with filters (admin/seller view)
   */
  async getProducts(filters) {
    return await productRepo.list(filters);
  }

  /**
   * Get public products (only approved and active)
   */
  async getPublicProducts(filters) {
    return await productRepo.getPublicProducts(filters);
  }

  /**
   * Get seller's products
   */
  async getSellerProducts(sellerId, filters) {
    return await productRepo.getSellerProducts(sellerId, filters);
  }

  /**
   * Get pending products for admin approval
   */
  async getPendingProducts(filters) {
    return await productRepo.getPendingProducts(filters);
  }

  /**
   * Approve product (admin only)
   */
  async approveProduct(productId, adminId) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    if (product.status === "APPROVED") {
      throw new AppError("Product is already approved", 400, "ALREADY_APPROVED");
    }

    const approvedProduct = await productRepo.approveProduct(productId, adminId);
    return approvedProduct;
  }

  /**
   * Reject product (admin only)
   */
  async rejectProduct(productId, rejectionReason, adminId) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    if (!rejectionReason || typeof rejectionReason !== "string" || !rejectionReason.trim()) {
      throw new AppError("Rejection reason is required", 400, "VALIDATION_ERROR");
    }

    if (product.status === "REJECTED") {
      throw new AppError("Product is already rejected", 400, "ALREADY_REJECTED");
    }

    const rejectedProduct = await productRepo.rejectProduct(productId, rejectionReason, adminId);
    return rejectedProduct;
  }

  /**
   * Get product statistics
   */
  async getProductStats() {
    const countByStatus = await productRepo.getCountByStatus();
    return {
      countByStatus,
    };
  }

  /**
   * Record product view
   */
  async recordView(productId) {
    return await productRepo.incrementViews(productId);
  }

  /**
   * Record product sale
   */
  async recordSale(productId, quantity, amount) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    if (product.stock < quantity) {
      throw new AppError("Insufficient stock", 400, "INSUFFICIENT_STOCK");
    }

    return await productRepo.recordSale(productId, quantity, amount);
  }
}

module.exports = new ProductService();
