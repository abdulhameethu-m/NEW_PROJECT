import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, RefreshCw, CheckCircle2, Archive } from 'lucide-react-native';
import { SupportStatus } from '../../types/support';

interface SupportStatusBadgeProps {
  status: SupportStatus | string;
  size?: 'sm' | 'md';
}

export const SupportStatusBadge: React.FC<SupportStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const normStatus = (status || 'OPEN').toUpperCase();

  let config = {
    label: 'Open',
    bgColor: '#fef3c7',
    textColor: '#d97706',
    borderColor: '#fde68a',
    icon: Clock,
  };

  if (normStatus === 'IN_PROGRESS') {
    config = {
      label: 'In Progress',
      bgColor: '#e0f2fe',
      textColor: '#0284c7',
      borderColor: '#bae6fd',
      icon: RefreshCw,
    };
  } else if (normStatus === 'RESOLVED') {
    config = {
      label: 'Resolved',
      bgColor: '#dcfce7',
      textColor: '#15803d',
      borderColor: '#bbf7d0',
      icon: CheckCircle2,
    };
  } else if (normStatus === 'CLOSED') {
    config = {
      label: 'Closed',
      bgColor: '#f1f5f9',
      textColor: '#64748b',
      borderColor: '#e2e8f0',
      icon: Archive,
    };
  }

  const IconComp = config.icon;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 8,
        },
      ]}
    >
      <IconComp
        size={isSmall ? 10 : 12}
        color={config.textColor}
        style={{ marginRight: 4 }}
      />
      <Text
        style={[
          styles.badgeText,
          {
            color: config.textColor,
            fontSize: isSmall ? 10 : 11,
          },
        ]}
        allowFontScaling={false}
      >
        {config.label}
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
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
