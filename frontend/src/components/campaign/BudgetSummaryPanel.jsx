import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';

/**
 * Budget Summary Panel
 * Displays campaign budget breakdown with fees and taxes
 * Shows before payment is made
 */
export function BudgetSummaryPanel({
  campaign,
  budgetAmount,
  platformFeeAmount,
  gatewayFeeAmount,
  taxAmount,
  totalAmount,
  currency = 'INR',
  loading = false,
  error = null,
}) {
  const breakdown = useMemo(() => {
    return {
      budget: budgetAmount || 0,
      platformFee: platformFeeAmount || 0,
      gatewayFee: gatewayFeeAmount || 0,
      tax: taxAmount || 0,
      total: totalAmount || 0,
    };
  }, [budgetAmount, platformFeeAmount, gatewayFeeAmount, taxAmount, totalAmount]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Budget Summary</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">Campaign funding details</p>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6 space-y-4">
        {/* Campaign Title */}
        {campaign?.title && (
          <div className="pb-4 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">Campaign</p>
            <p className="text-base font-semibold text-gray-900 mt-1">{campaign.title}</p>
          </div>
        )}

        {/* Budget Amount */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Campaign Budget</p>
            <p className="text-xs text-gray-500 mt-0.5">Total amount for influencer services</p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(breakdown.budget)}
          </p>
        </div>

        {/* Platform Fee */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Platform Fee</p>
            <p className="text-xs text-gray-500 mt-0.5">2% of campaign budget</p>
          </div>
          <p className="text-base text-gray-700">
            {formatCurrency(breakdown.platformFee)}
          </p>
        </div>

        {/* Gateway Fee */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Payment Gateway Fee</p>
            <p className="text-xs text-gray-500 mt-0.5">Razorpay processing fee</p>
          </div>
          <p className="text-base text-gray-700">
            {formatCurrency(breakdown.gatewayFee)}
          </p>
        </div>

        {/* Tax */}
        <div className="flex items-center justify-between py-3 border-b-2 border-gray-200 pb-3">
          <div>
            <p className="text-sm font-medium text-gray-600">GST (18%)</p>
            <p className="text-xs text-gray-500 mt-0.5">Applied on budget + fees</p>
          </div>
          <p className="text-base text-gray-700">
            {formatCurrency(breakdown.tax)}
          </p>
        </div>

        {/* Total Amount */}
        <div className="flex items-center justify-between py-4 bg-indigo-50 -mx-6 px-6 rounded-b-lg">
          <div>
            <p className="text-base font-semibold text-gray-900">Total Amount to Pay</p>
            <p className="text-xs text-gray-600 mt-0.5">This amount will be deducted from your account</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600">
            {formatCurrency(breakdown.total)}
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
        <div className="flex gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">How it works</p>
            <p className="text-sm text-blue-800 mt-1">
              Payment will be held in escrow. Funds are released only when you approve deliverables from the influencer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Payment Summary Panel
 * Displays payment status and breakdown after payment
 */
export function PaymentSummaryPanel({
  payment,
  escrow,
  currency = 'INR',
}) {
  if (!payment && !escrow) {
    return null;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'funded':
      case 'completed':
      case 'settled':
        return 'bg-green-50 border-green-200';
      case 'partially_released':
        return 'bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'funded' || status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <Clock className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className={`rounded-lg border p-6 ${getStatusColor(escrow?.status || 'pending')}`}>
      <div className="flex items-center gap-3 mb-4">
        {getStatusIcon(escrow?.status)}
        <div>
          <h4 className="font-semibold text-gray-900">
            Escrow Status: {escrow?.status?.replace(/_/g, ' ').toUpperCase()}
          </h4>
          <p className="text-sm text-gray-600">Payment verified and secured</p>
        </div>
      </div>

      {escrow && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-600">Total Funded</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(escrow.amountFunded)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Released</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(escrow.amountReleased)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Remaining</p>
            <p className="text-lg font-semibold text-green-600 mt-1">
              {formatCurrency(escrow.amountRemaining)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Refunded</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(escrow.amountRefunded)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetSummaryPanel;
