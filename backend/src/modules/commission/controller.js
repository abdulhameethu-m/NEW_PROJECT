const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const commissionService = require("./service");

const overview = asyncHandler(async (req, res) => ok(res, await commissionService.getOverview(), "Commission overview loaded"));
const listRules = asyncHandler(async (req, res) => ok(res, await commissionService.listRules(req.query), "Commission rules loaded"));
const createRule = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.createRule(req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Commission rule created"
  )
);
const updateRule = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.updateRule(req.params.ruleId, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Commission rule updated"
  )
);
const approveRule = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.approveRule(req.params.ruleId, req.user, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Commission rule approved"
  )
);
const deactivateRule = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.deactivateRule(req.params.ruleId, req.user, req.body?.reason || "", {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Commission rule deactivated"
  )
);
const simulate = asyncHandler(async (req, res) => ok(res, await commissionService.simulateCommission(req.body), "Commission simulation complete"));
const dashboard = asyncHandler(async (req, res) => ok(res, await commissionService.getAdminDashboard(req.query), "Commission dashboard loaded"));
const createSettlement = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.createSettlement(req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Settlement batch created"
  )
);
const listSettlements = asyncHandler(async (req, res) => ok(res, await commissionService.listSettlements(req.query), "Commission settlements loaded"));
const approveSettlement = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.approveSettlement(req.params.settlementId, req.user, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Settlement approved"
  )
);
const preparePayoutBatch = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.preparePayoutBatch(req.params.settlementId, req.user, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Payout batch prepared"
  )
);
const auditLogs = asyncHandler(async (req, res) => ok(res, await commissionService.listAuditLogs(req.query), "Commission audit logs loaded"));

module.exports = {
  overview,
  listRules,
  createRule,
  updateRule,
  approveRule,
  deactivateRule,
  simulate,
  dashboard,
  createSettlement,
  listSettlements,
  approveSettlement,
  preparePayoutBatch,
  auditLogs,
};
