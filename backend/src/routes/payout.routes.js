const express = require("express");
const { authRequired } = require("../middleware/auth");
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");
const payoutController = require("../controllers/payout.controller");

const router = express.Router();

router.post("/create-account", authRequired, payoutController.createAccount);
router.post("/process", adminWorkspaceAuthRequired, requireWorkspacePermission("payouts.process"), payoutController.processPayout);
router.post("/queue", adminWorkspaceAuthRequired, requireWorkspacePermission("payouts.process"), payoutController.queueEligiblePayouts);

module.exports = router;
