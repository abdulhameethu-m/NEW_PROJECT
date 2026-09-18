const { Router } = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const {
  listAssets,
  getMetrics,
  getAsset,
  getUsage,
  reconcileAsset,
  deleteAsset,
  uploadAsset,
  toggleFavorite,
  bulkAction,
} = require("../controllers/media.controller");
const { upload } = require("../middleware/upload");

const router = Router();

// All vendor media registry endpoints require vendor authentication
router.use(authRequired, requireRole("vendor"));

router.get("/metrics",        getMetrics);
router.get("/",               listAssets);
router.post("/upload",        upload.array("files", 20), uploadAsset);
router.get("/:id",            getAsset);
router.get("/:id/usage",      getUsage);
router.post("/:id/reconcile", reconcileAsset);
router.put("/:id/favorite",   toggleFavorite);
router.post("/bulk-action",   bulkAction);
router.delete("/:id",         deleteAsset);

module.exports = router;
