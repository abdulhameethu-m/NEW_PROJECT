const cron = require("node-cron");
const { logger } = require("../utils/logger");
const commissionService = require("../modules/commission/service");
const analyticsAggregator = require("../modules/analytics/service");
const influencerCommerceService = require("../modules/influencerCommerce/service");
const trackingService = require("../modules/tracking/service");
const { InfluencerProfile } = require("../modules/influencer/model");
const { Reel } = require("../modules/reel/model");
const { TrackingSession } = require("../modules/tracking/model");
const { Order } = require("../models/Order");
const campaignFinanceService = require("../modules/campaignFinance/service");
const campaignRefundService = require("../services/campaign-refund.service");
const campaignExecutionService = require("../modules/campaign/executionService");

let tasks = [];

async function aggregateInfluencerMetrics() {
  const profiles = await InfluencerProfile.find({}).lean();
  for (const profile of profiles) {
    const [reels, sessions, orders] = await Promise.all([
      Reel.find({ influencerId: profile._id }).lean(),
      TrackingSession.find({ influencerId: profile._id }).lean(),
      Order.find({ "attribution.influencerId": profile._id, status: "Delivered", paymentStatus: "Paid" }).lean(),
    ]);

    const nextStats = {
      views: reels.reduce((sum, reel) => sum + Number(reel.metrics?.views || 0), 0),
      clicks: reels.reduce((sum, reel) => sum + Number(reel.metrics?.clicks || 0), 0) + sessions.length,
      sales: orders.length,
      revenue: orders.reduce((sum, order) => sum + Number(order.attribution?.commission?.influencerShare || 0), 0),
    };

    await InfluencerProfile.updateOne({ _id: profile._id }, { $set: { stats: nextStats } });
  }
}

function schedule(cronExpression, taskName, handler) {
  const task = cron.schedule(cronExpression, async () => {
    try {
      await handler();
      logger.info("Influencer commerce cron completed", { source: "influencer-commerce.job", taskName });
    } catch (error) {
      logger.error("Influencer commerce cron failed", {
        source: "influencer-commerce.job",
        taskName,
        error: error?.message,
      });
    }
  });
  tasks.push(task);
}

async function initializeInfluencerCommerceJobs() {
  commissionService.registerEventHandlers();
  analyticsAggregator.registerEventHandlers();

  schedule(process.env.INFLUENCER_SETTLEMENT_SCHEDULE || "15 2 * * *", "commission-settlement", async () => {
    await commissionService.settleEligibleOrders();
  });

  schedule(process.env.INFLUENCER_TRACKING_CLEANUP_SCHEDULE || "0 * * * *", "tracking-cleanup", async () => {
    await trackingService.cleanupExpiredSessions();
  });

  schedule(process.env.AFFILIATE_LINK_EXPIRY_SCHEDULE || "0 * * * *", "affiliate-link-expiry", async () => {
    await commissionService.expireCampaignAffiliateLinks();
  });

  schedule(process.env.INFLUENCER_METRICS_SCHEDULE || "30 2 * * *", "metrics-aggregation", async () => {
    await aggregateInfluencerMetrics();
  });

  schedule(process.env.CAMPAIGN_FINANCE_SYNC_SCHEDULE || "10 * * * *", "campaign-finance-sync", async () => {
    await campaignFinanceService.syncAll();
  });

  schedule(process.env.ANALYTICS_REBUILD_SCHEDULE || "0 * * * *", "analytics-rebuild", async () => {
    await analyticsAggregator.rebuildAll();
  });

  schedule(process.env.ANALYTICS_VALIDATION_SCHEDULE || "*/30 * * * *", "analytics-validation", async () => {
    await analyticsAggregator.auditPipeline();
  });

  schedule(process.env.REVENUE_RECONCILIATION_SCHEDULE || "20 1 * * *", "revenue-reconciliation", async () => {
    await analyticsAggregator.rebuildAll();
  });

  schedule(process.env.COMMISSION_RECONCILIATION_SCHEDULE || "35 1 * * *", "commission-reconciliation", async () => {
    await analyticsAggregator.rebuildAll({ paymentModel: "commission" });
  });

  schedule(process.env.ESCROW_RECONCILIATION_SCHEDULE || "50 1 * * *", "escrow-reconciliation", async () => {
    await analyticsAggregator.auditPipeline();
  });

  schedule(process.env.ESCROW_REFUND_SCAN_SCHEDULE || "45 1 * * *", "escrow-refund-scan", async () => {
    await campaignRefundService.markExpiredCampaignsRefundEligible();
  });

  schedule(process.env.CAMPAIGN_SCHEDULING_SCAN_SCHEDULE || "0 * * * *", "campaign-scheduling-scan", async () => {
    await campaignExecutionService.runScheduledMaintenance();
    await campaignRefundService.markExpiredCampaignsRefundEligible();
    await commissionService.expireCampaignAffiliateLinks();
  });

  schedule(process.env.INFLUENCER_SUBSCRIPTION_EXPIRY_SCHEDULE || "5 0 * * *", "subscription-expiry", async () => {
    await influencerCommerceService.expireSubscriptions();
  });

  return {
    initialized: true,
    taskCount: tasks.length,
  };
}

async function shutdownInfluencerCommerceJobs() {
  for (const task of tasks) {
    task.stop();
  }
  tasks = [];
}

module.exports = {
  initializeInfluencerCommerceJobs,
  shutdownInfluencerCommerceJobs,
};
