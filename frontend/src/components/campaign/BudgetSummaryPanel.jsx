import React, { useMemo } from 'react';
import { AlertCircle, Clock, DollarSign } from 'lucide-react';

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
  escrowAmount,
  feeLines = [],
  feeSource = '',
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
      escrow: escrowAmount ?? budgetAmount ?? 0,
    };
  }, [budgetAmount, platformFeeAmount, gatewayFeeAmount, taxAmount, totalAmount, escrowAmount]);

  const dynamicFees = useMemo(() => {
    if (feeLines.length) return feeLines;
    return [
      { feeCode: 'platform_fee', feeName: 'Platform Fee', amount: breakdown.platformFee },
      { feeCode: 'gateway_fee', feeName: 'Payment Gateway Fee', amount: breakdown.gatewayFee },
      { feeCode: 'gst', feeName: 'GST', amount: breakdown.tax },
    ].filter((line) => Number(line.amount || 0) > 0);
  }, [feeLines, breakdown.platformFee, breakdown.gatewayFee, breakdown.tax]);

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

        {dynamicFees.map((line, index) => (
          <div key={line.configurationId || line.feeCode || index} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-600">{line.feeName || line.label || 'Fee'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{line.description || line.source || feeSource}</p>
            </div>
            <p className="text-base text-gray-700">{formatCurrency(line.amount || 0)}</p>
          </div>
        ))}

        <div className="flex items-center justify-between border-b-2 border-gray-200 py-3 pb-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Escrow Amount</p>
            <p className="text-xs text-gray-500 mt-0.5">Locked for deliverable-level releases</p>
          </div>
          <p className="text-base font-semibold text-gray-800">{formatCurrency(breakdown.escrow)}</p>
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
            {feeSource ? <p className="mt-1 text-xs font-medium text-blue-700">Fee source: {feeSource}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
