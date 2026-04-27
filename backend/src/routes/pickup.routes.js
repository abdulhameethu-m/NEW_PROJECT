const express = require("express");
const { body } = require("express-validator");
const { authRequired, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { requireVendorModule, requireVendorPermission } = require("../middleware/vendorModuleAccess");
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");
const pickupController = require("../controllers/pickup.controller");

const router = express.Router();

router.get(
  "/vendor/pickups/queue",
  authRequired,
  requireRole("vendor"),
  requireVendorModule("delivery"),
  pickupController.getVendorPickupQueue
);

router.get(
  "/vendor/pickups",
  authRequired,
  requireRole("vendor"),
  requireVendorModule("delivery"),
  pickupController.getVendorPickupBatches
);

router.post(
  "/vendor/pickups/schedule",
  authRequired,
  requireRole("vendor"),
  requireVendorPermission("delivery.update"),
  validate([
    body("shipmentIds")
      .isArray({ min: 1 })
      .withMessage("shipmentIds must be a non-empty array"),
    body("shipmentIds.*")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("shipmentIds must contain valid shipment ids"),
  ]),
  pickupController.scheduleVendorPickup
);

router.get(
  "/admin/pickups",
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("orders.read"),
  pickupController.getAdminPickups
);

router.post(
  "/admin/pickups/schedule",
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("orders.update"),
  validate([
    body("shipmentIds")
      .isArray({ min: 1 })
      .withMessage("shipmentIds must be a non-empty array"),
    body("shipmentIds.*")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("shipmentIds must contain valid shipment ids"),
    body("vendorId")
      .optional()
      .isMongoId()
      .withMessage("vendorId must be a valid vendor id"),
  ]),
  pickupController.scheduleAdminPickup
);

module.exports = router;
