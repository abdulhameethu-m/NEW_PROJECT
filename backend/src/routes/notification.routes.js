const express = require("express");
const { notificationAuthRequired } = require("../middleware/notificationAuth");
const notificationController = require("../controllers/notification.controller");

const router = express.Router();

router.use(notificationAuthRequired);
router.get("/summary", notificationController.getSummary);
router.get("/", notificationController.listNotifications);
router.post("/read", notificationController.markNotificationsRead);

module.exports = router;
