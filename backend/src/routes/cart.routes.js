const express = require("express");
const { authRequired } = require("../middleware/auth");
const cartController = require("../controllers/cart.controller");

const router = express.Router();

router.use(authRequired);

router.post("/add", cartController.add);
router.get("/", cartController.getCart);
router.patch("/update", cartController.update);
router.delete("/remove", cartController.remove);

// Optional convenience endpoint
router.delete("/clear", cartController.clear);

module.exports = router;

