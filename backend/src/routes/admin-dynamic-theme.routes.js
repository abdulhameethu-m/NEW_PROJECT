const express = require("express");
const dynamicThemeController = require("../controllers/dynamic-theme.controller");
const { requireWorkspacePermission } = require("../middleware/adminAccess");

const router = express.Router();

// All these routes will be prefixed with /api/admin/themes (or similar) when mounted in admin.routes.js
// and will already have adminWorkspaceAuthRequired applied

router.get("/", requireWorkspacePermission("settings.read"), dynamicThemeController.listThemes);
router.post("/", requireWorkspacePermission("settings.update"), express.json(), dynamicThemeController.createTheme);
router.get("/:id", requireWorkspacePermission("settings.read"), dynamicThemeController.getTheme);
router.put("/:id", requireWorkspacePermission("settings.update"), express.json(), dynamicThemeController.updateTheme);
router.delete("/:id", requireWorkspacePermission("settings.update"), dynamicThemeController.deleteTheme);
router.patch("/:id/activate", requireWorkspacePermission("settings.update"), dynamicThemeController.activateTheme);
router.patch("/:id/default", requireWorkspacePermission("settings.update"), dynamicThemeController.setDefaultTheme);

module.exports = router;
