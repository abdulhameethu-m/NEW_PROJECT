import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

export interface ResponsiveContainerProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  withPadding?: boolean;
}

/**
 * A container that automatically applies horizontal padding 
 * and restrains the max width for extremely large screens.
 */
export function ResponsiveContainer({ 
  children, 
  className = '', 
  withPadding = true,
  style,
  ...props 
}: ResponsiveContainerProps) {
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  return (
    <View 
      style={[
        styles.container,
        { maxWidth: contentMaxWidth },
        withPadding ? { paddingHorizontal: horizontalPadding } : undefined,
        style
      ]}
      className={`w-full self-center ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },
});
