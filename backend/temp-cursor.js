const fs = require('fs');
const file = 'src/repositories/product.repository.js';
let content = fs.readFileSync(file, 'utf8');

const listReplacement = `
  // List products with filters and pagination
  async list({
    page = 1,
    limit = 20,
    cursor = null,
    category,
    categoryId,
    subCategoryId,
    status,
    isActive,
    sellerId,
    creatorType,
    search,
    sortBy = "createdAt",
    sortOrder = -1,
    minPrice,
    maxPrice,
    attributeFilters = {},
    filterDefs = [],
    filterDefMap = {},
    startDate,
    endDate,
  } = {}) {
    const query = buildProductQuery({
      category,
      categoryId,
      subCategoryId,
      status,
      isActive,
      sellerId,
      creatorType,
      search,
      minPrice,
      maxPrice,
      attributeFilters,
      filterDefMap,
      startDate,
      endDate,
    });

    if (cursor) {
      try {
        const cursorObj = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        const op = sortOrder === -1 ? '$lt' : '$gt';
        // Note: some sorts like trends might be complex, fallback to offset if cursor decoding fails
        if (cursorObj[sortBy] !== undefined && cursorObj._id) {
          query.$or = [
            { [sortBy]: { [op]: cursorObj[sortBy] } },
            { [sortBy]: cursorObj[sortBy], _id: { [op]: cursorObj._id } }
          ];
        }
      } catch (e) {
        // Fallback to offset pagination
      }
    }

    const skip = cursor ? 0 : (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder, _id: sortOrder };

    const [products, total, facets] = await Promise.all([
      Product.find(query)
        .populate("sellerId", SELLER_PUBLIC_FIELDS)
        .populate("createdBy", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select("-__v -updatedAt")
        .lean(),
      Product.countDocuments(query),
      buildFacetPayload(filterDefs, {
        category,
        categoryId,
        subCategoryId,
        status,
        isActive,
        sellerId,
        creatorType,
        search,
        minPrice,
        maxPrice,
        attributeFilters,
        filterDefMap,
        startDate,
        endDate,
      }),
    ]);

    const nextCursor = products.length === limit ? Buffer.from(JSON.stringify({
      [sortBy]: products[products.length - 1][sortBy],
      _id: products[products.length - 1]._id
    })).toString('base64') : null;

    return {
      products,
      facets,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        nextCursor
      },
    };
  }
`;

content = content.replace(/  \/\/ List products with filters and pagination[\s\S]*?    };\n  }/m, listReplacement);

// getPublicProducts
content = content.replace(
  'async getPublicProducts({\n    page = 1,\n    limit = 20,',
  'async getPublicProducts({\n    page = 1,\n    limit = 20,\n    cursor = null,'
);
content = content.replace(
  '      page,\n      limit,',
  '      page,\n      limit,\n      cursor,'
);

// getSellerProducts
const getSellerReplacement = `
  // Get seller's products
  async getSellerProducts(sellerId, { page = 1, limit = 20, cursor = null, status, startDate, endDate } = {}) {
    const query = { sellerId, isActive: true };
    if (status) query.status = status;
    applyDateRange(query, normalizeDateRange({ startDate, endDate }));
    
    if (cursor) {
      try {
        const cursorObj = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        query.$or = [
          { createdAt: { $lt: cursorObj.createdAt } },
          { createdAt: cursorObj.createdAt, _id: { $lt: cursorObj._id } }
        ];
      } catch (e) {}
    }

    const skip = cursor ? 0 : (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(query),
    ]);
    
    const nextCursor = products.length === limit ? Buffer.from(JSON.stringify({
      createdAt: products[products.length - 1].createdAt,
      _id: products[products.length - 1]._id
    })).toString('base64') : null;

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        nextCursor
      },
    };
  }
`;
content = content.replace(/  \/\/ Get seller's products[\s\S]*?    };\n  }/m, getSellerReplacement);

// getPendingProducts
const getPendingReplacement = `
  // Find pending products (for admin approval)
  async getPendingProducts({ page = 1, limit = 20, cursor = null, startDate, endDate } = {}) {
    const query = { status: "PENDING" };
    applyDateRange(query, normalizeDateRange({ startDate, endDate }));
    
    if (cursor) {
      try {
        const cursorObj = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        query.$or = [
          { createdAt: { $lt: cursorObj.createdAt } },
          { createdAt: cursorObj.createdAt, _id: { $lt: cursorObj._id } }
        ];
      } catch (e) {}
    }
    
    const skip = cursor ? 0 : (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("sellerId", SELLER_PUBLIC_FIELDS)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const nextCursor = products.length === limit ? Buffer.from(JSON.stringify({
      createdAt: products[products.length - 1].createdAt,
      _id: products[products.length - 1]._id
    })).toString('base64') : null;

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        nextCursor
      },
    };
  }
`;
content = content.replace(/  \/\/ Find pending products \(for admin approval\)[\s\S]*?    };\n  }/m, getPendingReplacement);

fs.writeFileSync(file, content);
console.log('Done cursor pagination in product.repository');
