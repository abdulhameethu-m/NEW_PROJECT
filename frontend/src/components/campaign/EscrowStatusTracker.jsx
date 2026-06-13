import React, { useMemo } from 'react';
import { CheckCircle2, Clock, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';

/**
 * Escrow Status Tracker
 * Displays the current state of campaign escrow wallet
 */
export function EscrowStatusTracker({
  escrow,
  campaign,
  loading = false,
}) {
  const statusConfig = useMemo(() => {
    const status = escrow?.status || 'pending';
    const configs = {
      pending: {
        label: 'Pending',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: Clock,
        description: 'Awaiting payment',
      },
      funded: {
        label: 'Funded',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle2,
        description: 'Payment received and locked in escrow',
      },
      partially_released: {
        label: 'Partially Released',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: TrendingUp,
        description: 'Some deliverables approved and released',
      },
      fully_released: {
        label: 'Fully Released',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: CheckCircle2,
        description: 'All funds released to influencer',
      },
      refunded: {
        label: 'Refunded',
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: DollarSign,
        description: 'Campaign refunded to vendor',
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle2,
        description: 'Campaign completed successfully',
      },
      disputed: {
        label: 'Disputed',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: AlertCircle,
        description: 'Under dispute resolution',
      },
    };
    return configs[status] || configs.pending;
  }, [escrow?.status]);

  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No escrow data available</p>
      </div>
    );
  }

  const progressPercentage = escrow.totalEscrowAmount
    ? ((escrow.amountReleased / escrow.totalEscrowAmount) * 100).toFixed(0)
    : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: escrow.currency || 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Escrow Wallet</h3>
              <p className="text-sm text-gray-600 mt-0.5">{campaign?.title}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full border text-sm font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">{statusConfig.description}</p>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Total Amount */}
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <p className="text-xs text-indigo-600 font-medium mb-1">TOTAL ESCROW</p>
          <p className="text-3xl font-bold text-indigo-900">
            {formatCurrency(escrow.totalEscrowAmount)}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-indigo-600">Budget</p>
              <p className="font-semibold text-indigo-900 mt-1">
                {formatCurrency(escrow.budgetAmount)}
              </p>
            </div>
            <div>
              <p className="text-indigo-600">Fees</p>
              <p className="font-semibold text-indigo-900 mt-1">
                {formatCurrency(
                  (escrow.platformFeeAmount || 0) + (escrow.gatewayFeeAmount || 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-indigo-600">Tax</p>
              <p className="font-semibold text-indigo-900 mt-1">
                {formatCurrency(escrow.taxAmount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Release Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Release Progress</span>
            <span className="text-sm font-semibold text-gray-900">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Amount Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          {/* Released */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">RELEASED</p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(escrow.amountReleased)}
            </p>
            {escrow.partialReleases && escrow.partialReleases.length > 0 && (
              <p className="text-xs text-green-600 mt-2">
                {escrow.partialReleases.length} deliverable{escrow.partialReleases.length > 1 ? 's' : ''} approved
              </p>
            )}
          </div>

          {/* Remaining */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-medium mb-1">REMAINING</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(escrow.amountRemaining)}
            </p>
            <p className="text-xs text-blue-600 mt-2">Available for release</p>
          </div>

          {/* Refunded */}
          {escrow.amountRefunded > 0 && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-600 font-medium mb-1">REFUNDED</p>
              <p className="text-2xl font-bold text-orange-700">
                {formatCurrency(escrow.amountRefunded)}
              </p>
            </div>
          )}

          {/* Status */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 font-medium mb-1">CAMPAIGN STATUS</p>
            <p className="text-sm font-bold text-gray-900 mt-2 capitalize">
              {escrow.campaignStatus?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">Timeline</h4>
          <div className="space-y-2 text-sm">
            {escrow.fundedAt && (
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Funded on {new Date(escrow.fundedAt).toLocaleDateString()}</span>
              </div>
            )}
            {escrow.firstReleaseAt && (
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>First release on {new Date(escrow.firstReleaseAt).toLocaleDateString()}</span>
              </div>
            )}
            {escrow.lastReleaseAt && escrow.lastReleaseAt !== escrow.firstReleaseAt && (
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Last release on {new Date(escrow.lastReleaseAt).toLocaleDateString()}</span>
              </div>
            )}
            {escrow.completedAt && (
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Completed on {new Date(escrow.completedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EscrowStatusTracker;
