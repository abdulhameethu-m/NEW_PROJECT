import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Loader, X } from 'lucide-react';

/**
 * Campaign Payment Modal
 * Handles Razorpay payment checkout for fixed payment campaigns
 */
export function CampaignPaymentModal({
  isOpen,
  onClose,
  campaignId,
  paymentData,
  onPaymentSuccess,
  onPaymentError,
  isLoading = false,
}) {
  const [error, setError] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (!isOpen) return;

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      setError('Failed to load payment gateway');
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [isOpen]);

  const handlePaymentClick = useCallback(async () => {
    if (!razorpayLoaded || !window.Razorpay || !paymentData) {
      setError('Payment gateway not ready. Please try again.');
      return;
    }

    try {
      const options = {
        key: paymentData.razorpayKeyId,
        order_id: paymentData.orderId,
        amount: paymentData.amountInPaise,
        currency: paymentData.currency || 'INR',
        name: 'Campaign Funding',
        description: `Fund campaign: ${paymentData.campaignId}`,
        notes: paymentData.notes || {},
        prefill: {
          email: paymentData.email || '',
        },
        handler: (response) => {
          onPaymentSuccess({
            paymentOrderId: paymentData.paymentOrderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          onClose();
        },
        modal: {
          ondismiss: () => {
            setError(null);
          },
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (err) {
      setError(err.message || 'Failed to open payment gateway');
      onPaymentError?.(err);
    }
  }, [razorpayLoaded, paymentData, onPaymentSuccess, onClose, onPaymentError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Funding Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Campaign ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign ID
            </label>
            <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-200">
              {campaignId}
            </p>
          </div>

          {/* Payment Amount */}
          {paymentData && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-xs text-indigo-600 font-medium mb-2">AMOUNT TO PAY</p>
              <p className="text-3xl font-bold text-indigo-900">
                ₹{(paymentData.amount || 0).toLocaleString('en-IN')}
              </p>
              <div className="mt-3 space-y-1 text-xs text-indigo-700">
                <p>
                  <span>Budget:</span>{' '}
                  <span className="font-medium">
                    ₹{(paymentData.budgetBreakdown?.budgetAmount || 0).toLocaleString('en-IN')}
                  </span>
                </p>
                <p>
                  <span>Fees & Taxes:</span>{' '}
                  <span className="font-medium">
                    ₹
                    {(
                      (paymentData.budgetBreakdown?.platformFeeAmount || 0) +
                      (paymentData.budgetBreakdown?.gatewayFeeAmount || 0) +
                      (paymentData.budgetBreakdown?.taxAmount || 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
            <p className="font-medium mb-2">Secure Payment</p>
            <p>
              Your payment is secured by Razorpay. Funds will be held in escrow and released only
              when you approve deliverables.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePaymentClick}
            disabled={isLoading || !razorpayLoaded || !paymentData}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading || !razorpayLoaded ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              'Pay Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampaignPaymentModal;
