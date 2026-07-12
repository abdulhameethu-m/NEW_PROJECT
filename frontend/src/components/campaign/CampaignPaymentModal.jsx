import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader, X } from 'lucide-react';
import { BudgetSummaryPanel } from './BudgetSummaryPanel';

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-script';

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.getElementById(RAZORPAY_SCRIPT_ID);
    const script = existing || document.createElement('script');
    const finish = (ready) => resolve(Boolean(ready && window.Razorpay));
    script.addEventListener('load', () => finish(true), { once: true });
    script.addEventListener('error', () => finish(false), { once: true });
    if (!existing) {
      script.id = RAZORPAY_SCRIPT_ID;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export function CampaignPaymentModal({
  isOpen,
  onClose,
  campaign,
  fundingSummary,
  paymentData,
  onCreatePaymentOrder,
  onPaymentSuccess,
  onPaymentError,
  isLoading = false,
}) {
  const [error, setError] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [checkoutOpening, setCheckoutOpening] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCheckoutOpening(false);
      return undefined;
    }
    let active = true;
    setError('');
    setRazorpayLoaded(Boolean(window.Razorpay));
    loadRazorpayCheckout().then((ready) => {
      if (!active) return;
      setRazorpayLoaded(ready);
      if (!ready) {
        setError('Razorpay checkout could not load. Check your internet connection and browser content blockers.');
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen]);

  const handlePaymentClick = useCallback(async () => {
    if (!razorpayLoaded || !window.Razorpay) {
      setError('Payment gateway is not ready. Please try again.');
      return;
    }

    try {
      setCheckoutOpening(true);
      setError('');
      const order = paymentData?.orderId ? paymentData : await onCreatePaymentOrder?.();
      if (order?.escrowFunded || order?.contentEnabled || order?.campaignStatus === 'active') {
        setCheckoutOpening(false);
        onClose();
        return;
      }
      if (!order?.orderId || !order?.paymentOrderId || !order?.razorpayKeyId) {
        throw new Error('Payment order is incomplete. Verify the Razorpay configuration and try again.');
      }

      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        order_id: order.orderId,
        amount: order.amountInPaise,
        currency: order.currency || 'INR',
        name: 'Campaign Funding',
        description: `Fund campaign: ${campaign?.title || order.campaignId}`,
        notes: order.notes || {},
        prefill: { email: order.email || '' },
        handler: async (response) => {
          try {
            await onPaymentSuccess({
              paymentOrderId: order.paymentOrderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            onClose();
          } catch (paymentError) {
            const message = paymentError?.response?.data?.message || paymentError?.message || 'Payment verification failed.';
            setError(message);
            setCheckoutOpening(false);
            onPaymentError?.(paymentError);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutOpening(false);
          },
        },
        theme: { color: '#4f46e5' },
      });

      checkout.on('payment.failed', (response) => {
        const message = response?.error?.description || response?.error?.reason || 'Razorpay payment failed.';
        setError(message);
        setCheckoutOpening(false);
        onPaymentError?.(response?.error || new Error(message));
      });
      checkout.open();
    } catch (paymentError) {
      const message = paymentError?.response?.data?.message || paymentError?.message || 'Failed to open Razorpay.';
      setError(message);
      setCheckoutOpening(false);
      onPaymentError?.(paymentError);
    }
  }, [
    campaign?.title,
    onClose,
    onCreatePaymentOrder,
    onPaymentError,
    onPaymentSuccess,
    paymentData,
    razorpayLoaded,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Campaign Funding Payment</h2>
            <p className="mt-1 text-sm text-gray-500">Review the complete funding details before continuing.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <BudgetSummaryPanel
            campaign={campaign}
            {...fundingSummary}
            feeSource="Configured by Admin"
          />

          {error ? (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isLoading || checkoutOpening}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePaymentClick}
            disabled={isLoading || checkoutOpening || !razorpayLoaded || !fundingSummary}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading || checkoutOpening || !razorpayLoaded ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>{checkoutOpening ? 'Opening Razorpay...' : 'Loading gateway...'}</span>
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
