const fs = require('fs');
const path = 'e:/GRM/PROJ/frontend/src/App.jsx';

let content = fs.readFileSync(path, 'utf8');

// Import MaintenanceGuard
if (!content.includes('MaintenanceGuard')) {
  content = content.replace(
    'import { AuthSessionBootstrap } from "./components/AuthSessionBootstrap";',
    'import { AuthSessionBootstrap } from "./components/AuthSessionBootstrap";\nimport { MaintenanceGuard } from "./components/MaintenanceGuard";'
  );
}

// Import AdminMaintenancePage
if (!content.includes('AdminMaintenancePage')) {
  content = content.replace(
    'const AdminCompanyBrandingPage = lazyNamed(() => import("./pages/AdminCompanyBrandingPage"), "AdminCompanyBrandingPage");',
    'const AdminCompanyBrandingPage = lazyNamed(() => import("./pages/AdminCompanyBrandingPage"), "AdminCompanyBrandingPage");\nconst AdminMaintenancePage = lazyNamed(() => import("./pages/AdminMaintenancePage"), "AdminMaintenancePage");'
  );
}

// Add the Admin route
if (!content.includes('settings/maintenance')) {
  content = content.replace(
    '<Route path="settings/company-branding" element={<AdminCompanyBrandingPage />} />',
    '<Route path="settings/company-branding" element={<AdminCompanyBrandingPage />} />\n              <Route path="settings/maintenance" element={<AdminMaintenancePage />} />'
  );
}

// Wrap Routes with MaintenanceGuard
content = content.replace(
  '<AuthSessionBootstrap>\n    <Suspense',
  '<AuthSessionBootstrap>\n    <MaintenanceGuard>\n    <Suspense'
);

content = content.replace(
  '    </Suspense>\n    </AuthSessionBootstrap>',
  '    </Suspense>\n    </MaintenanceGuard>\n    </AuthSessionBootstrap>'
);

// Fallback if the above replaced structure doesn't match exactly
if (!content.includes('<MaintenanceGuard>')) {
    content = content.replace(
        '<AuthSessionBootstrap>\n      <Routes>',
        '<AuthSessionBootstrap>\n        <MaintenanceGuard>\n          <Routes>'
    );
    content = content.replace(
        '</Routes>\n    </AuthSessionBootstrap>',
        '</Routes>\n        </MaintenanceGuard>\n    </AuthSessionBootstrap>'
    );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated App.jsx');
