const express = require("express");
const router = express.Router();
const albumController = require("../controllers/album.controller");
const { adminWorkspaceAuthRequired } = require("../middleware/adminAccess");

// All media albums routes require admin workspace access
router.use(adminWorkspaceAuthRequired);

router.get("/", albumController.listAlbums);
router.post("/", albumController.createAlbum);
router.get("/:id", albumController.getAlbum);
router.put("/:id", albumController.updateAlbum);
router.delete("/:id", albumController.deleteAlbum);

module.exports = router;
