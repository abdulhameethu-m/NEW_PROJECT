const { AuditLog } = require("../models/AuditLog");

class AuditService {
  async log({
    actor,
    action,
    entityType,
    entityId,
    status = "SUCCESS",
    metadata,
    ipAddress,
    userAgent,
  }) {
    return await AuditLog.create({
      actorId: actor?.sub || actor?._id,
      actorRole: actor?.role,
      action,
      entityType,
      entityId,
      status,
      metadata,
      ipAddress,
      userAgent,
    });
  }

  async list({ page = 1, limit = 20, action, actorRole, entityType, status } = {}) {
    const query = {};
    if (action) query.action = action;
    if (actorRole) query.actorRole = actorRole;
    if (entityType) query.entityType = entityType;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actorId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AuditService();
