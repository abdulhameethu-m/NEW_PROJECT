import { api } from './api';

const API_BASE = '/api/campaigns/escrow';
const ADMIN_API_BASE = '/api/campaigns/escrow/admin';

/**
 * Campaign Escrow Service
 * Frontend API calls for fixed payment campaign escrow operations
 */
class CampaignEscrowService {
  /**
   * Calculate campaign cost with fees and taxes
   */
  static async calculateCost(campaignId) {
    const response = await api.get(`${API_BASE}/calculate/${campaignId}`);
    return response.data.data;
  }

  /**
   * Create payment order (get Razorpay order details)
   */
  static async createPaymentOrder(campaignId) {
    const response = await api.post(`${API_BASE}/payment-order`, {
      campaignId,
    }, { timeout: 18000 });
    return response.data.data;
  }

  /**
   * Verify Razorpay payment and activate campaign
   */
  static async verifyPayment(paymentOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const response = await api.post(`${API_BASE}/verify-payment`, {
      paymentOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return response.data.data;
  }

  /**
   * Get payment details
   */
  static async getPaymentDetails(paymentOrderId) {
    const response = await api.get(`${API_BASE}/payment/${paymentOrderId}`);
    return response.data.data;
  }

  /**
   * Get escrow wallet summary
   */
  static async getEscrowSummary(campaignId) {
    const response = await api.get(`${API_BASE}/summary/${campaignId}`);
    return response.data.data;
  }

  static async listReleaseQueue(filters = {}) {
    const params = new URLSearchParams();
    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    const response = await api.get(`${ADMIN_API_BASE}/release-queue?${params.toString()}`);
    return response.data.data;
  }

  static async releaseApprovedDeliverables(campaignId, influencerId, deliverableIds) {
    const response = await api.post(`${ADMIN_API_BASE}/release-payment/${campaignId}`, {
      influencerId,
      deliverableIds,
    });
    return response.data.data;
  }

  /**
   * Check refund eligibility
   */
  static async checkRefundEligibility(campaignId) {
    const response = await api.get(`${API_BASE}/refund-eligibility/${campaignId}`);
    return response.data.data;
  }

  /**
   * Request refund
   */
  static async requestRefund(campaignId, reason, description = '') {
    const response = await api.post(`${API_BASE}/request-refund/${campaignId}`, {
      reason,
      description,
    });
    return response.data.data;
  }

  /**
   * Get refund details
   */
  static async getRefundDetails(refundId) {
    const response = await api.get(`${API_BASE}/refund/${refundId}`);
    return response.data.data;
  }

  /**
   * List payment orders for vendor
   */
  static async listPaymentOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.skip) params.append('skip', filters.skip);

    const response = await api.get(`${API_BASE}/payment-orders?${params.toString()}`);
    return response.data.data;
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * List refund requests (admin)
   */
  static async listRefundRequests(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.reason) params.append('reason', filters.reason);
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.skip) params.append('skip', filters.skip);

    const response = await api.get(`${ADMIN_API_BASE}/refund-requests?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Approve refund (admin)
   */
  static async approveRefund(refundId, approvalReason = '') {
    const response = await api.post(`${ADMIN_API_BASE}/approve-refund/${refundId}`, {
      approvalReason,
    });
    return response.data.data;
  }

  /**
   * Reject refund (admin)
   */
  static async rejectRefund(refundId, rejectionReason) {
    const response = await api.post(`${ADMIN_API_BASE}/reject-refund/${refundId}`, {
      rejectionReason,
    });
    return response.data.data;
  }

  /**
   * Process refund (admin)
   */
  static async processRefund(refundId) {
    const response = await api.post(`${ADMIN_API_BASE}/process-refund/${refundId}`);
    return response.data.data;
  }

  /**
   * Get refund statistics (admin)
   */
  static async getRefundStatistics(filters = {}) {
    const params = new URLSearchParams();
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`${ADMIN_API_BASE}/statistics?${params.toString()}`);
    return response.data.data;
  }

  /**
   * List all payment orders (admin)
   */
  static async listAllPaymentOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.skip) params.append('skip', filters.skip);

    const response = await api.get(`${ADMIN_API_BASE}/payment-orders?${params.toString()}`);
    return response.data.data;
  }

  static async listFeeConfigurations() {
    const response = await api.get(`${ADMIN_API_BASE}/fee-configurations`);
    return response.data.data;
  }

  static async createFeeConfiguration(payload) {
    const response = await api.post(`${ADMIN_API_BASE}/fee-configurations`, payload);
    return response.data.data;
  }

  static async updateFeeConfiguration(configId, payload) {
    const response = await api.patch(`${ADMIN_API_BASE}/fee-configurations/${configId}`, payload);
    return response.data.data;
  }

  static async deleteFeeConfiguration(configId) {
    const response = await api.delete(`${ADMIN_API_BASE}/fee-configurations/${configId}`);
    return response.data.data;
  }
}

export default CampaignEscrowService;
