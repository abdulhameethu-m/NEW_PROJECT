import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle, Loader, DollarSign } from 'lucide-react';

/**
 * Release Payment Button & Modal
 * Allows vendor to release approved earnings to influencer
 */
export function ReleasePaymentModal({
  isOpen,
  onClose,
  campaignId,
  influencerId,
  approvedDeliverables = [],
  escrowData,
  onRelease,
  isLoading = false,
}) {
  const [selectedDeliverables, setSelectedDeliverables] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return approvedDeliverables.reduce((sum, d) => {
      if (selectedDeliverables.includes(d.id)) {
        return sum + (d.amount || 0);
      }
      return sum;
    }, 0);
  }, [selectedDeliverables, approvedDeliverables]);

  const handleToggleDeliverable = (deliverableId) => {
    setSelectedDeliverables((prev) => {
      if (prev.includes(deliverableId)) {
        return prev.filter((id) => id !== deliverableId);
      }
      return [...prev, deliverableId];
    });
  };

  const handleSelectAll = () => {
    if (selectedDeliverables.length === approvedDeliverables.length) {
      setSelectedDeliverables([]);
    } else {
      setSelectedDeliverables(approvedDeliverables.map((d) => d.id));
    }
  };

  const handleRelease = async () => {
    if (selectedDeliverables.length === 0) {
      setError('Please select at least one deliverable');
      return;
    }

    if (totalAmount > escrowData?.amountRemaining) {
      setError('Insufficient escrow balance for this release');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const selectedData = approvedDeliverables.filter((d) =>
        selectedDeliverables.includes(d.id)
      );

      await onRelease({
        campaignId,
        influencerId,
        deliverables: selectedData,
      });

      setSuccess(`₹${totalAmount.toLocaleString('en-IN')} released to influencer`);
      setSelectedDeliverables([]);

      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to release payment');
    }
  };

  if (!isOpen) return null;

  const allSelected = selectedDeliverables.length === approvedDeliverables.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Release Approved Earnings</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Release from Escrow</p>
              <p>
                Select approved deliverables to release payment from escrow to the influencer's wallet.
              </p>
            </div>
          </div>

          {/* Escrow Status */}
          {escrowData && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600">Total Escrow</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  ₹{(escrowData.totalEscrowAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Released</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  ₹{(escrowData.amountReleased || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Available</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  ₹{(escrowData.amountRemaining || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}

          {/* Select All */}
          {approvedDeliverables.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                Select All Deliverables
              </label>
              <span className="text-xs text-gray-600">
                {selectedDeliverables.length} of {approvedDeliverables.length}
              </span>
            </div>
          )}

          {/* Deliverables List */}
          <div className="space-y-3">
            {approvedDeliverables.length > 0 ? (
              approvedDeliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedDeliverables.includes(deliverable.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleToggleDeliverable(deliverable.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedDeliverables.includes(deliverable.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleDeliverable(deliverable.id);
                      }}
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded">
                          {deliverable.type}
                        </span>
                        <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
                      </div>
                      {deliverable.approvalNotes && (
                        <p className="text-xs text-gray-600 mt-1">{deliverable.approvalNotes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{(deliverable.amount || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Approved
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No approved deliverables to release</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Total Summary */}
          {selectedDeliverables.length > 0 && (
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-900">Total to Release</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRelease}
            disabled={isLoading || selectedDeliverables.length === 0}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                <span>Release ₹{totalAmount.toLocaleString('en-IN')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReleasePaymentModal;
