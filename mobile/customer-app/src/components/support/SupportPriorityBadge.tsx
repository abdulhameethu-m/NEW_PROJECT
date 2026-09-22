import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SupportPriority } from '../../types/support';

interface SupportPriorityBadgeProps {
  priority?: SupportPriority | string;
}

export const SupportPriorityBadge: React.FC<SupportPriorityBadgeProps> = ({ priority = 'medium' }) => {
  const norm = (priority || 'medium').toLowerCase();

  let dotColor = '#f59e0b';
  let label = 'Medium';
  let textColor = '#d97706';

  if (norm === 'high') {
    dotColor = '#ef4444';
    label = 'High Priority';
    textColor = '#dc2626';
  } else if (norm === 'low') {
    dotColor = '#10b981';
    label = 'Low Priority';
    textColor = '#059669';
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.label, { color: textColor }]} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
