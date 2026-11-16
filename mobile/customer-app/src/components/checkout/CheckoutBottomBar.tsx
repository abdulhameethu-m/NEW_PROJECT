import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

export interface CheckoutBottomBarProps {
  finalPayable: number;
  isPlaceOrderDisabled: boolean;
  isLoading: boolean;
  onPlaceOrder: () => void;
}

export const CheckoutBottomBar: React.FC<CheckoutBottomBarProps> = ({
  finalPayable,
  isPlaceOrderDisabled,
  isLoading,
  onPlaceOrder,
}) => {
  return (
    <View
      style={styles.bottomBar}
      className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
    >
      <View style={styles.bottomBarContent}>
        <View>
          <Text style={styles.payableLabel} className="text-slate-500 dark:text-slate-400">
            Payable Total
          </Text>
          <Text style={styles.payableAmount} className="text-slate-900 dark:text-white">
            ₹{finalPayable.toLocaleString('en-IN')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onPlaceOrder}
          disabled={isPlaceOrderDisabled}
          activeOpacity={0.8}
          style={[styles.placeOrderBtn, isPlaceOrderDisabled && styles.disabledBtn]}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payableLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payableAmount: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },
  placeOrderBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 145,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  placeOrderText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
