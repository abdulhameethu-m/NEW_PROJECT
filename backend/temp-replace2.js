const fs = require('fs');
const file = 'src/routes/homepage-container.routes.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('cacheMiddleware')) {
  content = content.replace(
    'const homepageContainerController = require("../controllers/homepage-container.controller");',
    'const { cacheMiddleware } = require("../utils/cache");\nconst homepageContainerController = require("../controllers/homepage-container.controller");'
  );

  content = content.replace(
    'router.get("/public", homepageContainerController.getPublicContainers);',
    'router.get("/public", cacheMiddleware(600), homepageContainerController.getPublicContainers);'
  );

  content = content.replace(
    'router.get("/public/:slug", homepageContainerController.getPublicContainerBySlug);',
    'router.get("/public/:slug", cacheMiddleware(600), homepageContainerController.getPublicContainerBySlug);'
  );

  fs.writeFileSync(file, content);
  console.log('Done homepage');
}
