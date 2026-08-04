const fs = require('fs');

// AdminOrdersPage.jsx
let ordersContent = fs.readFileSync('src/pages/AdminOrdersPage.jsx', 'utf8');
if (ordersContent.includes('<AdminTable')) {
  ordersContent = ordersContent.replace(
    /        <AdminTable([\s\S]*?)>([\s\S]*?)\{orders\.map\(\(order\) => \([\s\S]*?<tr key=\{order\._id\} className="hover:bg-slate-50 dark:hover:bg-slate-950">([\s\S]*?)<\/tr>\n          \)\)\}\n        <\/AdminTable>/,
    `        <AdminTable$1\n          rows={orders}\n          renderRow={({ row: order, index, style }) => (\n            <tr key={order._id} style={{ ...style, position: 'absolute', top: style.top, left: 0, width: '100%', display: 'flex' }} className="hover:bg-slate-50 dark:hover:bg-slate-950 align-top">\n$3\n            </tr>\n          )}\n        />`
  );
  
  ordersContent = ordersContent.replace(/<td className="(.*?)"(.*?)>/g, '<td className="$1" style={{ flex: "1 1 0%" }} $2>');
  fs.writeFileSync('src/pages/AdminOrdersPage.jsx', ordersContent);
  console.log('AdminOrdersPage updated');
}

// AdminRevenuePage.jsx
let revenueContent = fs.readFileSync('src/pages/AdminRevenuePage.jsx', 'utf8');
if (revenueContent.includes('<AdminTable')) {
  revenueContent = revenueContent.replace(
    /          <AdminTable([\s\S]*?)>([\s\S]*?)\{vendors\.map\(\(vendor\) => \([\s\S]*?<tr key=\{vendor\._id\} className="hover:bg-slate-50 dark:hover:bg-slate-950">([\s\S]*?)<\/tr>\n            \)\)\}\n          <\/AdminTable>/,
    `          <AdminTable$1\n            rows={vendors}\n            renderRow={({ row: vendor, index, style }) => (\n              <tr key={vendor._id} style={{ ...style, position: 'absolute', top: style.top, left: 0, width: '100%', display: 'flex' }} className="hover:bg-slate-50 dark:hover:bg-slate-950 align-top">\n$3\n              </tr>\n            )}\n          />`
  );
  revenueContent = revenueContent.replace(/<td className="(.*?)"(.*?)>/g, '<td className="$1" style={{ flex: "1 1 0%" }} $2>');
  fs.writeFileSync('src/pages/AdminRevenuePage.jsx', revenueContent);
  console.log('AdminRevenuePage updated');
}
