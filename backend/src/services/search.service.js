const { Product } = require("../models/Product");
const { Order } = require("../models/Order");

/**
 * Abstraction layer for search functionality.
 * Designed to support MongoDB Atlas Search, and can be swapped with Elasticsearch in the future.
 */
class SearchService {
  /**
   * Search products using MongoDB Atlas Search
   * @param {string} searchTerm - The text to search for
   * @param {object} additionalMatch - Additional filters to apply after search
   * @param {object} pagination - { skip, limit }
   * @param {object} sort - Sorting object
   */
  async searchProducts(searchTerm, additionalMatch = {}, { skip = 0, limit = 20 } = {}, sort = null) {
    if (!searchTerm) {
      // Fallback to normal match if no search term (shouldn't happen if routed correctly)
      const pipeline = [
        { $match: additionalMatch },
        ...(sort ? [{ $sort: sort }] : []),
        { $skip: skip },
        { $limit: limit },
      ];
      return await Product.aggregate(pipeline);
    }

    const pipeline = [
      {
        $search: {
          index: "default", // Name of the Atlas Search index
          text: {
            query: searchTerm,
            path: ["name", "description", "attributes.brand", "tags", "category"],
            fuzzy: {
              maxEdits: 1, // Typo tolerance
            },
          },
        },
      },
      { $match: additionalMatch },
    ];

    if (sort && Object.keys(sort).length > 0) {
      pipeline.push({ $sort: sort });
    } else {
      // If no sort is provided, sort by Atlas Search score (relevance)
      pipeline.push({ $sort: { score: { $meta: "textScore" } } });
    }

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    
    // We add an extra project stage to match the lean document structure 
    // populated fields will be handled separately if needed, but since we are replacing just the find,
    // we might need to populate sellerId and createdBy manually or use $lookup
    
    // Add lookups to simulate populate
    pipeline.push(
      {
        $lookup: {
          from: "vendors",
          localField: "sellerId",
          foreignField: "_id",
          as: "sellerId"
        }
      },
      {
        $unwind: { path: "$sellerId", preserveNullAndEmptyArrays: true }
      }
    );

    const results = await Product.aggregate(pipeline);
    
    // Also get the total count for the search
    const countPipeline = [
      {
        $search: {
          index: "default",
          text: {
            query: searchTerm,
            path: ["name", "description", "attributes.brand", "tags", "category"],
            fuzzy: { maxEdits: 1 },
          },
        },
      },
      { $match: additionalMatch },
      { $count: "total" }
    ];
    
    const countResult = await Product.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    return { results, total };
  }
}

module.exports = new SearchService();
