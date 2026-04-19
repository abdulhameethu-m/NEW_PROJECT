const express = require("express");
const { authRequired } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const checkoutController = require("../controllers/checkout.controller");
const {
  checkoutPrepareSchema,
  checkoutCreateSchema,
} = require("../utils/validators/checkout.validation");

const router = express.Router();

router.use(authRequired);

router.post("/prepare", validate(checkoutPrepareSchema), checkoutController.prepare);
router.post("/create", validate(checkoutCreateSchema), checkoutController.createOrder);

module.exports = router;

