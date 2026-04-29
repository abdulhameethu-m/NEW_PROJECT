const mongoose = require("mongoose");
const { logger } = require("../utils/logger");

/**
 * Settlement Metrics Schema
 * Tracks settlement job execution history
 */
const settlementMetricsSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["bull", "cron"],
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: Date,
    duration: Number, // in milliseconds
    totalOrders: { type: Number, default: 0 },
    processedOrders: { type: Number, default: 0 },
    settledAmount: { type: Number, default: 0 },
    failedOrders: {
      type: Number,
      default: 0,
    },
    failedOrdersList: [
      {
        orderId: mongoose.Schema.Types.ObjectId,
        orderNumber: String,
        reason: String,
        retries: Number,
      },
    ],
    errors: [
      {
        phase: String,
        error: String,
        orderId: mongoose.Schema.Types.ObjectId,
        timestamp: Date,
      },
    ],
    status: {
      type: String,
      enum: ["running", "completed", "failed", "partial"],
      default: "running",
      index: true,
    },
    successRate: Number, // percentage
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

// Create indexes for common queries
settlementMetricsSchema.index({ startTime: -1 });
settlementMetricsSchema.index({ status: 1, startTime: -1 });
settlementMetricsSchema.index({ createdAt: -1 });

const SettlementMetrics =
  mongoose.models.SettlementMetrics ||
  mongoose.model("SettlementMetrics", settlementMetricsSchema);

/**
 * Settlement Metrics Service
 * Records and retrieves settlement job metrics
 */
class SettlementMetricsService {
  /**
   * Record settlement job execution
   * @param {Object} jobMetrics - Metrics from settlement job
   * @returns {Promise<Object>} Recorded metrics
   */
  async recordJobExecution(jobMetrics) {
    try {
      const {
        jobId,
        startTime,
        endTime,
        duration,
        totalOrders,
        processedOrders,
        settledAmount,
        failedOrders = [],
        errors = [],
        mode = "cron",
      } = jobMetrics;

      const successRate =
        totalOrders > 0 ? ((processedOrders / totalOrders) * 100).toFixed(2) : 0;

      const status =
        failedOrders.length === 0
          ? "completed"
          : processedOrders > 0
            ? "partial"
            : "failed";

      const metrics = new SettlementMetrics({
        jobId,
        mode,
        startTime,
        endTime,
        duration,
        totalOrders,
        processedOrders,
        settledAmount,
        failedOrders: failedOrders.length,
        failedOrdersList: failedOrders.slice(0, 100), // Store first 100 failed orders
        errors: errors.slice(0, 50), // Store first 50 errors
        status,
        successRate: Number(successRate),
      });

      const saved = await metrics.save();

      logger.info("📊 Settlement metrics recorded", {
        jobId,
        status,
        processedOrders,
        totalOrders,
        successRate,
      });

      return saved;
    } catch (error) {
      logger.error("Failed to record settlement metrics", {
        error: error?.message,
      });
      throw error;
    }
  }

  /**
   * Get latest settlement metrics
   * @param {number} limit - Number of recent jobs to fetch
   * @returns {Promise<Array>} Latest settlement jobs
   */
  async getLatestMetrics(limit = 10) {
    return await SettlementMetrics.find()
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get settlement metrics for date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Metrics within date range
   */
  async getMetricsForDateRange(startDate, endDate) {
    return await SettlementMetrics.find({
      startTime: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ startTime: -1 })
      .lean();
  }

  /**
   * Get settlement statistics
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} Settlement statistics
   */
  async getSettlementStatistics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await SettlementMetrics.find({
      startTime: { $gte: startDate },
    }).lean();

    const stats = {
      period: `last ${days} days`,
      totalJobs: metrics.length,
      successfulJobs: metrics.filter((m) => m.status === "completed").length,
      partialJobs: metrics.filter((m) => m.status === "partial").length,
      failedJobs: metrics.filter((m) => m.status === "failed").length,
      totalOrdersProcessed: 0,
      totalOrdersSettled: 0,
      totalSettledAmount: 0,
      avgProcessingTime: 0,
      avgOrdersPerJob: 0,
      failureRate: 0,
      distributionByMode: {},
    };

    let totalDuration = 0;

    for (const metric of metrics) {
      stats.totalOrdersProcessed += metric.totalOrders;
      stats.totalOrdersSettled += metric.processedOrders;
      stats.totalSettledAmount += metric.settledAmount;
      totalDuration += metric.duration || 0;

      // Track by mode
      if (!stats.distributionByMode[metric.mode]) {
        stats.distributionByMode[metric.mode] = { count: 0, orders: 0 };
      }
      stats.distributionByMode[metric.mode].count++;
      stats.distributionByMode[metric.mode].orders += metric.processedOrders;
    }

    if (metrics.length > 0) {
      stats.avgProcessingTime = (totalDuration / metrics.length / 1000).toFixed(
        2
      );
      stats.avgOrdersPerJob = (
        stats.totalOrdersProcessed / metrics.length
      ).toFixed(2);
      stats.failureRate = (
        (stats.failedJobs / metrics.length) *
        100
      ).toFixed(2);
    }

    return stats;
  }

  /**
   * Get failed orders from recent settlements
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Failed orders
   */
  async getRecentFailures(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const jobs = await SettlementMetrics.find(
      {
        startTime: { $gte: startDate },
        failedOrdersList: { $exists: true, $ne: [] },
      },
      { failedOrdersList: 1, jobId: 1, startTime: 1 }
    ).lean();

    const failures = [];
    for (const job of jobs) {
      for (const failed of job.failedOrdersList) {
        failures.push({
          jobId: job.jobId,
          jobStartTime: job.startTime,
          ...failed,
        });
      }
    }

    return failures.sort((a, b) => b.jobStartTime - a.jobStartTime);
  }

  /**
   * Get error breakdown
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Error statistics
   */
  async getErrorBreakdown(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const jobs = await SettlementMetrics.find({
      startTime: { $gte: startDate },
    });

    const errorBreakdown = {};

    for (const job of jobs) {
      if (job.errors && job.errors.length > 0) {
        for (const error of job.errors) {
          const key = error.phase || "UNKNOWN";
          if (!errorBreakdown[key]) {
            errorBreakdown[key] = {
              count: 0,
              details: [],
            };
          }
          errorBreakdown[key].count++;
          errorBreakdown[key].details.push({
            jobId: job.jobId,
            error: error.error,
            timestamp: error.timestamp,
          });
        }
      }
    }

    return errorBreakdown;
  }

  /**
   * Get job execution history
   * @param {string} jobId - Job ID to get details for
   * @returns {Promise<Object>} Detailed job metrics
   */
  async getJobDetails(jobId) {
    return await SettlementMetrics.findOne({ jobId }).lean();
  }

  /**
   * Clean old metrics (data retention)
   * @param {number} daysToKeep - Keep metrics from last N days (default: 90)
   * @returns {Promise<Object>} Deletion result
   */
  async cleanOldMetrics(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await SettlementMetrics.deleteMany({
      startTime: { $lt: cutoffDate },
    });

    logger.info("🗑️  Cleaned old settlement metrics", {
      deletedCount: result.deletedCount,
      beforeDate: cutoffDate,
    });

    return result;
  }
}

module.exports = new SettlementMetricsService();
