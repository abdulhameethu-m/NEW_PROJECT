const express = require("express");
const { authRequired } = require("../middleware/auth");
const wishlistController = require("../controllers/wishlist.controller");

const router = express.Router();

router.use(authRequired);

router.get("/", wishlistController.list);
router.get("/:productId/status", wishlistController.status);
router.post("/:productId", wishlistController.add);
router.delete("/:productId", wishlistController.remove);

module.exports = router;
