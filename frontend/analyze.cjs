const fs = require('fs');

const files = [
  'src/pages/HomePage.jsx',
  'src/pages/ProductsPage.jsx',
  'src/pages/ProductDetailsPage.jsx',
  'src/pages/VendorStorefrontPage.jsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    console.log('--- ' + f + ' ---');
    const imports = (content.match(/import.*?from.*?['"].*?['"]/g) || []).join('\n');
    console.log('Imports:', imports.substring(0, 300) + '...');
    const hooks = content.match(/use(Effect|Query|State|Store|Cart|Auth|Fetch)/g) || [];
    console.log('Hooks:', [...new Set(hooks)].join(', '));
    const helmet = content.match(/<Helmet>[\s\S]*?<\/Helmet>/g);
    console.log('Helmet:', helmet ? 'Found' : 'Not Found');
    const axios = content.match(/axios\.(get|post)/g);
    console.log('Axios:', axios ? 'Yes' : 'No');
  }
});
