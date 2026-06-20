const express = require("express");
const { authRequired } = require("../middleware/auth");
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");
const controller = require("../controllers/marketplace-settlement.controller");

const router = express.Router();
router.get("/vendor/settlements", authRequired, controller.vendorReport);
router.get("/admin/settlement-rules", adminWorkspaceAuthRequired, requireWorkspacePermission("settlements.read"), controller.getRules);
router.put("/admin/settlement-rules", adminWorkspaceAuthRequired, requireWorkspacePermission("settlements.settle"), controller.updateRules);
router.get("/admin/settlement-revenue", adminWorkspaceAuthRequired, requireWorkspacePermission("settlements.read"), controller.adminSummary);
module.exports = router;
