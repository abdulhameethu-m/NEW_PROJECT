const express = require("express");
const productModuleController = require("../controllers/product-module.controller");

const router = express.Router();

router.get("/", productModuleController.getProductModules);

module.exports = router;
