const fs = require('fs');
let file = fs.readFileSync('src/services/adminApi.js', 'utf8');
file = file.replace(/export async function toggleCategory\(id, isActive\) \{\s*const \{ data \} = await adminHttp\.patch\(`\/api\/admin\/categories\/\$\{id\}\/toggle`, \{ isActive \}\);\s*return data;\s*\}/, `export async function toggleCategory(id, isActive) {
  const { data } = await adminHttp.patch(\`/api/admin/categories/\${id}/toggle\`, { isActive });
  return data;
}

export async function deleteCategory(id) {
  const { data } = await adminHttp.delete(\`/api/admin/categories/\${id}\`);
  return data;
}`);
fs.writeFileSync('src/services/adminApi.js', file);
