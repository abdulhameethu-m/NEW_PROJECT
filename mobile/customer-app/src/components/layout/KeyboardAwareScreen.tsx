import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, KeyboardAvoidingViewProps } from 'react-native';

export interface KeyboardAwareScreenProps extends KeyboardAvoidingViewProps {
  children: React.ReactNode;
  className?: string;
  scrollViewClassName?: string;
}

/**
 * A layout wrapper that handles keyboard offsets consistently across devices.
 * Use for forms (Login, Register, Checkout).
 */
export function KeyboardAwareScreen({
  children,
  className = '',
  scrollViewClassName = '',
  behavior = Platform.OS === 'ios' ? 'padding' : undefined,
  ...props
}: KeyboardAwareScreenProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={behavior}
      className={className}
      {...props}
    >
      <ScrollView 
        className={`flex-1 ${scrollViewClassName}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  }
});
