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
  const { data: cart, isLoading, error } = useCart();
  const { mutate: updateQuantity } = useUpdateCartQuantity();
  const { mutate: removeCartItem } = useRemoveCartItem();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();

  if (status !== 'AUTHENTICATED') {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.centerContainer}>
          <Text style={styles.authTitle}>Login Required</Text>
          <Text style={styles.authSubtitle}>Please login to view and manage your cart.</Text>
          <TouchableOpacity 
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

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
    updateQuantity({ productId: item.productId._id, quantity: item.quantity + 1, variantId: item.variantId });
  };

  const handleDecrease = (item: CartItemType) => {
    if (item.quantity === 1) {
      removeCartItem({ productId: item.productId._id, variantId: item.variantId });
    } else {
      updateQuantity({ productId: item.productId._id, quantity: item.quantity - 1, variantId: item.variantId });
    }
  };

  if (!cart?.items?.length) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.navHeader}>
          <Text style={styles.navTitle}>Shopping Cart</Text>
        </View>
        <CartEmptyState />
      </SafeAreaScreen>
    );
  }

  const totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <SafeAreaScreen className="flex-1 bg-slate-50 dark:bg-black">
      {/* Top Header */}
      <View style={styles.navHeader}>
        <Text style={styles.navTitle}>
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

      {/* Cart Items List */}
      <FlatList
        data={cart.items}
        keyExtractor={(item) => `${item.productId._id}::${item.variantId || 'default'}`}
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
            onCheckout={() => router.push('/checkout')}
          />
        }
      />

      {/* Sticky Bottom Action Bar with Move to Checkout */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              ₹{cart.totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/checkout')}
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
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
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  authSubtitle: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryBtn: {
    backgroundColor: '#4f46e5',
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
    color: '#94a3b8',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
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
});
