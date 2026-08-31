const fs = require('fs');
let content = fs.readFileSync('shipping.routes.js', 'utf8');

content = content.replace(
  /router\.get\("\/admin\/modes",\s+authRequired,\s+requireRole\("admin"\)/,
  'router.get("/admin/modes", adminWorkspaceAuthRequired, requireWorkspacePermission("shippingAccess.read", { legacyPermission: "settings:read" })'
);

content = content.replace(
  /router\.get\("\/admin\/vendors\/:vendorId",\s+authRequired,\s+requireRole\("admin"\)/,
  'router.get("/admin/vendors/:vendorId", adminWorkspaceAuthRequired, requireWorkspacePermission("shippingAccess.read", { legacyPermission: "settings:read" })'
);

content = content.replace(
  /"\/admin\/(modes|vendors\/:vendorId)",\s+authRequired,\s+requireRole\("admin"\)/g,
  function(match, p1) {
     return '"/admin/' + p1 + '", adminWorkspaceAuthRequired, requireWorkspacePermission("shippingAccess.update", { legacyPermission: "settings:update" })';
  }
);
content = content.replace(
  /"\/admin\/orders[^\"]+",\s+authRequired,\s+requireRole\("admin"\)/g,
  function(match) {
     return match.replace(/authRequired,\s+requireRole\("admin"\)/, 'adminWorkspaceAuthRequired, requireWorkspacePermission("orders.update", { legacyPermission: "orders:update" })');
  }
);

content = content.replace(/authRequired,\s+requireRole\("admin"\)/g, 'adminWorkspaceAuthRequired, requireWorkspacePermission("settings.update", { legacyPermission: "settings:update" })'); // Fallback just in case

// Prepend requireWorkspacePermission if absent
if (!content.includes('adminWorkspaceAuthRequired')) {
  content = 'const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");\n' + content;
}

fs.writeFileSync('shipping.routes.js', content);
