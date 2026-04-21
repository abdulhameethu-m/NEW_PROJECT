const { Order } = require("../models/Order");
const { normalizeDateRange, applyDateRange } = require("../utils/dateRange");
const { buildExportFile } = require("./export.service");

function buildRevenueMatch({ startDate, endDate } = {}) {
  const match = {
    isActive: true,
    paymentStatus: "Paid",
    status: "Delivered",
  };
  applyDateRange(match, normalizeDateRange({ startDate, endDate }));
  return match;
}

function buildRevenueBasePipeline({ startDate, endDate } = {}) {
  return [
    { $match: buildRevenueMatch({ startDate, endDate }) },
    {
      $lookup: {
        from: "payouts",
        localField: "_id",
        foreignField: "orderId",
        as: "payouts",
      },
    },
    {
      $addFields: {
        payoutRecord: { $arrayElemAt: ["$payouts", 0] },
      },
    },
    {
      $addFields: {
        computedCommission: {
          $ifNull: ["$platformCommissionAmount", "$payoutRecord.commission"],
        },
      },
    },
    {
      $addFields: {
        computedCommission: { $ifNull: ["$computedCommission", 0] },
        computedVendorEarning: {
          $ifNull: [
            "$vendorEarning",
            {
              $ifNull: [
                "$payoutRecord.amount",
                {
                  $subtract: ["$totalAmount", { $ifNull: ["$computedCommission", 0] }],
                },
              ],
            },
          ],
        },
      },
    },
  ];
}

function formatDateLabel(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function buildDateRangeLabel(startDate, endDate) {
  if (!startDate && !endDate) return "All time";
  const left = startDate ? formatDateLabel(startDate) : "Beginning";
  const right = endDate ? formatDateLabel(endDate) : "Today";
  return `${left} - ${right}`;
}

async function getRevenueSummary({ startDate, endDate } = {}) {
  const basePipeline = buildRevenueBasePipeline({ startDate, endDate });

  const [summary] = await Order.aggregate([
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" },
        platformRevenue: { $sum: "$computedCommission" },
        totalVendorPayout: { $sum: "$computedVendorEarning" },
        totalOrders: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalSales: 1,
        platformRevenue: 1,
        totalVendorPayout: 1,
        totalOrders: 1,
      },
    },
  ]);

  const revenueTrend = await Order.aggregate([
    ...basePipeline,
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
        platformRevenue: { $sum: "$computedCommission" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    {
      $project: {
        _id: 0,
        date: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" },
              ],
            },
            "-",
            {
              $cond: [
                { $lt: ["$_id.day", 10] },
                { $concat: ["0", { $toString: "$_id.day" }] },
                { $toString: "$_id.day" },
              ],
            },
          ],
        },
        revenue: 1,
        platformRevenue: 1,
        orders: 1,
      },
    },
  ]);

  return {
    totalSales: summary?.totalSales || 0,
    platformRevenue: summary?.platformRevenue || 0,
    totalVendorPayout: summary?.totalVendorPayout || 0,
    totalOrders: summary?.totalOrders || 0,
    dateRange: buildDateRangeLabel(startDate, endDate),
    revenueTrend,
  };
}

async function getVendorRevenueBreakdown({ startDate, endDate, page = 1, limit = 20 } = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (safePage - 1) * safeLimit;
  const basePipeline = buildRevenueBasePipeline({ startDate, endDate });

  const vendorAggregation = [
    ...basePipeline,
    {
      $lookup: {
        from: "vendors",
        localField: "sellerId",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: {
        path: "$vendor",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "vendor.userId",
        foreignField: "_id",
        as: "vendorUser",
      },
    },
    {
      $unwind: {
        path: "$vendorUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: "$sellerId",
        vendorName: {
          $first: {
            $ifNull: [
              "$vendor.shopName",
              {
                $ifNull: ["$vendor.companyName", "$vendorUser.name"],
              },
            ],
          },
        },
        totalOrders: { $sum: 1 },
        totalSales: { $sum: "$totalAmount" },
        commission: { $sum: "$computedCommission" },
        earnings: { $sum: "$computedVendorEarning" },
      },
    },
    {
      $project: {
        _id: 0,
        vendorId: "$_id",
        vendorName: { $ifNull: ["$vendorName", "Unknown Vendor"] },
        totalOrders: 1,
        totalSales: 1,
        commission: 1,
        earnings: 1,
      },
    },
  ];

  const [rows, counts] = await Promise.all([
    Order.aggregate([
      ...vendorAggregation,
      { $sort: { totalSales: -1, vendorName: 1 } },
      { $skip: skip },
      { $limit: safeLimit },
    ]),
    Order.aggregate([
      ...vendorAggregation,
      { $count: "total" },
    ]),
  ]);

  return {
    vendors: rows,
    pagination: {
      total: counts[0]?.total || 0,
      page: safePage,
      limit: safeLimit,
      pages: Math.max(1, Math.ceil((counts[0]?.total || 0) / safeLimit)),
    },
  };
}

async function exportRevenueReport({ format, startDate, endDate } = {}) {
  const breakdown = await getVendorRevenueBreakdown({
    startDate,
    endDate,
    page: 1,
    limit: 5000,
  });
  const dateRange = buildDateRangeLabel(startDate, endDate);
  const rows = breakdown.vendors.map((vendor) => ({
    VendorName: vendor.vendorName,
    TotalOrders: vendor.totalOrders,
    TotalSales: formatCurrency(vendor.totalSales),
    Commission: formatCurrency(vendor.commission),
    VendorEarnings: formatCurrency(vendor.earnings),
    DateRange: dateRange,
  }));

  return await buildExportFile({
    rows,
    title: "Revenue Report",
    filenameBase: "revenue-report",
    format,
  });
}

module.exports = {
  getRevenueSummary,
  getVendorRevenueBreakdown,
  exportRevenueReport,
};
