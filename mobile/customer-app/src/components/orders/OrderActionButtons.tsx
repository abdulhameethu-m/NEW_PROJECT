import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RotateCcw, FileText, HelpCircle, ShoppingBag } from 'lucide-react-native';

export interface OrderActionButtonsProps {
  isCancellable: boolean;
  isReturnEligible: boolean;
  hasExistingReturn: boolean;
  onCancel: () => void;
  onReturn: () => void;
  onViewReturn: () => void;
  onViewInvoice: () => void;
  onSupport: () => void;
  onContinueShopping: () => void;
}

export const OrderActionButtons: React.FC<OrderActionButtonsProps> = ({
  isCancellable,
  isReturnEligible,
  hasExistingReturn,
  onCancel,
  onReturn,
  onViewReturn,
  onViewInvoice,
  onSupport,
  onContinueShopping,
}) => {
  return (
    <View style={styles.actionsContainer}>
      {isCancellable && (
        <TouchableOpacity
          style={styles.cancelOrderBtn}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelOrderBtnText} allowFontScaling={false}>
            Cancel Order
          </Text>
        </TouchableOpacity>
      )}

      {isReturnEligible && !hasExistingReturn && (
        <TouchableOpacity
          style={styles.returnOrderBtn}
          onPress={onReturn}
          activeOpacity={0.8}
        >
          <RotateCcw size={16} color="#0284c7" style={{ marginRight: 6 }} />
          <Text style={styles.returnOrderBtnText} allowFontScaling={false}>
            Return or Replace Items
          </Text>
        </TouchableOpacity>
      )}

      {hasExistingReturn && (
        <TouchableOpacity
          style={styles.viewReturnBtn}
          onPress={onViewReturn}
          activeOpacity={0.8}
        >
          <RotateCcw size={16} color="#0284c7" style={{ marginRight: 6 }} />
          <Text style={styles.viewReturnBtnText} allowFontScaling={false}>
            View Return Details & Pickup
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.downloadInvoiceBtn}
        onPress={onViewInvoice}
        activeOpacity={0.8}
      >
        <FileText size={16} color="#0284c7" style={{ marginRight: 6 }} />
        <Text style={styles.downloadInvoiceBtnText} allowFontScaling={false}>
          View & Download Tax Invoice
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.orderSupportBtn}
        onPress={onSupport}
        activeOpacity={0.8}
      >
        <HelpCircle size={16} color="#64748b" style={{ marginRight: 6 }} />
        <Text style={styles.orderSupportBtnText} allowFontScaling={false}>
          Need Help with this Order?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueShopBtn}
        onPress={onContinueShopping}
        activeOpacity={0.8}
      >
        <ShoppingBag size={16} color="#4f46e5" style={{ marginRight: 6 }} />
        <Text style={styles.continueShopBtnText} allowFontScaling={false}>
          Continue Shopping
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  cancelOrderBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  returnOrderBtn: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
  },
  viewReturnBtn: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#7dd3fc',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewReturnBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
  },
  downloadInvoiceBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadInvoiceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
  },
  orderSupportBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSupportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  continueShopBtn: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueShopBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
});
