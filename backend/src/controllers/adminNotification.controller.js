const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const adminNotificationService = require("../services/adminNotification.service");

/**
 * Get notifications for admin with pagination
 */
const getNotifications = asyncHandler(async (req, res) => {
  return ok(res, await adminNotificationService.listNotifications(req.user, req.query));
});

/**
 * Get unread notification count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  return ok(res, await adminNotificationService.getUnreadCount(req.user));
});

/**
 * Mark notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  return ok(res, await adminNotificationService.markAsRead(req.user, req.params.id));
});

/**
 * Mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  return ok(res, await adminNotificationService.markAllAsRead(req.user));
});

/**
 * Delete notification
 */
const deleteNotification = asyncHandler(async (req, res) => {
  return ok(res, await adminNotificationService.deleteNotification(req.user, req.params.id));
});

/**
 * Clear all notifications
 */
const clearAllNotifications = asyncHandler(async (req, res) => {
  return ok(res, await adminNotificationService.clearAllNotifications(req.user));
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
