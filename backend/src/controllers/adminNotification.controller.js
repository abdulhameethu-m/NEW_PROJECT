const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const AdminNotification = require("../models/AdminNotification");

/**
 * Get notifications for admin with pagination
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false, priority, type } = req.query;

  const filter = { adminId: req.user._id };

  if (unreadOnly === "true") {
    filter.isRead = false;
  }
  if (priority) filter.priority = priority;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    AdminNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AdminNotification.countDocuments(filter),
  ]);

  return ok(res, {
    notifications,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get unread notification count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await AdminNotification.countDocuments({
    adminId: req.user._id,
    isRead: false,
  });

  return ok(res, { unreadCount });
});

/**
 * Mark notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await AdminNotification.findById(id);

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (notification.adminId.toString() !== req.user._id.toString()) {
    throw new AppError("Unauthorized", 403);
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return ok(res, notification);
});

/**
 * Mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await AdminNotification.updateMany(
    { adminId: req.user._id, isRead: false },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  return ok(res, { modifiedCount: result.modifiedCount });
});

/**
 * Delete notification
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await AdminNotification.findById(id);

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (notification.adminId.toString() !== req.user._id.toString()) {
    throw new AppError("Unauthorized", 403);
  }

  await notification.deleteOne();

  return ok(res, { deleted: true });
});

/**
 * Clear all notifications
 */
const clearAllNotifications = asyncHandler(async (req, res) => {
  const result = await AdminNotification.deleteMany({
    adminId: req.user._id,
  });

  return ok(res, { deletedCount: result.deletedCount });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
