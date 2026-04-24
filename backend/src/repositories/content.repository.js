const { HomepageContent } = require("../models/HomepageContent");

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class ContentRepository {
  // ✅ CREATE
  async create(contentData) {
    const content = new HomepageContent(contentData);
    return await content.save();
  }

  // ✅ READ
  async findById(id) {
    return await HomepageContent.findById(id)
      .populate("vendorId", "companyName location")
      .populate("createdByUserId", "name email");
  }

  // ✅ UPDATE
  async update(id, updateData) {
    return await HomepageContent.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("vendorId", "companyName location")
      .populate("createdByUserId", "name email");
  }

  // ✅ DELETE
  async delete(id) {
    return await HomepageContent.findByIdAndDelete(id);
  }

  // 🔥 LIST ALL CONTENT WITH FILTERING & PAGINATION
  async list({
    page = 1,
    limit = 20,
    type,
    isActive,
    createdBy,
    createdByUserId,
    vendorId,
    search,
    sortBy = "position",
    sortOrder = 1,
    startDate,
    endDate,
  } = {}) {
    const query = {};

    // Filters
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive;
    if (createdBy) query.createdBy = createdBy;
    if (createdByUserId) query.createdByUserId = createdByUserId;
    if (vendorId) query.vendorId = vendorId;

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search.trim()), $options: "i" } },
        { description: { $regex: escapeRegex(search.trim()), $options: "i" } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.$or = [
        {
          startDate: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) }),
          },
        },
        {
          endDate: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) }),
          },
        },
      ];
    }

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder };

    const [contents, total] = await Promise.all([
      HomepageContent.find(query)
        .populate("vendorId", "companyName location")
        .populate("createdByUserId", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      HomepageContent.countDocuments(query),
    ]);

    return {
      contents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // 🔥 GET ACTIVE CONTENT BY TYPE (for homepage rendering)
  async getActiveByType(type) {
    const now = new Date();
    return await HomepageContent.find({
      type,
      isActive: true,
      startDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    })
      .populate("vendorId", "companyName")
      .populate("createdByUserId", "name email")
      .sort({ position: 1, createdAt: -1 });
  }

  // 🔥 GET ALL CONTENT BY TYPE (without date filtering)
  async getAllByType(type) {
    return await HomepageContent.find({ type, isActive: true })
      .populate("vendorId", "companyName")
      .populate("createdByUserId", "name email")
      .sort({ position: 1 });
  }

  // 🔥 GET CONTENT BY CREATOR (for admin/vendor dashboard)
  async getByCreator(createdBy, createdByUserId, vendorId = null) {
    const query = {
      createdBy,
      createdByUserId,
    };

    if (vendorId) {
      query.vendorId = vendorId;
    }

    return await HomepageContent.find(query)
      .populate("vendorId", "companyName")
      .sort({ position: 1, createdAt: -1 });
  }

  // 🔥 GET CONTENT BY VENDOR (for vendor dashboard)
  async getByVendor(vendorId) {
    return await HomepageContent.find({
      vendorId,
      createdBy: "vendor",
    })
      .sort({ position: 1, createdAt: -1 });
  }

  // 🔥 BULK UPDATE POSITIONS (for reordering)
  async updatePositions(updates) {
    const bulkOps = updates.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { position: item.position } },
      },
    }));

    return await HomepageContent.bulkWrite(bulkOps);
  }

  // 🔥 UPDATE VIEW COUNT
  async incrementViewCount(id) {
    return await HomepageContent.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
  }

  // 🔥 UPDATE CLICK COUNT
  async incrementClickCount(id) {
    return await HomepageContent.findByIdAndUpdate(
      id,
      { $inc: { clickCount: 1 } },
      { new: true }
    );
  }

  // 🔥 GET DASHBOARD STATS
  async getStats() {
    const now = new Date();
    
    const [totalContent, activeContent, expiredContent, byType] = await Promise.all([
      HomepageContent.countDocuments(),
      HomepageContent.countDocuments({
        isActive: true,
        startDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gte: now } }],
      }),
      HomepageContent.countDocuments({
        isActive: true,
        endDate: { $lt: now },
      }),
      HomepageContent.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const typeStats = {};
    byType.forEach((stat) => {
      typeStats[stat._id] = stat.count;
    });

    return {
      totalContent,
      activeContent,
      expiredContent,
      byType: typeStats,
    };
  }

  // 🔥 SEARCH BY TAGS
  async findByTags(tags, limit = 10) {
    return await HomepageContent.find({
      tags: { $in: tags },
      isActive: true,
    })
      .limit(limit)
      .sort({ position: 1 });
  }

  // 🔥 DELETE EXPIRED CONTENT (cleanup task)
  async deleteExpiredContent() {
    const now = new Date();
    return await HomepageContent.deleteMany({
      endDate: { $lt: now },
      isActive: false,
    });
  }
}

module.exports = new ContentRepository();
