const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/adminNotification.controller");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/validate");

// All routes require admin authentication
router.use(authRequired);
router.use(requireRole("admin", "super_admin", "support_admin", "finance_admin"));

/**
 * GET /api/admin/notifications
 * Get admin notifications with pagination
 */
router.get("/", notificationController.getNotifications);

/**
 * GET /api/admin/notifications/unread/count
 * Get unread notification count
 */
router.get("/unread/count", notificationController.getUnreadCount);

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark notification as read
 */
router.patch("/:id/read", notificationController.markAsRead);

/**
 * PATCH /api/admin/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch("/mark-all-read", notificationController.markAllAsRead);

/**
 * DELETE /api/admin/notifications/:id
 * Delete notification
 */
router.delete("/:id", notificationController.deleteNotification);

/**
 * DELETE /api/admin/notifications/clear-all
 * Clear all notifications
 */
router.delete("/clear-all", notificationController.clearAllNotifications);

module.exports = router;
