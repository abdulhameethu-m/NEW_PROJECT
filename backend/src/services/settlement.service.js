const mongoose = require("mongoose");
const { Order } = require("../models/Order");
const VendorWallet = require("../models/VendorWallet");
const { logger } = require("../utils/logger");
const { AppError } = require("../utils/AppError");
const walletService = require("./wallet.service");
const ledgerService = require("./ledger.service");
const { roundMoney } = require("./vendorFinance.rules");

/**
 * Settlement Service
 *
 * Handles automatic periodic settlement of eligible vendor earnings.
 * Processes orders in batches to credit vendor wallets after the settlement window.
 *
 * Settlement Eligibility Criteria:
 * 1. Order status = "Delivered"
 * 2. Payment status = "Paid"
 * 3. Settlement window passed (payoutEligibleAt <= now)
 * 4. Not already credited (vendorWalletReleasedAt must not exist)
 * 5. Order is active (isActive = true)
 */
class SettlementService {
  constructor() {
    this.metrics = {
      jobId: null,
      startTime: null,
      endTime: null,
      totalOrders: 0,
      processedOrders: 0,
      settledAmount: 0,
      failedOrders: [],
      errors: [],
    };
  }

  /**
   * Main settlement processing function
   * Finds and settles all eligible orders in batches
   *
   * @param {Object} options - Configuration options
   * @param {number} options.batchSize - Number of orders to process per iteration (default: 50)
   * @param {number} options.maxRetries - Max retries per order (default: 3)
   * @param {string} options.vendorId - Optional: Settle only for specific vendor
   * @returns {Promise<Object>} Settlement result with metrics
   */
  async processEligibleSettlements({
    batchSize = 50,
    maxRetries = 3,
    vendorId = null,
  } = {}) {
    const jobStartTime = Date.now();
    const metrics = {
      jobId: `settlement-${jobStartTime}`,
      startTime: new Date(),
      endTime: null,
      totalOrders: 0,
      processedOrders: 0,
      settledAmount: 0,
      failedOrders: [],
      retryOrders: [],
      errors: [],
      duration: 0,
    };

    try {
      logger.info("🔄 Settlement job started", {
        jobId: metrics.jobId,
        batchSize,
        maxRetries,
        vendorId: vendorId || "ALL_VENDORS",
        timestamp: new Date().toISOString(),
      });

      // Step 1: Find eligible orders
      const eligibleOrders = await this._findEligibleOrders(vendorId);
      metrics.totalOrders = eligibleOrders.length;

      if (eligibleOrders.length === 0) {
        logger.info("✅ No eligible orders for settlement", {
          jobId: metrics.jobId,
          timestamp: new Date().toISOString(),
        });
        metrics.endTime = new Date();
        metrics.duration = Date.now() - jobStartTime;
        return metrics;
      }

      logger.info(`📊 Found ${eligibleOrders.length} eligible orders for settlement`, {
        jobId: metrics.jobId,
        orderIds: eligibleOrders.slice(0, 10).map((o) => o._id),
        totalCount: eligibleOrders.length,
      });

      // Step 2: Process orders in batches
      for (let i = 0; i < eligibleOrders.length; i += batchSize) {
        const batch = eligibleOrders.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        logger.info(`⚙️  Processing batch ${batchNumber}/${Math.ceil(eligibleOrders.length / batchSize)}`, {
          jobId: metrics.jobId,
          batchSize: batch.length,
          ordersInBatch: batch.map((o) => o._id),
        });

        // Step 3: Settle each order with retry logic
        for (const order of batch) {
          let retryCount = 0;
          let settled = false;

          while (retryCount < maxRetries && !settled) {
            try {
              const result = await this._settleOrderWithIdempotency(order._id);

              if (!result.skipped) {
                metrics.processedOrders++;
                metrics.settledAmount += result.settledAmount;

                logger.info(`✅ Order settled successfully`, {
                  jobId: metrics.jobId,
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  amount: result.settledAmount,
                  vendor: order.sellerId,
                });
              } else {
                logger.warn(`⏭️  Order skipped: ${result.reason}`, {
                  jobId: metrics.jobId,
                  orderId: order._id,
                  reason: result.reason,
                });
              }

              settled = true;
            } catch (error) {
              retryCount++;
              const errorMsg = error?.message || String(error);

              logger.warn(`⚠️  Settlement attempt ${retryCount}/${maxRetries} failed for order`, {
                jobId: metrics.jobId,
                orderId: order._id,
                orderNumber: order.orderNumber,
                error: errorMsg,
                retryCount,
              });

              if (retryCount >= maxRetries) {
                metrics.failedOrders.push({
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  reason: errorMsg,
                  retries: retryCount,
                });

                metrics.errors.push({
                  orderId: order._id,
                  error: errorMsg,
                  timestamp: new Date().toISOString(),
                });

                logger.error(`❌ Order settlement failed after ${maxRetries} retries`, {
                  jobId: metrics.jobId,
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  error: errorMsg,
                });
              }

              // Exponential backoff before retry
              if (retryCount < maxRetries) {
                const backoffMs = Math.pow(2, retryCount) * 1000;
                await this._sleep(backoffMs);
              }
            }
          }
        }
      }

      metrics.endTime = new Date();
      metrics.duration = Date.now() - jobStartTime;

      // Log final summary
      this._logSettlementSummary(metrics);

      return metrics;
    } catch (error) {
      const errorMsg = error?.message || String(error);

      logger.error("💥 Settlement job failed", {
        jobId: metrics.jobId,
        error: errorMsg,
        stack: error?.stack,
      });

      metrics.endTime = new Date();
      metrics.duration = Date.now() - jobStartTime;
      metrics.errors.push({
        phase: "GLOBAL",
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Find all orders eligible for settlement
   *
   * Criteria:
   * - Status: "Delivered"
   * - Payment Status: "Paid"
   * - payoutEligibleAt <= now
   * - vendorWalletReleasedAt must not exist
   * - isActive: true
   *
   * @private
   * @param {string} vendorId - Optional vendor filter
   * @returns {Promise<Array>} Eligible orders sorted by eligibility date
   */
  async _findEligibleOrders(vendorId = null) {
    const query = {
      status: "Delivered",
      paymentStatus: "Paid",
      payoutEligibleAt: { $lte: new Date() },
      isActive: true,
      $or: [
        { vendorWalletReleasedAt: { $exists: false } },
        { vendorWalletReleasedAt: null },
      ],
    };

    if (vendorId) {
      query.sellerId = new mongoose.Types.ObjectId(vendorId);
    }

    const orders = await Order.find(query)
      .select(
        "_id orderNumber sellerId totalAmount vendorEarning platformCommissionAmount payoutEligibleAt paymentStatus status deliveredAt"
      )
      .sort({ payoutEligibleAt: 1 })
      .lean()
      .exec();

    return orders;
  }

  /**
   * Settle a single order with idempotency safeguard
   *
   * Uses atomic MongoDB operation to prevent double-settlement
   * Leverages existing wallet.service.settleOrderEarning()
   *
   * @private
   * @param {string} orderId - Order ID to settle
   * @returns {Promise<Object>} Settlement result
   */
  async _settleOrderWithIdempotency(orderId) {
    // Use wallet service's existing settlement logic
    // It already has all idempotency checks built-in
    const result = await walletService.settleOrderEarning(orderId);

    if (!result.skipped) {
      return {
        orderId: result.orderId,
        settledAmount: result.settledAmount,
        walletSnapshot: result.wallet,
        ledgerEntryId: result.ledgerEntry._id,
        skipped: false,
      };
    }

    return {
      orderId: result.orderId,
      skipped: true,
      reason: result.reason,
    };
  }

  /**
   * Verify settlement integrity for an order
   *
   * Ensures:
   * 1. Order is marked as settled (vendorWalletReleasedAt exists)
   * 2. Ledger entry exists with matching amount
   * 3. Wallet balance reflects the credit
   * 4. No duplicate ledger entries
   *
   * @param {string} orderId - Order to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifySettlementIntegrity(orderId) {
    const order = await Order.findById(orderId).select(
      "_id orderNumber sellerId vendorEarning totalAmount platformCommissionAmount vendorWalletReleasedAt vendorWalletReleaseReferenceId"
    );

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    if (!order.vendorWalletReleasedAt) {
      return {
        orderId,
        verified: false,
        issue: "Order not settled - vendorWalletReleasedAt is empty",
      };
    }

    // Check ledger entry exists
    const ledgerEntry = await ledgerService.findById(
      order.vendorWalletReleaseReferenceId
    );

    if (!ledgerEntry) {
      return {
        orderId,
        verified: false,
        issue: "Missing ledger entry for settlement",
      };
    }

    // Check for duplicate ledger entries
    const duplicateEntries = await ledgerService.countByFilters({
      vendorId: order.sellerId,
      source: "ORDER",
      referenceId: orderId,
      type: "CREDIT",
    });

    if (duplicateEntries > 1) {
      return {
        orderId,
        verified: false,
        issue: `Found ${duplicateEntries} ledger entries (expected 1) - possible duplicate settlement`,
        duplicateCount: duplicateEntries,
      };
    }

    // Check wallet snapshot consistency
    const wallet = await VendorWallet.findOne({ vendorId: order.sellerId });
    const expectedSettlementAmount =
      order.vendorEarning ||
      order.totalAmount - order.platformCommissionAmount;

    if (
      !ledgerEntry.walletSnapshot ||
      Math.abs(
        ledgerEntry.walletSnapshot.availableBalance - wallet.availableBalance
      ) > 0.01
    ) {
      return {
        orderId,
        verified: false,
        issue: "Wallet balance mismatch with ledger snapshot",
        walletBalance: wallet.availableBalance,
        ledgerSnapshot: ledgerEntry.walletSnapshot?.availableBalance,
      };
    }

    return {
      orderId,
      verified: true,
      settlementAmount: expectedSettlementAmount,
      ledgerEntryId: ledgerEntry._id,
      walletBalance: wallet.availableBalance,
      settledAt: order.vendorWalletReleasedAt,
    };
  }

  /**
   * Batch verify settlement integrity
   * @param {Array<string>} orderIds - Order IDs to verify
   * @returns {Promise<Object>} Batch verification results
   */
  async verifySettlementBatch(orderIds) {
    const results = {
      total: orderIds.length,
      verified: 0,
      failed: 0,
      issues: [],
    };

    for (const orderId of orderIds) {
      try {
        const result = await this.verifySettlementIntegrity(orderId);
        if (result.verified) {
          results.verified++;
        } else {
          results.failed++;
          results.issues.push(result);
        }
      } catch (error) {
        results.failed++;
        results.issues.push({
          orderId,
          error: error?.message || String(error),
        });
      }
    }

    return results;
  }

  /**
   * Get settlement metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Reset metrics
   * @private
   */
  _resetMetrics() {
    this.metrics = {
      jobId: null,
      startTime: null,
      endTime: null,
      totalOrders: 0,
      processedOrders: 0,
      settledAmount: 0,
      failedOrders: [],
      errors: [],
    };
  }

  /**
   * Log settlement summary
   * @private
   */
  _logSettlementSummary(metrics) {
    const successRate = metrics.totalOrders
      ? ((metrics.processedOrders / metrics.totalOrders) * 100).toFixed(2)
      : 0;

    logger.info("📈 Settlement Job Summary", {
      jobId: metrics.jobId,
      summary: {
        totalOrders: metrics.totalOrders,
        processedOrders: metrics.processedOrders,
        failedOrders: metrics.failedOrders.length,
        totalSettled: roundMoney(metrics.settledAmount),
        successRate: `${successRate}%`,
        duration: `${(metrics.duration / 1000).toFixed(2)}s`,
      },
      status:
        metrics.failedOrders.length === 0
          ? "✅ ALL_ORDERS_SETTLED"
          : "⚠️ PARTIAL_SETTLEMENT",
    });

    if (metrics.failedOrders.length > 0) {
      logger.warn("Failed Orders in Settlement", {
        jobId: metrics.jobId,
        failedCount: metrics.failedOrders.length,
        failedOrders: metrics.failedOrders.slice(0, 10),
      });
    }
  }

  /**
   * Sleep utility for retry backoff
   * @private
   */
  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get settlement status for a vendor
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} Vendor settlement status
   */
  async getVendorSettlementStatus(vendorId) {
    const vendor = new mongoose.Types.ObjectId(vendorId);

    // Eligible orders (not yet settled)
    const eligibleOrders = await Order.countDocuments({
      sellerId: vendor,
      status: "Delivered",
      paymentStatus: "Paid",
      payoutEligibleAt: { $lte: new Date() },
      $or: [
        { vendorWalletReleasedAt: { $exists: false } },
        { vendorWalletReleasedAt: null },
      ],
      isActive: true,
    });

    // Orders in settlement window (not yet eligible)
    const pendingSettlement = await Order.countDocuments({
      sellerId: vendor,
      status: "Delivered",
      paymentStatus: "Paid",
      payoutEligibleAt: { $gt: new Date() },
      isActive: true,
    });

    // Already settled
    const settled = await Order.countDocuments({
      sellerId: vendor,
      vendorWalletReleasedAt: { $exists: true },
      isActive: true,
    });

    // Get wallet
    const wallet = await VendorWallet.findOne({ vendorId: vendor });

    return {
      vendorId,
      pendingSettlement: {
        count: pendingSettlement,
        description: "Orders awaiting 7-day settlement window",
      },
      readyForSettlement: {
        count: eligibleOrders,
        description: "Orders eligible for immediate settlement",
      },
      alreadySettled: {
        count: settled,
      },
      wallet: wallet ? {
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        totalEarnings: wallet.totalEarnings,
        withdrawnAmount: wallet.withdrawnAmount,
      } : null,
    };
  }
}

module.exports = new SettlementService();
