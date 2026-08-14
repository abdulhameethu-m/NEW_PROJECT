const fs = require('fs');
const lines = fs.readFileSync('frontend/src/pages/ProductsPage.jsx', 'utf8').split('\n');
fs.writeFileSync('frontend/src/pages/ProductsPage.jsx', lines.slice(0, 913).join('\n'));
