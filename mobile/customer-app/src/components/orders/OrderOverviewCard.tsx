import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, FileText } from 'lucide-react-native';
import { OrderStatusBadge } from './OrderStatusBadge';

export interface OrderOverviewCardProps {
  orderNumber: string;
  status: string;
  createdAt?: string;
  onViewInvoice: () => void;
}

const formatDateTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} at ${d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  } catch {
    return '';
  }
};

export const OrderOverviewCard: React.FC<OrderOverviewCardProps> = ({
  orderNumber,
  status,
  createdAt,
  onViewInvoice,
}) => {
  return (
    <View style={styles.orderOverviewCard}>
      <View style={styles.orderOverviewTop}>
        <View style={styles.orderNumCol}>
          <Text style={styles.orderOverviewLabel} allowFontScaling={false}>
            ORDER NUMBER
          </Text>
          <Text style={styles.orderOverviewNumber} allowFontScaling={false}>
            #{orderNumber}
          </Text>
        </View>
        <OrderStatusBadge status={status} size="md" />
      </View>

      <View style={styles.orderOverviewDivider} />

      <View style={styles.orderOverviewBottom}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Calendar size={13} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.orderOverviewDate} allowFontScaling={false}>
            Placed on {formatDateTime(createdAt)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.invoiceOverviewBtn}
          onPress={onViewInvoice}
          activeOpacity={0.75}
        >
          <FileText size={12} color="#0284c7" style={{ marginRight: 4 }} />
          <Text style={styles.invoiceOverviewBtnText} allowFontScaling={false}>
            Tax Invoice
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  orderOverviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderOverviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderNumCol: {
    flex: 1,
    marginRight: 10,
  },
  orderOverviewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  orderOverviewNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4f46e5',
  },
  orderOverviewDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 12,
  },
  orderOverviewBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderOverviewDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  invoiceOverviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
  invoiceOverviewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
});
