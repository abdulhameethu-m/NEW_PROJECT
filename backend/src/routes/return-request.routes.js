const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { requireApprovedVendor } = require("../middleware/vendorApproval");
const { upload } = require("../middleware/upload");
const ctrl = require("../controllers/return-request.controller");
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");

const router = express.Router();

const customer = requireRole("user");
const admin = requireRole("admin", "super_admin", "support_admin", "finance_admin");
const vendor = requireRole("vendor");

// ── Customer Routes ───────────────────────────────────────────
// POST   /api/returns               — create return request (with evidence upload)
// GET    /api/returns               — list my returns
// GET    /api/returns/:id           — get single return

router.post(
  "/",
  authRequired,
  customer,
  upload.array("evidence", 5),
  ctrl.customerCreateReturn
);

router.get(
  "/",
  authRequired,
  customer,
  ctrl.customerGetReturns
);

router.get(
  "/:id",
  authRequired,
  ctrl.getReturnById
);

// ── Admin Routes ──────────────────────────────────────────────
// GET    /api/admin/returns/stats           — dashboard stats
// GET    /api/admin/returns/disputes        — dispute queue
// GET    /api/admin/returns                 — list all returns
// GET    /api/admin/returns/:id             — single return
// POST   /api/admin/returns/:id/approve     — approve
// POST   /api/admin/returns/:id/reject      — reject
// POST   /api/admin/returns/:id/resolve-dispute — resolve dispute

const adminRouter = express.Router();

adminRouter.get("/stats", adminWorkspaceAuthRequired, requireWorkspacePermission("returns.read"), ctrl.adminGetStats);
adminRouter.get("/disputes", adminWorkspaceAuthRequired, requireWorkspacePermission("returns.read"), ctrl.adminGetDisputes);
adminRouter.get("/", adminWorkspaceAuthRequired, requireWorkspacePermission("returns.read"), ctrl.adminListReturns);
adminRouter.get("/:id", adminWorkspaceAuthRequired, requireWorkspacePermission("returns.read"), ctrl.adminGetReturn);
adminRouter.post("/:id/approve", adminWorkspaceAuthRequired, requireWorkspacePermission("returns.update"), ctrl.adminApproveReturn);
adminRouter.post("/:id/reject", adminWorkspaceAuthRequired, requireWorkspacePermission("returns.update"), ctrl.adminRejectReturn);
adminRouter.post("/:id/resolve-dispute", adminWorkspaceAuthRequired, requireWorkspacePermission("returns.update"), ctrl.adminResolveDispute);

// ── Vendor Routes ─────────────────────────────────────────────
// GET    /api/vendor/returns               — list vendor's approved returns
// GET    /api/vendor/returns/:id           — single vendor return
// POST   /api/vendor/returns/:id/received  — mark received
// POST   /api/vendor/returns/:id/accept    — accept return
// POST   /api/vendor/returns/:id/dispute   — dispute return (with evidence upload)

const vendorRouter = express.Router();

const injectVendorId = (req, res, next) => {
  if (req.user && req.vendor) {
    req.user.vendorId = req.vendor._id;
  }
  next();
};

vendorRouter.get("/", authRequired, vendor, requireApprovedVendor, injectVendorId, ctrl.vendorGetReturns);
vendorRouter.get("/:id", authRequired, vendor, requireApprovedVendor, injectVendorId, ctrl.vendorGetReturn);
vendorRouter.post("/:id/create-pickup", authRequired, vendor, requireApprovedVendor, injectVendorId, ctrl.vendorCreatePickup);
vendorRouter.post("/:id/received", authRequired, vendor, requireApprovedVendor, injectVendorId, ctrl.vendorMarkReceived);
vendorRouter.post("/:id/accept", authRequired, vendor, requireApprovedVendor, injectVendorId, ctrl.vendorAccept);
vendorRouter.post(
  "/:id/dispute",
  authRequired,
  vendor,
  requireApprovedVendor,
  injectVendorId,
  upload.array("evidence", 5),
  ctrl.vendorDispute
);

module.exports = { customerReturnRouter: router, adminReturnRouter: adminRouter, vendorReturnRouter: vendorRouter };
