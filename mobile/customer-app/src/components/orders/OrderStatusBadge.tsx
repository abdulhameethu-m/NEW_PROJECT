import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Clock,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
} from 'lucide-react-native';

interface OrderStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const norm = (status || '').trim().toLowerCase();

  let bg = '#f1f5f9';
  let text = '#475569';
  let border = '#e2e8f0';
  let IconComponent = AlertCircle;
  let label = status || 'Pending';

  if (norm === 'pending' || norm === 'placed') {
    bg = '#fffbeb';
    text = '#b45309';
    border = '#fef3c7';
    IconComponent = Clock;
    label = 'Placed';
  } else if (norm === 'packed') {
    bg = '#eff6ff';
    text = '#1d4ed8';
    border = '#dbeafe';
    IconComponent = Package;
    label = 'Packed';
  } else if (norm === 'shipped' || norm === 'in_transit') {
    bg = '#eef2ff';
    text = '#4338ca';
    border = '#e0e7ff';
    IconComponent = Truck;
    label = 'Shipped';
  } else if (norm === 'out for delivery' || norm === 'out_for_delivery') {
    bg = '#faf5ff';
    text = '#7e22ce';
    border = '#f3e8ff';
    IconComponent = MapPin;
    label = 'Out for Delivery';
  } else if (norm === 'delivered') {
    bg = '#ecfdf5';
    text = '#047857';
    border = '#a7f3d0';
    IconComponent = CheckCircle2;
    label = 'Delivered';
  } else if (norm === 'cancelled') {
    bg = '#fff1f2';
    text = '#be123c';
    border = '#fecdd3';
    IconComponent = XCircle;
    label = 'Cancelled';
  } else if (norm.includes('return')) {
    bg = '#f8fafc';
    text = '#64748b';
    border = '#cbd5e1';
    IconComponent = RotateCcw;
    label = norm.includes('requested') ? 'Return Requested' : 'Returned';
  }

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 11 : 13;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 9,
        },
      ]}
    >
      <IconComponent size={iconSize} color={text} style={styles.icon} />
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: isSmall ? 10 : 12,
          },
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
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
  },
});
