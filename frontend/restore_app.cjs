const fs = require('fs');
const path = 'e:/GRM/PROJ/frontend/src/App.jsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Add Imports
if (!content.includes('MaintenanceGuard')) {
  content = content.replace(
    'import { AuthSessionBootstrap } from "./components/AuthSessionBootstrap";',
    'import { AuthSessionBootstrap } from "./components/AuthSessionBootstrap";\nimport { MaintenanceGuard } from "./components/MaintenanceGuard";'
  );
}

if (!content.includes('AdminMaintenancePage')) {
  content = content.replace(
    'const AdminCompanyBrandingPage = lazyNamed(() => import("./pages/AdminCompanyBrandingPage"), "AdminCompanyBrandingPage");',
    'const AdminCompanyBrandingPage = lazyNamed(() => import("./pages/AdminCompanyBrandingPage"), "AdminCompanyBrandingPage");\nconst AdminMaintenancePage = lazyNamed(() => import("./pages/AdminMaintenancePage"), "AdminMaintenancePage");'
  );
}

// 2. Add Route
if (!content.includes('settings/maintenance')) {
  content = content.replace(
    '<Route path="settings/company-branding" element={<AdminCompanyBrandingPage />} />',
    '<Route path="settings/company-branding" element={<AdminCompanyBrandingPage />} />\n              <Route path="settings/maintenance" element={<AdminMaintenancePage />} />'
  );
}

// 3. Wrap Routes
if (!content.includes('<MaintenanceGuard>')) {
  content = content.replace(
    /<AuthSessionBootstrap>\s*<Routes>/g,
    '<AuthSessionBootstrap>\n      <MaintenanceGuard>\n        <Routes>'
  );

  content = content.replace(
    /<\/Routes>\s*<\/AuthSessionBootstrap>/g,
    '        </Routes>\n      </MaintenanceGuard>\n    </AuthSessionBootstrap>'
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('App.jsx fully updated');
