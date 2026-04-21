const { Product } = require("../models/Product");
const { normalizeDateRange, applyDateRange } = require("../utils/dateRange");

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class ProductRepository {
  // Create a new product
  async create(productData) {
    const product = new Product(productData);
    return await product.save();
  }

  // Find product by ID with vendor details
  async findById(productId) {
    return await Product.findById(productId)
      .populate("sellerId", "companyName location")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email");
  }

  // Find product by slug
  async findBySlug(slug) {
    return await Product.findOne({ slug }).populate("sellerId", "companyName").populate("createdBy", "name email");
  }

  // Find by SKU
  async findBySKU(sku) {
    return await Product.findOne({ SKU: sku });
  }

  // List products with filters and pagination
  async list({
    page = 1,
    limit = 20,
    category,
    status,
    isActive,
    sellerId,
    creatorType,
    search,
    sortBy = "createdAt",
    sortOrder = -1,
    minPrice,
    maxPrice,
    startDate,
    endDate,
  } = {}) {
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive;
    if (sellerId) query.sellerId = sellerId;
    if (creatorType) query.creatorType = creatorType;

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = minPrice;
      if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }

    if (search) {
      query.name = { $regex: escapeRegex(search.trim()), $options: "i" };
    }

    applyDateRange(query, normalizeDateRange({ startDate, endDate }));

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("sellerId", "companyName location")
        .populate("createdBy", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get only approved and active products (for public API)
  async getPublicProducts({
    page = 1,
    limit = 20,
    category,
    search,
    sortBy = "createdAt",
    sortOrder = -1,
    minPrice,
    maxPrice,
  } = {}) {
    return this.list({
      page,
      limit,
      category,
      status: "APPROVED",
      isActive: true,
      search,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
    });
  }

  // Get seller's products
  async getSellerProducts(sellerId, { page = 1, limit = 20, status, startDate, endDate } = {}) {
    const query = { sellerId };
    if (status) query.status = status;
    applyDateRange(query, normalizeDateRange({ startDate, endDate }));

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update product
  async updateById(productId, updateData) {
    return await Product.findByIdAndUpdate(productId, { $set: updateData }, { new: true, runValidators: true })
      .populate("sellerId", "companyName")
      .populate("createdBy", "name email");
  }

  // Delete product (soft delete)
  async softDeleteById(productId) {
    return await Product.findByIdAndUpdate(productId, { $set: { isActive: false } }, { new: true });
  }

  // Hard delete
  async deleteById(productId) {
    return await Product.findByIdAndDelete(productId);
  }

  // Find pending products (for admin approval)
  async getPendingProducts({ page = 1, limit = 20, startDate, endDate } = {}) {
    const query = { status: "PENDING" };
    applyDateRange(query, normalizeDateRange({ startDate, endDate }));
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("sellerId", "companyName")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Approve product
  async approveProduct(productId, approvedBy) {
    return await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          status: "APPROVED",
          isActive: true,
          approvedBy,
          approvedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  // Reject product
  async rejectProduct(productId, rejectionReason, approvedBy) {
    return await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          status: "REJECTED",
          rejectionReason,
          isActive: false,
          approvedBy,
          approvedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  // Get product count by status
  async getCountByStatus() {
    return await Product.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
  }

  async countDocuments(query = {}) {
    return await Product.countDocuments(query);
  }

  async getTopProducts(limit = 5) {
    return await Product.find({ status: "APPROVED", isActive: true })
      .sort({ "analytics.totalRevenue": -1, "analytics.salesCount": -1, createdAt: -1 })
      .limit(limit)
      .select("name category price analytics ratings status isActive")
      .exec();
  }

  // Update views count
  async incrementViews(productId) {
    return await Product.findByIdAndUpdate(
      productId,
      { $inc: { "analytics.views": 1 } },
      { new: true }
    );
  }

  // Update sales count and revenue
  async recordSale(productId, quantity, amount) {
    return await Product.findByIdAndUpdate(
      productId,
      {
        $inc: {
          "analytics.salesCount": quantity,
          "analytics.totalRevenue": amount,
          stock: -quantity,
        },
      },
      { new: true }
    );
  }
}

module.exports = new ProductRepository();
