const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Find all <img tags and ensure they have loading="lazy" and decoding="async"
      // Note: we can match `<img ` and check if it lacks these attributes.
      let changed = false;
      content = content.replace(/<img([^>]+)>/g, (match, attrs) => {
        let newAttrs = attrs;
        if (!newAttrs.includes('loading=')) {
          newAttrs += ' loading="lazy"';
          changed = true;
        }
        if (!newAttrs.includes('decoding=')) {
          newAttrs += ' decoding="async"';
          changed = true;
        }
        return `<img${newAttrs}>`;
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated images in', fullPath);
      }
    }
  }
}

processDir('src');
console.log('Finished updating images');
