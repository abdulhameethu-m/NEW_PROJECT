const express = require("express");
const attributeController = require("../controllers/attribute.controller");

const router = express.Router();

router.get("/", attributeController.getAttributes);

module.exports = router;
