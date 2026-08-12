const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/modules/adminInfluencerCommerce/service.js');
const lines = fs.readFileSync(file, 'utf8').split('\n');

const cleanedLines = [];
let seenCrypto = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const crypto = require("crypto");')) {
    if (seenCrypto) {
      continue; // Skip duplicate
    }
    seenCrypto = true;
  }
  
  if (line.includes('const analyticsAggregator = require("../analytics/service");')) {
    continue; // Will add it back precisely if missing, actually let's just make sure it exists
  }
  
  cleanedLines.push(line);
}

// Ensure analyticsAggregator is present
let finalCode = cleanedLines.join('\n');
if (!finalCode.includes('const analyticsAggregator =')) {
  finalCode = finalCode.replace(
    'const { AppError } = require("../../utils/AppError");',
    'const analyticsAggregator = require("../analytics/service");\nconst { AppError } = require("../../utils/AppError");'
  );
}

fs.writeFileSync(file, finalCode);
console.log("Cleanup successful");
