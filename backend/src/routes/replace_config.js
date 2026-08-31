const fs = require('fs');
let content = fs.readFileSync('config.routes.js', 'utf8');
content = content.replace(
  'router.use(authRequired);\r\nrouter.use(requireRole("admin", "super_admin", "support_admin", "finance_admin"));',
  'const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");\r\n\r\nrouter.use(adminWorkspaceAuthRequired);\r\nrouter.use((req, res, next) => {\r\n  const perm = req.method === "GET" ? "settings.read" : "settings.update";\r\n  return requireWorkspacePermission(perm, { legacyPermission: "settings:update" })(req, res, next);\r\n});'
);
content = content.replace(
  'router.use(authRequired);\nrouter.use(requireRole("admin", "super_admin", "support_admin", "finance_admin"));',
  'const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");\n\nrouter.use(adminWorkspaceAuthRequired);\nrouter.use((req, res, next) => {\n  const perm = req.method === "GET" ? "settings.read" : "settings.update";\n  return requireWorkspacePermission(perm, { legacyPermission: "settings:update" })(req, res, next);\n});'
);
fs.writeFileSync('config.routes.js', content);
