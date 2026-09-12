import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface CartSummaryProps {
  subtotal: number;
  totalAmount: number;
  currency: string;
  onCheckout?: () => void;
}

export const CartSummary = ({ subtotal, totalAmount, currency, onCheckout }: CartSummaryProps) => {
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <View style={styles.container}>
      <View style={styles.subtotalSection}>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Delivery</Text>
          <Text style={styles.freeDelivery}>Calculated at checkout</Text>
        </View>
      </View>
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
      </View>

      {onCheckout && (
        <TouchableOpacity
          onPress={onCheckout}
          activeOpacity={0.8}
          style={styles.checkoutBtn}
        >
          <Text style={styles.checkoutBtnText}>Move to Checkout</Text>
          <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 12,
  },
  subtotalSection: {
    gap: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
  },
  freeDelivery: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  checkoutBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
