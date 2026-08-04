const fs = require('fs');
const file = 'src/repositories/product.repository.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('const searchService = require')) {
  content = content.replace(
    'const { Product } = require("../models/Product");',
    'const { Product } = require("../models/Product");\nconst searchService = require("../services/search.service");'
  );
}

// In buildProductQuery, remove the regex logic
content = content.replace(
  '  if (search) {\n    query.name = { $regex: escapeRegex(search.trim()), $options: "i" };\n  }',
  '  // search is handled separately by SearchService (Atlas Search) if provided, so we don\'t add regex here\n  // if (search) {\n  //   query.name = { $regex: escapeRegex(search.trim()), $options: "i" };\n  // }'
);

// In list method, use searchService if search is present
content = content.replace(
  '    const skip = cursor ? 0 : (page - 1) * limit;\n    const sortObj = { [sortBy]: sortOrder, _id: sortOrder };\n\n    const [products, total, facets] = await Promise.all([',
  `    const skip = cursor ? 0 : (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder, _id: sortOrder };
    
    let products = [];
    let total = 0;
    let facets = [];

    if (search) {
      // Use Atlas Search via SearchService
      const searchRes = await searchService.searchProducts(search.trim(), query, { skip, limit }, sortObj);
      products = searchRes.results;
      total = searchRes.total;
      
      // Still calculate facets using the base query (though ideally should also use Atlas Search facets in the future)
      facets = await buildFacetPayload(filterDefs, {
        category, categoryId, subCategoryId, status, isActive, sellerId, creatorType,
        search, minPrice, maxPrice, attributeFilters, filterDefMap, startDate, endDate,
      });
    } else {
      const results = await Promise.all([`
);

content = content.replace(
  '      }),\n    ]);',
  `      }),
      ]);
      products = results[0];
      total = results[1];
      facets = results[2];
    }`
);

fs.writeFileSync(file, content);
console.log('Done integrating SearchService in product.repository');
