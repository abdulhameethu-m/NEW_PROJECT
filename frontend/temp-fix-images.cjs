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
      
      let changed = false;
      
      // Fix `/ loading="lazy" decoding="async">` to ` loading="lazy" decoding="async" />`
      if (content.includes('/ loading="lazy" decoding="async">')) {
        content = content.replace(/\/ loading="lazy" decoding="async">/g, ' loading="lazy" decoding="async" />');
        changed = true;
      }

      // Also there might be `/ decoding="async" loading="lazy">` or similar
      if (content.includes('/ decoding="async" loading="lazy">')) {
         content = content.replace(/\/ decoding="async" loading="lazy">/g, ' decoding="async" loading="lazy" />');
         changed = true;
      }

      // Fix just `/ loading="lazy">` if any
      if (content.includes('/ loading="lazy">')) {
         content = content.replace(/\/ loading="lazy">/g, ' loading="lazy" />');
         changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed images in', fullPath);
      }
    }
  }
}

processDir('src');
console.log('Finished fixing images');
