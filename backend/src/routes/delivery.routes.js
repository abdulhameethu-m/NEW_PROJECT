const express = require("express");
const { authRequired } = require("../middleware/auth");
const deliveryController = require("../controllers/delivery.controller");

const router = express.Router();

router.use(authRequired);

router.post("/create-shipment", deliveryController.createShipment);

module.exports = router;