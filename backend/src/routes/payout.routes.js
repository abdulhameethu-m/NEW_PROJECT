const express = require("express");
const { authRequired } = require("../middleware/auth");
const payoutController = require("../controllers/payout.controller");

const router = express.Router();

router.use(authRequired);

router.post("/create-account", payoutController.createAccount);
router.post("/process", payoutController.processPayout);

module.exports = router;