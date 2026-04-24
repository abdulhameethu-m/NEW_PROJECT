const express = require("express");
const filterController = require("../controllers/filter.controller");

const router = express.Router();

router.get("/", filterController.getFilters);

module.exports = router;
