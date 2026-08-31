const fs = require('fs');

const escrowFile = 'e:/Mobile  app/NEW_PROJECT/backend/src/modules/campaign/escrow.routes.js';
let content = fs.readFileSync(escrowFile, 'utf8');

// The file has:
// const requireSettlementsRead = requireWorkspacePermission("influencerCommerce.settlementsRead" ...
// const requireSettlementsUpdate = requireWorkspacePermission("influencerCommerce.settlementsUpdate" ...
// We should replace requireSettlementsRead inside the routes!

// Mapping:
// /admin/release-queue -> requireWorkspacePermission("escrowRefunds.read", { legacyPermission: "payouts:process" })
// /admin/release-payment -> requireWorkspacePermission("escrowRefunds.refund", { legacyPermission: "payouts:process" }) // actually release is not refund, but let's use escrowRefunds.refund for now, or just leave it.
// The user requested: escrowRefunds: ["read", "refund", "reject"]

// It's safer to just replace them directly in the route definitions.

content = content.replace(/requireSettlementsRead/g, 'requireWorkspacePermission("escrowRefunds.read", { legacyPermission: "payouts:process" })');

content = content.replace(
  /requireSettlementsUpdate/g, 
  'requireWorkspacePermission("escrowRefunds.refund", { legacyPermission: "payouts:process" })'
);

// Specifically for reject:
content = content.replace(
  /router\.post\(\s*"\/admin\/reject-refund\/:refundId",\s*adminWorkspaceAuthRequired,\s*requireWorkspacePermission\("escrowRefunds\.refund",[^\)]+\),/g,
  `router.post(
  "/admin/reject-refund/:refundId",
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("escrowRefunds.reject", { legacyPermission: "payouts:process" }),`
);

// We need to inject requireWorkspacePermission if it's not imported already, but it IS already imported at line 4!
fs.writeFileSync(escrowFile, content);
console.log("Updated escrow.routes.js");
