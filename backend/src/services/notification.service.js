const { ADMIN_ROLES, normalizeRole } = require("../utils/adminPermissions");

class NotificationService {
  resolveRoleFromAuthUser(user = {}) {
    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole === "vendor") return "VENDOR";
    if (normalizedRole === "influencer") return "INFLUENCER";
    if (normalizedRole === "staff") return "STAFF";
    if (ADMIN_ROLES.includes(normalizedRole)) return "ADMIN";
    return null;
  }

  async createNotification() {
    return null;
  }

  async createNotifications() {
    return [];
  }

  async notifyAdmins() {
    return [];
  }

  async notifyStaff() {
    return [];
  }

  async notifyVendorUser() {
    return [];
  }

  async notifyVendorAndOperations() {
    return [];
  }

  async notifyOperations() {
    return [];
  }

  buildActorFilter() {
    return {};
  }

  async getSummary() {
    return {
      total: 0,
      unreadCount: 0,
      modules: {},
      subModules: {},
    };
  }

  async listNotifications(_actor, query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

    return {
      notifications: [],
      unreadCount: 0,
      totalUnread: 0,
      total: 0,
      modules: {},
      subModules: {},
      summary: await this.getSummary(),
      pagination: {
        total: 0,
        page,
        limit,
        pages: 0,
      },
    };
  }

  async markRead() {
    return {
      matched: 0,
      modified: 0,
      summary: await this.getSummary(),
    };
  }
}

module.exports = new NotificationService();
