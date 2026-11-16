import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { Trash2, ArrowRight } from 'lucide-react-native';
import { useCart, useUpdateCartQuantity, useRemoveCartItem, useClearCart } from '../../hooks/useCart';
import { CartItem as CartItemType } from '../../types/cart';
import { CartItem } from '../../components/cart/CartItem';
import { CartSkeleton } from '../../components/cart/CartSkeleton';
import { CartEmptyState } from '../../components/cart/CartEmptyState';
import { CartSummary } from '../../components/cart/CartSummary';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function CartScreen() {
  const router = useRouter();
  const { status } = useAuthStore();
  const isAuthenticated = status === 'AUTHENTICATED';
  const { data: cart, isLoading, error } = useCart();
  const { mutate: updateQuantity } = useUpdateCartQuantity();
  const { mutate: removeCartItem } = useRemoveCartItem();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();

  const handleCheckoutNavigation = () => {
    if (!isAuthenticated) {
      router.push({
        pathname: '/(auth)/login',
        params: { returnTo: '/checkout' },
      });
      return;
    }
    router.push('/checkout');
  };

  if (isLoading) {
    return <CartSkeleton />;
  }

  if (error) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.centerContainer}>
          <Text style={{ color: '#ef4444', fontWeight: '500', marginBottom: 16 }}>
            {error.message || 'Failed to load cart'}
          </Text>
        </View>
      </SafeAreaScreen>
    );
  }

  const handleIncrease = (item: CartItemType) => {
    const prodId = typeof item.productId === 'object' ? item.productId._id : item.productId;
    updateQuantity({ productId: prodId, quantity: item.quantity + 1, variantId: item.variantId });
  };

  const handleDecrease = (item: CartItemType) => {
    const prodId = typeof item.productId === 'object' ? item.productId._id : item.productId;
    if (item.quantity === 1) {
      removeCartItem({ productId: prodId, variantId: item.variantId });
    } else {
      updateQuantity({ productId: prodId, quantity: item.quantity - 1, variantId: item.variantId });
    }
  };

  if (!cart?.items?.length) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.navHeader} className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <Text style={styles.navTitle} className="text-slate-900 dark:text-white">Shopping Cart</Text>
        </View>
        <CartEmptyState />
      </SafeAreaScreen>
    );
  }

  const totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <SafeAreaScreen className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <View style={styles.navHeader} className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <Text style={styles.navTitle} className="text-slate-900 dark:text-white">
          Shopping Cart ({totalQuantity})
        </Text>
        <TouchableOpacity 
          style={styles.clearBtn}
          onPress={() => clearCart()}
          disabled={isClearing}
          activeOpacity={0.7}
        >
          {isClearing ? <ActivityIndicator size="small" color="#ef4444" /> : <Trash2 size={20} color="#64748b" />}
        </TouchableOpacity>
      </View>

      {/* Guest Notice Banner */}
      {!isAuthenticated && (
        <View style={styles.guestBanner} className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50">
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.guestBannerTitle} className="text-blue-800 dark:text-blue-300">Guest Cart</Text>
            <Text style={styles.guestBannerSub} className="text-blue-600 dark:text-blue-400">
              Items saved on device. Sign in to sync across devices & checkout.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.guestSignInBtn}
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { returnTo: '/(tabs)/cart' },
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.guestSignInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Items List */}
      <FlatList
        data={cart.items}
        keyExtractor={(item, idx) => {
          const prodId = typeof item.productId === 'object' ? item.productId._id : item.productId;
          return `${prodId}::${item.variantId || idx}::${idx}`;
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            onIncrease={() => handleIncrease(item)}
            onDecrease={() => handleDecrease(item)}
          />
        )}
        ListFooterComponent={
          <CartSummary 
            subtotal={cart.totalAmount}
            totalAmount={cart.totalAmount}
            currency={cart.currency}
            onCheckout={handleCheckoutNavigation}
          />
        }
      />

      {/* Sticky Bottom Action Bar with Move to Checkout */}
      <View style={styles.bottomBar} className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <View style={styles.bottomBarContent}>
          <View>
            <Text style={styles.totalLabel} className="text-slate-500 dark:text-slate-400">Total Amount</Text>
            <Text style={styles.totalValue} className="text-slate-900 dark:text-white">
              ₹{cart.totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCheckoutNavigation}
            activeOpacity={0.8}
            style={styles.checkoutBtn}
          >
            <Text style={styles.checkoutBtnText}>Move to Checkout</Text>
            <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>
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
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  clearBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  checkoutBtn: {
    paddingHorizontal: 24,
    height: 48,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  guestBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  guestBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  guestSignInBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guestSignInText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
