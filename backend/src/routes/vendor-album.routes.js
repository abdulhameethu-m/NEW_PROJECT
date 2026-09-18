const { Router } = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const albumController = require("../controllers/album.controller");

const router = Router();

// All vendor media album endpoints require vendor authentication
router.use(authRequired, requireRole("vendor"));

router.get("/",       albumController.listAlbums);
router.post("/",      albumController.createAlbum);
router.get("/:id",    albumController.getAlbum);
router.put("/:id",    albumController.updateAlbum);
router.delete("/:id", albumController.deleteAlbum);

module.exports = router;
