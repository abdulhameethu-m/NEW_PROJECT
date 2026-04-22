const express = require("express");
const subcategoryController = require("../controllers/subcategory.controller");

const router = express.Router();

router.get("/", subcategoryController.getActiveSubcategories);

module.exports = router;
