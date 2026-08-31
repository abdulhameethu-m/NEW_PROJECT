const fs = require('fs');
let text = fs.readFileSync('e:/Mobile  app/NEW_PROJECT/backend/src/modules/campaign/escrow.routes.js', 'utf8');

const s1 = 'const requireWorkspacePermission("escrowRefunds.read", { legacyPermission: "payouts:process" }) = requireWorkspacePermission("influencerCommerce.settlementsRead", {\n  legacyPermission: "payouts:process",\n});';
const s1_rn = s1.replace(/\n/g, '\r\n');

const s2 = 'const requireWorkspacePermission("escrowRefunds.refund", { legacyPermission: "payouts:process" }) = requireWorkspacePermission("influencerCommerce.settlementsUpdate", {\n  legacyPermission: "payouts:process",\n});';
const s2_rn = s2.replace(/\n/g, '\r\n');

text = text.replace(s1, '');
text = text.replace(s1_rn, '');
text = text.replace(s2, '');
text = text.replace(s2_rn, '');

fs.writeFileSync('e:/Mobile  app/NEW_PROJECT/backend/src/modules/campaign/escrow.routes.js', text);
console.log('Fixed syntax issues in escrow.routes.js');
