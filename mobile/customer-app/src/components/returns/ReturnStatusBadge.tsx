import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReturnStatus } from '../../types/return';
import {
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  XCircle,
  AlertCircle,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react-native';

interface ReturnStatusBadgeProps {
  status: ReturnStatus | string;
  size?: 'sm' | 'md';
}

export const ReturnStatusBadge: React.FC<ReturnStatusBadgeProps> = ({ status, size = 'md' }) => {
  const normStatus = String(status || '').toUpperCase();

  let label = 'Requested';
  let bgColor = '#fef3c7';
  let textColor = '#b45309';
  let borderColor = '#fde68a';
  let IconComponent = Clock;

  switch (normStatus) {
    case 'REQUESTED':
    case 'ADMIN_REVIEW':
      label = 'Return Requested';
      bgColor = '#fef3c7';
      textColor = '#b45309';
      borderColor = '#fde68a';
      IconComponent = Clock;
      break;

    case 'ADMIN_APPROVED':
      label = 'Return Approved';
      bgColor = '#e0e7ff';
      textColor = '#4338ca';
      borderColor = '#c7d2fe';
      IconComponent = CheckCircle2;
      break;

    case 'RETURN_PICKUP_PENDING':
      label = 'Pickup Scheduled';
      bgColor = '#e0f2fe';
      textColor = '#0369a1';
      borderColor = '#bae6fd';
      IconComponent = Truck;
      break;

    case 'RETURN_IN_TRANSIT':
      label = 'In Transit';
      bgColor = '#e0f2fe';
      textColor = '#0284c7';
      borderColor = '#bae6fd';
      IconComponent = Truck;
      break;

    case 'VENDOR_RECEIVED':
    case 'VENDOR_INSPECTION':
      label = 'Vendor Received';
      bgColor = '#f3e8ff';
      textColor = '#7e22ce';
      borderColor = '#e9d5ff';
      IconComponent = PackageCheck;
      break;

    case 'ACCEPTED':
    case 'REFUND_PENDING':
    case 'REFUND_INITIATED':
      label = 'Refund Pending';
      bgColor = '#ecfdf5';
      textColor = '#047857';
      borderColor = '#a7f3d0';
      IconComponent = ShieldCheck;
      break;

    case 'REFUNDED':
      label = 'Refunded';
      bgColor = '#dcfce7';
      textColor = '#15803d';
      borderColor = '#86efac';
      IconComponent = CheckCircle2;
      break;

    case 'ADMIN_REJECTED':
    case 'RETURN_REJECTED':
      label = 'Rejected';
      bgColor = '#ffe4e6';
      textColor = '#be123c';
      borderColor = '#fecdd3';
      IconComponent = XCircle;
      break;

    case 'VENDOR_DISPUTED':
    case 'ADMIN_DISPUTE_REVIEW':
      label = 'Dispute Review';
      bgColor = '#ffedd5';
      textColor = '#c2410c';
      borderColor = '#fed7aa';
      IconComponent = AlertCircle;
      break;

    default:
      label = normStatus.replace(/_/g, ' ');
      bgColor = '#f1f5f9';
      textColor = '#475569';
      borderColor = '#e2e8f0';
      IconComponent = RotateCcw;
      break;
  }

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 11 : 13;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor, borderColor },
        isSmall && styles.badgeSm,
      ]}
    >
      <IconComponent size={iconSize} color={textColor} style={{ marginRight: 4 }} />
      <Text
        style={[
          styles.text,
          { color: textColor },
          isSmall && styles.textSm,
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
    fontWeight: '700',
  },
});
