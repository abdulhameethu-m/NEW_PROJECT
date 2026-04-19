const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const vendorDashboardService = require("./vendor-dashboard.service");

const getDashboard = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getDashboard(req.user.sub), "Vendor dashboard retrieved"));
const listProducts = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.listProducts(req.user.sub, req.query), "Vendor products retrieved"));
const createProduct = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.createProduct(req.user.sub, req.body), "Product created"));
const updateProduct = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.updateProduct(req.user.sub, req.params.id, req.body), "Product updated"));
const deleteProduct = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.deleteProduct(req.user.sub, req.params.id), "Product deleted"));
const listOrders = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.listOrders(req.user.sub, req.query), "Vendor orders retrieved"));
const updateOrderStatus = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.updateOrderStatus(req.user.sub, req.params.id, req.body.status), "Order status updated"));
const getInventory = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getInventory(req.user.sub, req.query), "Inventory retrieved"));
const updateInventory = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.updateInventory(req.user.sub, req.params.id, req.body), "Inventory updated"));
const getAnalytics = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getAnalytics(req.user.sub), "Analytics retrieved"));
const getPayouts = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getPayouts(req.user.sub), "Payouts retrieved"));
const getDelivery = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getDelivery(req.user.sub, req.query), "Delivery records retrieved"));
const updateDelivery = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.updateDelivery(req.user.sub, req.params.id, req.body), "Delivery updated"));
const getSettings = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getSettings(req.user.sub), "Vendor settings retrieved"));
const updateSettings = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.updateSettings(req.user.sub, req.body), "Vendor settings updated"));
const getNotifications = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getNotifications(req.user.sub, req.query), "Notifications retrieved"));
const markNotificationRead = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.markNotificationRead(req.user.sub, req.params.id), "Notification updated"));
const getReviews = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getReviews(req.user.sub, req.query), "Reviews retrieved"));
const respondToReview = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.respondToReview(req.user.sub, req.params.id, req.body.message), "Review response saved"));
const getReturns = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getReturns(req.user.sub, req.query), "Returns retrieved"));
const updateReturnStatus = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.updateReturnStatus(req.user.sub, req.params.id, req.body), "Return updated"));
const getOffers = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getOffers(req.user.sub, req.query), "Offers retrieved"));
const createOffer = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.createOffer(req.user.sub, req.body), "Offer created"));
const updateOffer = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.updateOffer(req.user.sub, req.params.id, req.body), "Offer updated"));
const getSupportTickets = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.getSupportTickets(req.user.sub, req.query), "Support tickets retrieved"));
const createSupportTicket = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.createSupportTicket(req.user.sub, req.body), "Support ticket created"));
const replyToSupportTicket = asyncHandler(async (req, res) => ok(res, await vendorDashboardService.replyToSupportTicket(req.user.sub, req.params.id, req.body.message), "Support ticket updated"));

module.exports = {
  getDashboard,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  updateOrderStatus,
  getInventory,
  updateInventory,
  getAnalytics,
  getPayouts,
  getDelivery,
  updateDelivery,
  getSettings,
  updateSettings,
  getNotifications,
  markNotificationRead,
  getReviews,
  respondToReview,
  getReturns,
  updateReturnStatus,
  getOffers,
  createOffer,
  updateOffer,
  getSupportTickets,
  createSupportTicket,
  replyToSupportTicket,
};
