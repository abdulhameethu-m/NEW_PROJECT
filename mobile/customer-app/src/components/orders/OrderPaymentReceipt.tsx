import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard } from 'lucide-react-native';

export interface OrderPaymentReceiptProps {
  subtotal?: number;
  shippingFee?: number;
  priceBreakdown?: {
    charges?: Array<{
      amount: number;
      key?: string;
      displayName?: string;
      name?: string;
    }>;
  };
  chargesTotal?: number;
  discountAmount?: number;
  paymentMethod?: string;
  totalAmount?: number;
}

export const OrderPaymentReceipt: React.FC<OrderPaymentReceiptProps> = ({
  subtotal = 0,
  shippingFee,
  priceBreakdown,
  chargesTotal,
  discountAmount,
  paymentMethod,
  totalAmount = 0,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <CreditCard size={16} color="#4f46e5" style={{ marginRight: 6 }} />
        <Text style={styles.cardTitle} allowFontScaling={false}>
          Payment & Bill Details
        </Text>
      </View>

      <View style={styles.billRows}>
        <View style={styles.billRow}>
          <Text style={styles.billLabel} allowFontScaling={false}>
            Items Subtotal
          </Text>
          <Text style={styles.billValue} allowFontScaling={false}>
            ₹{subtotal.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Delivery fee - only shown if configured by admin and > 0 */}
        {shippingFee && shippingFee > 0 ? (
          <View style={styles.billRow}>
            <Text style={styles.billLabel} allowFontScaling={false}>
              Delivery / Shipping Fee
            </Text>
            <Text style={styles.billValue} allowFontScaling={false}>
              ₹{shippingFee.toLocaleString('en-IN')}
            </Text>
          </View>
        ) : null}

        {/* Configured Admin fees (e.g. Extra fee, Platform fee) */}
        {priceBreakdown?.charges && priceBreakdown.charges.length > 0 ? (
          priceBreakdown.charges
            .filter((charge) => charge.amount > 0 && charge.key !== 'shipping_cost')
            .map((charge, cIdx) => (
              <View key={`charge-${cIdx}`} style={styles.billRow}>
                <Text style={styles.billLabel} allowFontScaling={false}>
                  {charge.displayName || charge.name || 'Additional Fee'}
                </Text>
                <Text style={styles.billValue} allowFontScaling={false}>
                  ₹{charge.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))
        ) : chargesTotal && chargesTotal > 0 ? (
          <View style={styles.billRow}>
            <Text style={styles.billLabel} allowFontScaling={false}>
              Additional Charges
            </Text>
            <Text style={styles.billValue} allowFontScaling={false}>
              ₹{chargesTotal.toLocaleString('en-IN')}
            </Text>
          </View>
        ) : null}

        {discountAmount && discountAmount > 0 ? (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: '#059669' }]} allowFontScaling={false}>
              Discount Applied
            </Text>
            <Text style={[styles.billValue, { color: '#059669' }]} allowFontScaling={false}>
              -₹{discountAmount.toLocaleString('en-IN')}
            </Text>
          </View>
        ) : null}

        <View style={styles.billDivider} />

        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalRowLabel} allowFontScaling={false}>
              {paymentMethod === 'COD' ? 'Payable on Delivery' : 'Total Paid'}
            </Text>
            <Text style={styles.paymentMethodNote} allowFontScaling={false}>
              Mode: {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
            </Text>
          </View>
          <Text style={styles.totalRowValue} allowFontScaling={false}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  billRows: {},
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalRowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  paymentMethodNote: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  totalRowValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4f46e5',
  },
});
