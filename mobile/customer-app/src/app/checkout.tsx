import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { safeGoBack } from '../utils/safeNavigation';
import {
  ChevronLeft,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../components/layout/SafeAreaScreen';
import { AddressFormModal } from '../components/checkout/AddressFormModal';
import { PaymentMethodSelector } from '../components/checkout/PaymentMethodSelector';
import { CodConfirmationModal } from '../components/checkout/CodConfirmationModal';
import { AddressSelectionStep } from '../components/checkout/AddressSelectionStep';
import { OrderSummaryStep } from '../components/checkout/OrderSummaryStep';
import { CheckoutTrustFooter } from '../components/checkout/CheckoutTrustFooter';
import { CheckoutBottomBar } from '../components/checkout/CheckoutBottomBar';
import { NativePaymentBottomSheet } from '../components/checkout/NativePaymentBottomSheet';
import { useCheckoutFormState } from '../hooks/useCheckoutFormState';

export default function CheckoutScreen() {
  const {
    router,
    isAuthenticated,
    cart,
    isCartLoading,
    addresses,
    isAddressesLoading,
    isCreatingAddress,
    selectedAddressId,
    setSelectedAddressId,
    showAddressList,
    setShowAddressList,
    isAddressModalVisible,
    setAddressModalVisible,
    isCodModalVisible,
    setIsCodModalVisible,
    isPaymentSheetVisible,
    setIsPaymentSheetVisible,
    razorpayOrderData,
    isVerifyingOnlinePayment,
    paymentMethod,
    setPaymentMethod,
    checkoutError,
    isOnlinePaying,
    isPlacingOrder,
    activeAddress,
    deliveryEstimate,
    shippingAddress,
    preparedSummary,
    isPreparing,
    finalPayable,
    isPlaceOrderDisabled,
    handleSaveAddress,
    handleDeleteAddress,
    processCodOrderPlacement,
    handlePlaceOrder,
    handleNativePaymentSuccess,
    handleNativePaymentFailure,
  } = useCheckoutFormState();

  // Auth Guard
  if (!isAuthenticated) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.centerContainer}>
          <ShieldCheck size={56} color="#4f46e5" style={{ marginBottom: 16 }} />
          <Text style={styles.authTitle}>Login to Continue</Text>
          <Text style={styles.authSubtitle}>
            Please sign in or register to complete your order and manage your delivery addresses.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  // Empty Cart Guard
  if (!isCartLoading && (!cart?.items || cart.items.length === 0)) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/(tabs)/cart')}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Checkout</Text>
        </View>
        <View style={styles.centerContainer}>
          <ShoppingBag size={56} color="#94a3b8" style={{ marginBottom: 16 }} />
          <Text style={styles.authTitle}>Your Cart is Empty</Text>
          <Text style={styles.authSubtitle}>
            Add items to your cart before proceeding to checkout.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/shop')}
            activeOpacity={0.8}
            style={[styles.primaryBtn, { width: 200 }]}
          >
            <Text style={styles.primaryBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen className="flex-1 bg-white dark:bg-black">
      {/* Top Header */}
      <View
        style={styles.navHeader}
        className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/(tabs)/cart')}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} className="text-slate-900 dark:text-white" />
          </TouchableOpacity>
          <Text style={styles.navTitle} className="text-slate-900 dark:text-white">
            Checkout
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ShieldCheck size={16} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.secureText}>100% Secure</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      >
        {/* Error Banner */}
        {checkoutError && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#dc2626" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.errorText}>{checkoutError}</Text>
          </View>
        )}

        {/* 1. Address Selection Step */}
        <AddressSelectionStep
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          activeAddress={activeAddress}
          showAddressList={showAddressList}
          isAddressesLoading={isAddressesLoading}
          deliveryEstimate={deliveryEstimate}
          onToggleShowList={() => setShowAddressList(!showAddressList)}
          onSelectAddress={(addressId) => {
            setSelectedAddressId(addressId);
            setShowAddressList(false);
          }}
          onDeleteAddress={handleDeleteAddress}
          onOpenAddAddressModal={() => setAddressModalVisible(true)}
        />

        {/* 2. Payment Method Section */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionHeading} className="text-slate-900 dark:text-white">
            Payment Method
          </Text>
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
            codAvailability={preparedSummary?.codAvailability}
            codAdvance={preparedSummary?.codAdvance}
            isAddressSelected={Boolean(activeAddress)}
          />
        </View>

        {/* 3. Order Summary Step */}
        <OrderSummaryStep
          items={cart?.items || []}
          summary={preparedSummary}
          isLoading={isPreparing}
        />

        {/* 4. Trust Badges & Compliance Disclaimer */}
        <CheckoutTrustFooter
          onTermsPress={() => router.push('/legal/terms' as any)}
          onPrivacyPress={() => router.push('/legal/privacy' as any)}
        />
      </ScrollView>

      {/* 5. Sticky Bottom Action Bar */}
      <CheckoutBottomBar
        finalPayable={finalPayable}
        isPlaceOrderDisabled={isPlaceOrderDisabled}
        isLoading={isPlacingOrder || isOnlinePaying}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Address Form Modal */}
      <AddressFormModal
        visible={isAddressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSave={handleSaveAddress}
        isLoading={isCreatingAddress}
      />

      {/* COD Confirmation Modal */}
      <CodConfirmationModal
        visible={isCodModalVisible}
        onClose={() => setIsCodModalVisible(false)}
        onConfirm={processCodOrderPlacement}
        totalAmount={finalPayable}
        shippingAddress={shippingAddress}
        isLoading={isPlacingOrder}
      />

      {/* Native Payment Bottom Sheet */}
      <NativePaymentBottomSheet
        visible={isPaymentSheetVisible}
        onClose={() => setIsPaymentSheetVisible(false)}
        orderDetails={razorpayOrderData}
        onPaymentSuccess={handleNativePaymentSuccess}
        onPaymentFailure={handleNativePaymentFailure}
        isVerifying={isVerifyingOnlinePayment}
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
    borderRadius: 999,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  secureText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorBanner: {
    padding: 14,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  authSubtitle: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
