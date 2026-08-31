const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");
const { requireVendorModule } = require("../middleware/vendorModuleAccess");
const { upload } = require("../middleware/upload");
const { validate } = require("../middleware/validate");
const invoiceController = require("../controllers/invoice.controller");
const { invoiceSettingsSchema, invoiceMetadataSchema } = require("../utils/validators/invoice.validation");
const router = express.Router();
router.get("/settings", adminWorkspaceAuthRequired, requireWorkspacePermission("invoices.read"), invoiceController.getSettings);
router.put(
  "/settings",
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("invoices.update"),
  upload.fields([{ name: "logo", maxCount: 1 }, { name: "signature", maxCount: 1 }]),
  validate(invoiceSettingsSchema),
  invoiceController.updateSettings
);
router.get("/admin/orders", adminWorkspaceAuthRequired, requireWorkspacePermission("invoices.read"), invoiceController.listAdminInvoices);
router.get("/admin/orders/:orderId", adminWorkspaceAuthRequired, requireWorkspacePermission("invoices.read"), invoiceController.getAdminInvoice);
router.put(
  "/admin/orders/:orderId/metadata",
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("invoices.read"),
  validate(invoiceMetadataSchema),
  invoiceController.updateInvoiceMetadata
);
router.get("/admin/orders/:orderId/audit", adminWorkspaceAuthRequired, requireWorkspacePermission("invoices.read"), invoiceController.getInvoiceAuditHistory);
router.get("/admin/orders/:orderId/pdf", adminWorkspaceAuthRequired, requireWorkspacePermission("invoices.read"), invoiceController.downloadAdminInvoice);
router.get("/vendor/orders", authRequired, requireRole("vendor"), requireVendorModule("orders"), invoiceController.listVendorInvoices);
router.get("/vendor/orders/:orderId", authRequired, requireRole("vendor"), requireVendorModule("orders"), invoiceController.getVendorInvoice);
router.get("/vendor/orders/:orderId/pdf", authRequired, requireRole("vendor"), requireVendorModule("orders"), invoiceController.downloadVendorInvoice);
router.get("/user/orders/:orderId", authRequired, requireRole("user"), invoiceController.getUserInvoice);
router.get("/user/orders/:orderId/pdf", authRequired, requireRole("user"), invoiceController.downloadUserInvoice);
module.exports = router;