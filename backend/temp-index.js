const fs = require('fs');
let file = 'src/index.js'; // usually src/index.js or server.js
if (!fs.existsSync(file)) {
  file = 'index.js';
}

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('scheduleFacetJob')) {
    content = content.replace(
      'const app = require',
      'const { scheduleFacetJob } = require("./workers/jobs/facetPrecalc.job");\nconst app = require'
    );
    
    // Add schedule call before server starts or inside a connectDB callback
    content = content.replace(
      'app.listen(',
      'scheduleFacetJob().catch(console.error);\n  app.listen('
    );
    fs.writeFileSync(file, content);
    console.log('Done indexing schedule');
  } else {
    console.log('Already scheduled');
  }
} else {
  console.log('Entry file not found');
}
