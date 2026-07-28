const fs = require('fs');
const path = 'e:/GRM/PROJ/frontend/src/config/sidebarModules.js';

let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { ShieldAlert } from "lucide-react";')) {
  // Try to find the lucide-react import
  content = content.replace(
    'import {',
    'import {\n  ShieldAlert,'
  );
}

if (!content.includes('/admin/settings/maintenance')) {
  content = content.replace(
    '{ name: "Company Branding", path: "/admin/settings/company-branding", permission: "branding.view", icon: Brush, notificationModule: "WORKSPACE", notificationSubModule: "SETTINGS" },',
    '{ name: "Company Branding", path: "/admin/settings/company-branding", permission: "branding.view", icon: Brush, notificationModule: "WORKSPACE", notificationSubModule: "SETTINGS" },\n      { name: "Platform Maintenance", path: "/admin/settings/maintenance", permission: "settings.update", icon: ShieldAlert, notificationModule: "WORKSPACE", notificationSubModule: "SETTINGS" },'
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated sidebarModules.js');
