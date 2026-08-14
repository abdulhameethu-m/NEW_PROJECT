import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

export interface SafeAreaScreenProps extends SafeAreaViewProps {
  children: React.ReactNode;
  className?: string;
  edges?: SafeAreaViewProps['edges'];
  backgroundColor?: string;
}

/**
 * Global Screen Wrapper.
 * Automatically handles notches, status bars, and home indicators.
 */
export function SafeAreaScreen({ 
  children, 
  className = '', 
  edges = ['top', 'left', 'right'], // Bottom is handled selectively for tab screens
  style,
  backgroundColor,
  ...props 
}: SafeAreaScreenProps) {
  return (
    <SafeAreaView 
      edges={edges}
      style={[
        styles.container, 
        backgroundColor ? { backgroundColor } : undefined,
        style
      ]}
      className={`flex-1 bg-white dark:bg-slate-950 ${className}`}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
