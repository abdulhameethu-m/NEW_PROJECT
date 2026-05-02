const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const notificationService = require("../services/notification.service");

const getSummary = asyncHandler(async (req, res) => {
  return ok(res, await notificationService.getSummary(req.notificationActor), "Notification summary retrieved");
});

const listNotifications = asyncHandler(async (req, res) => {
  return ok(res, await notificationService.listNotifications(req.notificationActor, req.query), "Notifications retrieved");
});

const markNotificationsRead = asyncHandler(async (req, res) => {
  return ok(res, await notificationService.markRead(req.notificationActor, req.body || {}), "Notifications marked as read");
});

module.exports = {
  getSummary,
  listNotifications,
  markNotificationsRead,
};
