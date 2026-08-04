const fs = require('fs');

const files = [
  'src/components/AdminTable.jsx',
  'src/components/VendorPanel.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import\s+\{\s*FixedSizeList\s*\}\s+from\s+["']react-window["'];/g, 'import { List as FixedSizeList } from "react-window";');
  fs.writeFileSync(file, content);
  console.log('Fixed export in', file);
}
