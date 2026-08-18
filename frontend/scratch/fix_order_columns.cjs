const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), "src/pages/OrderDetailsPage.jsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add items-start or content-start to the column wrappers
content = content.replace(
  `className="print-order-grid grid gap-6 p-6 sm:p-8 print:px-0 print:py-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"`,
  `className="print-order-grid grid items-start gap-6 p-6 sm:p-8 print:px-0 print:py-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"`
);

content = content.replace(
  `<div className="grid gap-6">`,
  `<div className="grid content-start gap-6">`
);

content = content.replace(
  `<div className="grid gap-4">`,
  `<div className="grid content-start gap-4">`
);

// 2. Extract Customer and Payment sections
const customerMatch = content.match(/<section className="print-card[^>]*>[\s\S]*?<h2 className="text-\[17px\] font-bold text-slate-900 dark:text-white">Customer<\/h2>[\s\S]*?<\/section>/);
const paymentMatch = content.match(/<section className="print-card[^>]*>[\s\S]*?<h2 className="text-\[17px\] font-bold text-slate-900 dark:text-white">Payment Details<\/h2>[\s\S]*?<\/section>/);

if (customerMatch && paymentMatch) {
  // Remove them from their original location
  content = content.replace(customerMatch[0], "");
  content = content.replace(paymentMatch[0], "");

  // Find the end of the Order Timeline section. Order timeline ends before </div>\n\n          <div className="grid content-start gap-4">
  // We can insert them right before the left column closes.
  // We know the left column is the first <div className="grid content-start gap-6"> and ends right before the right column starts.
  
  const rightColumnStart = `<div className="grid content-start gap-4">`;
  const insertIndex = content.indexOf(rightColumnStart);
  
  if (insertIndex !== -1) {
    // Find the closing </div> of the left column which is right before rightColumnStart
    const beforeRightColumn = content.substring(0, insertIndex);
    const lastDivIndex = beforeRightColumn.lastIndexOf("</div>");
    
    if (lastDivIndex !== -1) {
      const newLeftColumnContent = beforeRightColumn.substring(0, lastDivIndex) + 
        `\n            ` + customerMatch[0] + 
        `\n\n            ` + paymentMatch[0] + 
        `\n          </div>\n\n          `;
        
      content = newLeftColumnContent + content.substring(insertIndex);
    }
  }
}

fs.writeFileSync(filePath, content, "utf8");
console.log("Columns rearranged and heights fixed.");
