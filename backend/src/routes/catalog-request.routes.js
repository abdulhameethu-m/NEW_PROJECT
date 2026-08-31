const express = require("express");
const controller = require("../controllers/catalogRequest.controller");
const { authRequired, requireRole } = require("../middleware/auth");
const { requireApprovedVendor } = require("../middleware/vendorApproval");
const router = express.Router();
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");

router.get("/search", authRequired, requireRole("vendor"), requireApprovedVendor, controller.searchCatalog);
router.get("/requests", authRequired, requireRole("vendor"), requireApprovedVendor, controller.listVendorRequests);
router.post("/request", authRequired, requireRole("vendor"), requireApprovedVendor, controller.createRequest);
router.get("/request/:id", authRequired, requireRole("vendor"), requireApprovedVendor, controller.getRequestById);
router.put("/request/:id/cancel", authRequired, requireRole("vendor"), requireApprovedVendor, controller.cancelRequest);

router.get("/admin/requests", adminWorkspaceAuthRequired, requireWorkspacePermission("catalogRequests.read", { legacyPermission: "categories:read" }), controller.listAdminRequests);
router.get("/admin/request/:id", adminWorkspaceAuthRequired, requireWorkspacePermission("catalogRequests.read", { legacyPermission: "categories:read" }), controller.getRequestById);
router.put("/admin/request/:id/approve", adminWorkspaceAuthRequired, requireWorkspacePermission("catalogRequests.update", { legacyPermission: "categories:update" }), controller.reviewRequest);
router.put("/admin/request/:id/reject", adminWorkspaceAuthRequired, requireWorkspacePermission("catalogRequests.update", { legacyPermission: "categories:update" }), controller.reviewRequest);
router.put("/admin/request/:id/request-info", adminWorkspaceAuthRequired, requireWorkspacePermission("catalogRequests.update", { legacyPermission: "categories:update" }), controller.reviewRequest);
router.put("/admin/request/:id/merge", adminWorkspaceAuthRequired, requireWorkspacePermission("catalogRequests.update", { legacyPermission: "categories:update" }), controller.reviewRequest);
module.exports = router;