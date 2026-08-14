import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

export interface ResponsiveTextProps extends TextProps {
  children: React.ReactNode;
  className?: string;
  truncate?: boolean;
  lines?: number;
}

/**
 * Text component with sensible accessibility max multipliers
 * and responsive truncation helpers.
 */
export function ResponsiveText({ 
  children, 
  className = '', 
  truncate = false,
  lines = 1,
  style,
  ...props 
}: ResponsiveTextProps) {
  return (
    <Text 
      className={`text-slate-900 dark:text-slate-100 ${className}`}
      numberOfLines={truncate ? lines : undefined}
      ellipsizeMode={truncate ? 'tail' : undefined}
      maxFontSizeMultiplier={2} // Prevent insane scaling that breaks UI entirely
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}
