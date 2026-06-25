const AdminNotification = require("../models/AdminNotification");
const { AppError } = require("../utils/AppError");

function adminId(user = {}) {
  return user._id || user.sub;
}

function buildFilter(user, query = {}) {
  const filter = { adminId: adminId(user) };
  if (query.unreadOnly === "true") filter.isRead = false;
  if (query.priority) filter.priority = query.priority;
  if (query.type) filter.type = query.type;
  return filter;
}

async function assertOwnedNotification(notificationId, user) {
  const notification = await AdminNotification.findById(notificationId);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (String(notification.adminId) !== String(adminId(user))) {
    throw new AppError("Unauthorized", 403);
  }

  return notification;
}

async function listNotifications(user, query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const filter = buildFilter(user, query);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    AdminNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdminNotification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

async function getUnreadCount(user) {
  const unreadCount = await AdminNotification.countDocuments({
    adminId: adminId(user),
    isRead: false,
  });
  return { unreadCount };
}

async function markAsRead(user, notificationId) {
  const notification = await assertOwnedNotification(notificationId, user);
  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();
  return notification;
}

async function markAllAsRead(user) {
  const result = await AdminNotification.updateMany(
    { adminId: adminId(user), isRead: false },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  return { modifiedCount: result.modifiedCount };
}

async function deleteNotification(user, notificationId) {
  const notification = await assertOwnedNotification(notificationId, user);
  await notification.deleteOne();
  return { deleted: true };
}

async function clearAllNotifications(user) {
  const result = await AdminNotification.deleteMany({
    adminId: adminId(user),
  });

  return { deletedCount: result.deletedCount };
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
