const express = require("express");
const { authRequired, requireRole } = require("../../middleware/auth");
const controller = require("./controller");

const router = express.Router();

router.get("/admin/overview", authRequired, requireRole("admin", "super_admin", "support_admin", "finance_admin"), controller.overview);
router.get("/campaign/:campaignId/dashboard", authRequired, requireRole("vendor", "admin", "super_admin", "support_admin", "finance_admin"), controller.campaignDashboard);
router.get("/influencer/earnings", authRequired, requireRole("influencer"), controller.influencerEarnings);

module.exports = router;
