const fs = require('fs');
let file = fs.readFileSync('src/routes/admin.routes.js', 'utf8');
file = file.replace(/categoryController\.toggleCategory\s*\);\s*router\.get\("\/subcategories"/, 'categoryController.toggleCategory\n);\nrouter.delete("/categories/:id", requireLegacyAdminPermission("categories:update"), categoryController.deleteCategory);\nrouter.get("/subcategories"');
fs.writeFileSync('src/routes/admin.routes.js', file);
