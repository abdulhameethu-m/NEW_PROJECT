const fs = require('fs');
const file = 'src/server.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('scheduleFacetJob')) {
  content = content.replace(
    'const paymentService = require("./services/payment.service");',
    'const paymentService = require("./services/payment.service");\nconst { scheduleFacetJob } = require("./workers/jobs/facetPrecalc.job");'
  );

  content = content.replace(
    '    try {\n      await initializeRecommendationJobs();',
    `    try {
      await initializeRecommendationJobs();
    } catch (error) {
      logger.error("Failed to initialize recommendation jobs", {
        error: error?.message,
      });
    }
    
    try {
      await scheduleFacetJob();
      logger.info("Facet pre-calculation job scheduled");`
  );

  fs.writeFileSync(file, content);
  console.log('Done scheduling in server.js');
}
