const fs = require('fs');
const path = 'e:/GRM/PROJ/frontend/src/App.jsx';

let content = fs.readFileSync(path, 'utf8');

// Replace opening
content = content.replace(
  /<AuthSessionBootstrap>\s*<Routes>/g,
  '<AuthSessionBootstrap>\n      <MaintenanceGuard>\n        <Routes>'
);

// Replace closing
content = content.replace(
  /<\/Routes>\s*<\/AuthSessionBootstrap>/g,
  '        </Routes>\n      </MaintenanceGuard>\n    </AuthSessionBootstrap>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully added MaintenanceGuard wrapper to App.jsx with regex');
