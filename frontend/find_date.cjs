const fs = require('fs');
const lines = fs.readFileSync('src/pages/vendorInfluencer/CampaignsTab.jsx', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('type="datetime-local"') || line.toLowerCase().includes('type="time"') || line.toLowerCase().includes('type="date"')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
