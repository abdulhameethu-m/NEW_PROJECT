const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const ctrl = require("../controllers/return-request.controller");

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

adminRouter.get("/stats", authRequired, admin, ctrl.adminGetStats);
adminRouter.get("/disputes", authRequired, admin, ctrl.adminGetDisputes);
adminRouter.get("/", authRequired, admin, ctrl.adminListReturns);
adminRouter.get("/:id", authRequired, admin, ctrl.adminGetReturn);
adminRouter.post("/:id/approve", authRequired, admin, ctrl.adminApproveReturn);
adminRouter.post("/:id/reject", authRequired, admin, ctrl.adminRejectReturn);
adminRouter.post("/:id/resolve-dispute", authRequired, admin, ctrl.adminResolveDispute);

// ── Vendor Routes ─────────────────────────────────────────────
// GET    /api/vendor/returns               — list vendor's approved returns
// GET    /api/vendor/returns/:id           — single vendor return
// POST   /api/vendor/returns/:id/received  — mark received
// POST   /api/vendor/returns/:id/accept    — accept return
// POST   /api/vendor/returns/:id/dispute   — dispute return (with evidence upload)

const vendorRouter = express.Router();

vendorRouter.get("/", authRequired, vendor, ctrl.vendorGetReturns);
vendorRouter.get("/:id", authRequired, vendor, ctrl.vendorGetReturn);
vendorRouter.post("/:id/received", authRequired, vendor, ctrl.vendorMarkReceived);
vendorRouter.post("/:id/accept", authRequired, vendor, ctrl.vendorAccept);
vendorRouter.post(
  "/:id/dispute",
  authRequired,
  vendor,
  upload.array("evidence", 5),
  ctrl.vendorDispute
);

module.exports = { customerReturnRouter: router, adminReturnRouter: adminRouter, vendorReturnRouter: vendorRouter };
