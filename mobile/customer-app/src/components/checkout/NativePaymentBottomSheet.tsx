import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  ShieldCheck,
  Lock,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  CreditCard,
  Zap,
} from 'lucide-react-native';
import { hapticFeedback } from '../../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface RazorpayOrderDetails {
  key_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  name?: string;
  email?: string;
  contact?: string;
}

export interface PaymentSuccessResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

import { resolvePaymentIntentUrl } from '../../utils/paymentIntent';
export { resolvePaymentIntentUrl };

interface NativePaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  orderDetails: RazorpayOrderDetails | null;
  onPaymentSuccess: (result: PaymentSuccessResult) => void;
  onPaymentFailure: (errorMsg: string) => void;
  isVerifying?: boolean;
}

export const NativePaymentBottomSheet: React.FC<NativePaymentBottomSheetProps> = ({
  visible,
  onClose,
  orderDetails,
  onPaymentSuccess,
  onPaymentFailure,
  isVerifying = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [methodErrorBanner, setMethodErrorBanner] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'CARD' | 'UPI' | null>(null);
  const webViewRef = useRef<WebView<{}>>(null);

  if (!orderDetails) return null;

  const isTestMode = Boolean(orderDetails.key_id && orderDetails.key_id.startsWith('rzp_test_'));

  const copyTestCredential = async (text: string, type: 'CARD' | 'UPI') => {
    try {
      await Clipboard.setStringAsync(text);
      hapticFeedback.selection();
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Ignored silently
    }
  };

  // Razorpay amounts are in paise (e.g. 100000 = ₹1,000)
  const displayRupees = orderDetails.amount >= 100 ? orderDetails.amount / 100 : orderDetails.amount;
  const payableAmount = displayRupees > 0 ? displayRupees.toLocaleString('en-IN') : '0';

  // Sanitize prefill values so special characters or bad formatting never cause JS parsing errors
  const safeName = (orderDetails.name || '').replace(/["'\\]/g, ' ').trim();
  const safeEmail = (orderDetails.email || '').replace(/["'\\]/g, '').trim();
  const cleanContact = (orderDetails.contact || '').replace(/[^0-9]/g, '').slice(-10);

  // Construct complete inline Razorpay Checkout HTML
  const checkoutHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>UChooseMe Payment</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          color: #0f172a;
        }
        .loading-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .spinner {
          width: 44px;
          height: 44px;
          border: 3.5px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        h3 { font-size: 17px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
        p { font-size: 13px; color: #64748b; }
      </style>
      <script src="https://checkout.razorpay.com/v1/checkout.js" onload="initRazorpay()" onerror="handleSdkLoadError()"></script>
    </head>
    <body>
      <div class="loading-box" id="loadingView">
        <div class="spinner"></div>
        <h3>Connecting to Gateway</h3>
        <p>Loading secure payment options...</p>
      </div>

      <script>
        function postToNative(payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function handleSdkLoadError() {
          postToNative({ type: 'PAYMENT_FAILED', error: 'Failed to load Razorpay SDK. Please check your internet connection.' });
        }

        // Intercept external UPI intent schemes to dispatch to native apps
        var originalOpen = window.open;
        window.open = function(url, target, features) {
          if (url && typeof url === 'string') {
            if (
              url.startsWith('upi://') ||
              url.startsWith('intent://') ||
              url.startsWith('gpay://') ||
              url.startsWith('phonepe://') ||
              url.startsWith('paytmmp://')
            ) {
              postToNative({ type: 'OPEN_UPI_APP', url: url });
              return null;
            }
          }
          return originalOpen ? originalOpen.apply(window, arguments) : window;
        };

        var isInitiated = false;

        var options = {
          key: "${orderDetails.key_id}",
          amount: ${orderDetails.amount},
          currency: "${orderDetails.currency || 'INR'}",
          name: "UChooseMe",
          description: "Order Checkout",
          order_id: "${orderDetails.razorpay_order_id}",
          prefill: {
            name: "${safeName}",
            email: "${safeEmail}",
            contact: "${cleanContact}"
          },
          theme: {
            color: "#4f46e5"
          },
          modal: {
            confirm_close: true,
            ondismiss: function() {
              postToNative({ type: 'PAYMENT_CANCELLED' });
            }
          },
          handler: function(response) {
            postToNative({
              type: 'PAYMENT_SUCCESS',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
          }
        };

        function initRazorpay() {
          if (isInitiated) return;
          if (typeof window.Razorpay !== 'function') {
            setTimeout(initRazorpay, 150);
            return;
          }
          isInitiated = true;
          try {
            var rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function(resp) {
              var reason = resp.error?.description || resp.error?.reason || 'Payment method failed';
              postToNative({ type: 'PAYMENT_ATTEMPT_FAILED', error: reason });
            });
            rzp.open();
          } catch (e) {
            postToNative({ type: 'PAYMENT_FAILED', error: e.message || 'Failed to open gateway' });
          }
        }

        window.onload = function() {
          initRazorpay();
        };
      </script>
    </body>
    </html>
  `;

  const handleUpiRedirect = (rawUrl: string) => {
    const targetUrl = rawUrl;
    if (targetUrl && typeof targetUrl === 'string') {
      let resolvedUrl = targetUrl;

      // Convert Android intent:// URIs to standard upi:// scheme
      if (targetUrl.startsWith('intent://')) {
        const match = targetUrl.match(/scheme=([^;]+)/);
        const scheme = match ? match[1] : 'upi';
        const cleanUri = targetUrl
          .replace(/^intent:\/\//, `${scheme}://`)
          .replace(/#Intent;.*$/, '');
        resolvedUrl = cleanUri;
      }

      Linking.canOpenURL(resolvedUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(resolvedUrl);
          } else {
            setMethodErrorBanner('Selected UPI application is not installed on this device.');
            hapticFeedback.paymentError();
          }
        })
        .catch((err) => {
          console.warn('[Payment] Failed to launch UPI external intent:', err);
        });
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_SUCCESS') {
        onPaymentSuccess({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      } else if (data.type === 'PAYMENT_CANCELLED') {
        onClose();
      } else if (data.type === 'PAYMENT_FAILED') {
        onPaymentFailure(data.error || 'Payment failed. Please try again.');
      } else if (data.type === 'PAYMENT_ATTEMPT_FAILED') {
        let errorMsg = data.error || 'Payment method failed.';
        if (isTestMode && (errorMsg.toLowerCase().includes('cancel') || errorMsg.toLowerCase().includes('fail'))) {
          errorMsg = 'Sandbox Test: Use Test Card (4111 1111...) or UPI (success@razorpay). Real cards & unsupported banks cannot simulate payments in test mode.';
        }
        setMethodErrorBanner(errorMsg);
        console.warn('[NativePaymentBottomSheet] Payment method attempt failed:', errorMsg);
      } else if (data.type === 'OPEN_UPI_APP') {
        const targetUrl = data.url;
        if (targetUrl && typeof targetUrl === 'string') {
          let resolvedUrl = targetUrl;

          // Convert Android intent:// URIs to standard upi:// scheme
          if (targetUrl.startsWith('intent://')) {
            const match = targetUrl.match(/scheme=([^;]+)/);
            const scheme = match ? match[1] : 'upi';
            const cleanUri = targetUrl
              .replace(/^intent:\/\//, `${scheme}://`)
              .replace(/#Intent;.*$/, '');
            resolvedUrl = cleanUri;
          }
          Linking.canOpenURL(resolvedUrl)
            .then((supported) => {
              if (supported) {
                return Linking.openURL(resolvedUrl);
              } else {
                setMethodErrorBanner('Selected UPI application is not installed on this device.');
                hapticFeedback.paymentError();
              }
            })
            .catch((err) => {
              console.warn('[Payment] Failed to launch UPI external intent:', err);
            });
        }
      }
    } catch {
      // Ignore unparseable non-JSON messages
    }
  };

  const handleConfirmClose = () => {
    if (isVerifying) return;
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to cancel this payment? Your items will remain saved in your cart.',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: onClose },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleConfirmClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.shieldIconBox}>
                <ShieldCheck size={20} color="#4f46e5" />
              </View>
              <View>
                <Text style={styles.headerTitle} allowFontScaling={false}>
                  Secure Payment
                </Text>
                <Text style={styles.headerSub} allowFontScaling={false}>
                  ₹{payableAmount} · 256-bit Encrypted
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => {
                  setMethodErrorBanner(null);
                  setIsLoading(true);
                  webViewRef.current?.reload();
                }}
                disabled={isVerifying}
                style={styles.headerActionBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Reset Payment Gateway"
              >
                <RefreshCw size={17} color="#4f46e5" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmClose}
                disabled={isVerifying}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Test Mode Interactive Console */}
          {isTestMode && !isVerifying && (
            <View style={styles.testConsoleContainer}>
              <View style={styles.testConsoleHeader}>
                <Zap size={13} color="#b45309" />
                <Text style={styles.testConsoleTitle} allowFontScaling={false}>
                  Razorpay Sandbox Test Mode
                </Text>
              </View>

              <View style={styles.testChipsRow}>
                {/* 1-Tap Copy Card */}
                <TouchableOpacity
                  style={[
                    styles.testChip,
                    copiedType === 'CARD' && styles.testChipActive,
                  ]}
                  onPress={() => copyTestCredential('4111111111111111', 'CARD')}
                  activeOpacity={0.7}
                  accessibilityLabel="Copy test card number"
                >
                  <CreditCard
                    size={13}
                    color={copiedType === 'CARD' ? '#047857' : '#4338ca'}
                  />
                  <Text
                    style={[
                      styles.testChipText,
                      copiedType === 'CARD' && styles.testChipTextActive,
                    ]}
                    allowFontScaling={false}
                  >
                    {copiedType === 'CARD' ? 'Copied Card!' : 'Copy Card (4111 1111...)'}
                  </Text>
                  {copiedType === 'CARD' ? (
                    <Check size={12} color="#047857" />
                  ) : (
                    <Copy size={12} color="#6366f1" />
                  )}
                </TouchableOpacity>

                {/* 1-Tap Copy UPI */}
                <TouchableOpacity
                  style={[
                    styles.testChip,
                    copiedType === 'UPI' && styles.testChipActive,
                  ]}
                  onPress={() => copyTestCredential('success@razorpay', 'UPI')}
                  activeOpacity={0.7}
                  accessibilityLabel="Copy test UPI ID"
                >
                  <Zap
                    size={13}
                    color={copiedType === 'UPI' ? '#047857' : '#b45309'}
                  />
                  <Text
                    style={[
                      styles.testChipText,
                      copiedType === 'UPI' && styles.testChipTextActive,
                    ]}
                    allowFontScaling={false}
                  >
                    {copiedType === 'UPI' ? 'Copied UPI!' : 'Copy UPI (success@razorpay)'}
                  </Text>
                  {copiedType === 'UPI' ? (
                    <Check size={12} color="#047857" />
                  ) : (
                    <Copy size={12} color="#b45309" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.testConsoleCheatsheet} allowFontScaling={false}>
                Card: Expiry 12/28 · CVV 123 · OTP 123456 (or click Success) · Test Banks: SBI / HDFC
              </Text>
            </View>
          )}

          {/* Method Warning / Guidance Toast */}
          {methodErrorBanner && !isVerifying && (
            <View style={styles.methodWarningBanner}>
              <View style={styles.methodWarningLeft}>
                <AlertCircle size={15} color="#b45309" style={{ marginRight: 6 }} />
                <Text style={styles.methodWarningText} numberOfLines={2} allowFontScaling={false}>
                  {methodErrorBanner}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setMethodErrorBanner(null);
                  setIsLoading(true);
                  webViewRef.current?.reload();
                }}
                style={styles.methodWarningRetryBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.methodWarningRetryText} allowFontScaling={false}>
                  Reset Gateway
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Verification in Progress Overlay */}
          {isVerifying ? (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={styles.verifyingTitle} allowFontScaling={false}>
                Verifying Payment...
              </Text>
              <Text style={styles.verifyingSubtitle} allowFontScaling={false}>
                Please do not close this window or press back. We are confirming your order with the bank.
              </Text>
            </View>
          ) : loadError ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={40} color="#ef4444" />
              <Text style={styles.errorTitle} allowFontScaling={false}>
                Unable to Load Payment Gateway
              </Text>
              <Text style={styles.errorSub} allowFontScaling={false}>
                {loadError}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  webViewRef.current?.reload();
                }}
                style={styles.retryBtn}
              >
                <RefreshCw size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText} allowFontScaling={false}>
                  Retry Gateway
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.webviewContainer}>
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#4f46e5" />
                  <Text style={styles.loadingText} allowFontScaling={false}>
                    Opening Razorpay Gateway...
                  </Text>
                </View>
              )}
              <WebView<{}>
                ref={webViewRef}
                originWhitelist={['*']}
                source={{
                  html: checkoutHtml,
                  baseUrl: 'https://lavender-dove-793962.hostingersite.com',
                }}
                onMessage={handleMessage}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={(syntheticEvent: any) => {
                  const { nativeEvent } = syntheticEvent;
                  setLoadError(nativeEvent?.description || 'Connection to gateway timed out.');
                  setIsLoading(false);
                }}
                onShouldStartLoadWithRequest={(request: any) => {
                  const url: string = request.url || '';
                  if (!url) return false;

                  // Allow app switching for native UPI apps (GPay, PhonePe, Paytm, BHIM, CRED)
                  if (
                    url.startsWith('upi://') ||
                    url.startsWith('intent://') ||
                    url.startsWith('intent:') ||
                    url.startsWith('paytmmp://') ||
                    url.startsWith('phonepe://') ||
                    url.startsWith('gpay://') ||
                    url.startsWith('cred://') ||
                    url.startsWith('bhim://')
                  ) {
                    handleUpiRedirect(url);
                    return false;
                  }

                  // Allow all bank gateway, 3D Secure, OTP, and Razorpay HTTPS routes inside WebView
                  if (
                    url.startsWith('http://') ||
                    url.startsWith('https://') ||
                    url.startsWith('about:blank') ||
                    url.startsWith('data:')
                  ) {
                    return true;
                  }

                  Linking.openURL(url).catch(() => {});
                  return false;
                }}
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                javaScriptCanOpenWindowsAutomatically
                setSupportMultipleWindows={false}
                mixedContentMode="always"
                allowFileAccess
                scalesPageToFit={Platform.OS === 'android'}
                userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
                style={styles.webview}
              />
            </View>
          )}

          {/* Footer Security Assurance */}
          <View style={styles.footer}>
            <Lock size={12} color="#94a3b8" />
            <Text style={styles.footerText} allowFontScaling={false}>
              Powered by Razorpay · Bank-Grade Security & PCI-DSS Certified
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: Math.min(SCREEN_HEIGHT * 0.88, 720),
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testConsoleContainer: {
    backgroundColor: '#fffbeb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  testConsoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  testConsoleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.2,
  },
  testChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  testChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 5,
  },
  testChipActive: {
    borderColor: '#a7f3d0',
    backgroundColor: '#f0fdf4',
  },
  testChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338ca',
  },
  testChipTextActive: {
    color: '#047857',
  },
  testConsoleCheatsheet: {
    fontSize: 10,
    color: '#78350f',
    lineHeight: 14,
  },
  methodWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  methodWarningLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  methodWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  methodWarningRetryBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  methodWarningRetryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  verifyingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
  },
  verifyingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 8,
  },
  verifyingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 14,
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    backgroundColor: '#f8fafc',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
