const { Vendor } = require("../models/Vendor");
require("../models/User");
const { normalizeDateRange, applyDateRange } = require("../utils/dateRange");

async function findByUserId(userId) {
  return await Vendor.findOne({ userId }).exec();
}

async function upsertByUserId(userId, update) {
  return await Vendor.findOneAndUpdate(
    { userId },
    { $set: update, $setOnInsert: { userId } },
    { new: true, upsert: true }
  ).exec();
}

async function listVendors({ status, startDate, endDate } = {}) {
  const query = {};
  if (status) query.status = status;
  applyDateRange(query, normalizeDateRange({ startDate, endDate }));
  return await Vendor.find(query)
    .populate("userId", "name email phone role status createdAt")
    .sort({ createdAt: -1 })
    .exec();
}

async function findById(id) {
  return await Vendor.findById(id)
    .populate("userId", "name email phone role status createdAt")
    .exec();
}

async function updateById(id, update) {
  return await Vendor.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate("userId", "name email phone role status createdAt")
    .exec();
}

async function deleteById(id) {
  return await Vendor.findByIdAndDelete(id).exec();
}

async function countVendors(query = {}) {
  return await Vendor.countDocuments(query);
}

async function listAll() {
  return await Vendor.find().exec();
}

module.exports = {
  findByUserId,
  upsertByUserId,
  listVendors,
  findById,
  updateById,
  deleteById,
  countVendors,
  listAll,
};
