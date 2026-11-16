import React from 'react';
import { View } from 'react-native';
import { CheckoutSummaryCard } from './CheckoutSummaryCard';
import { CartItem } from '../../types/cart';
import { PreparedCheckoutSummary } from '../../types/checkout';

export interface OrderSummaryStepProps {
  items: CartItem[];
  summary?: PreparedCheckoutSummary | null;
  isLoading?: boolean;
}

export const OrderSummaryStep: React.FC<OrderSummaryStepProps> = ({
  items,
  summary,
  isLoading = false,
}) => {
  return (
    <View style={{ marginBottom: 20 }}>
      <CheckoutSummaryCard
        items={items}
        summary={summary}
        isLoading={isLoading}
      />
    </View>
  );
};
