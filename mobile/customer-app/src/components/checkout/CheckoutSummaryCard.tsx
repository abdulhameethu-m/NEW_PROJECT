import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ChevronDown, ChevronUp, Package, Tag } from 'lucide-react-native';
import { CartItem } from '../../types/cart';
import { PreparedCheckoutSummary } from '../../types/checkout';

export interface AppliedCoupon {
  code: string;
  discount: number;
  type: 'fixed' | 'percentage';
  description?: string;
}

interface CheckoutSummaryCardProps {
  items: CartItem[];
  summary?: PreparedCheckoutSummary | null;
  isLoading?: boolean;
  couponDiscount?: number;
  appliedCoupon?: AppliedCoupon | null;
  onRemoveCoupon?: () => void;
}

function formatChargeTitle(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const CheckoutSummaryCard: React.FC<CheckoutSummaryCardProps> = ({
  items,
  summary,
  isLoading = false,
  couponDiscount = 0,
  appliedCoupon = null,
  onRemoveCoupon,
}) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

  // Calculations
  const fallbackSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = summary?.subtotal ?? fallbackSubtotal;
  const shippingFee = summary?.shippingFee ?? 0;
  const taxAmount = summary?.taxAmount ?? 0;

  // Filter all non-shipping charges configured by admin (e.g. extra fee, platform fee, cod fee, etc.)
  const adminCharges = (summary?.charges || []).filter(
    (charge) => charge.key !== 'shipping_cost' && Number(charge.amount || 0) > 0
  );

  const adminChargesTotal = adminCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const hasTaxInCharges = adminCharges.some(
    (c) => c.key === 'tax' || String(c.category || '').toUpperCase() === 'TAX'
  );
  const standaloneTax = !hasTaxInCharges && taxAmount > 0 ? taxAmount : 0;

  const baseTotalAmount =
    summary?.totalAmount ?? (subtotal + shippingFee + adminChargesTotal + standaloneTax);

  const finalPayable = Math.max(0, baseTotalAmount - couponDiscount);

  const accountedTotal = subtotal + shippingFee + adminChargesTotal + standaloneTax;
  const difference = Math.round((baseTotalAmount - accountedTotal) * 100) / 100;

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const displayedItems = isItemsExpanded ? items : items.slice(0, 2);

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between pb-3">
        <View className="flex-row items-center">
          <Package size={18} color="#0f172a" />
          <Text className="font-bold text-sm text-slate-900 dark:text-white ml-2">
            Order Items ({totalQuantity})
          </Text>
        </View>

        {items.length > 2 && (
          <Pressable
            onPress={() => setIsItemsExpanded(!isItemsExpanded)}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            hitSlop={8}
          >
            <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
              {isItemsExpanded ? 'Show less' : `+${items.length - 2} more`}
            </Text>
            {isItemsExpanded ? (
              <ChevronUp size={13} color="#4f46e5" />
            ) : (
              <ChevronDown size={13} color="#4f46e5" />
            )}
          </Pressable>
        )}
      </View>

      {/* Item Rows */}
      <View className="divide-y divide-slate-100 dark:divide-slate-800/60 my-1">
        {displayedItems.map((item, idx) => {
          const prod = typeof item.productId === 'object' ? item.productId : null;
          const prodId = (prod as any)?._id || (typeof item.productId === 'string' ? item.productId : `prod-${idx}`);
          const itemKey = (item as any)._id || `${prodId}::${item.variantId || idx}::${idx}`;
          const rawImage =
            item.image ||
            (prod?.images?.[0] as any)?.url ||
            (typeof prod?.images?.[0] === 'string' ? prod.images[0] : null);

          return (
            <View key={itemKey} className="flex-row py-3 items-center">
              <View className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800 overflow-hidden mr-3">
                {rawImage ? (
                  <Image source={rawImage} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Package size={18} className="text-slate-300" />
                  </View>
                )}
              </View>
              <View className="flex-1 mr-2">
                <Text className="font-bold text-sm text-slate-900 dark:text-slate-100" numberOfLines={1}>
                  {prod?.name || 'Product'}
                </Text>
                {item.variantTitle && (
                  <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                    {item.variantTitle}
                  </Text>
                )}
                <Text className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity}</Text>
              </View>
              <Text className="font-bold text-sm text-slate-900 dark:text-white">
                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Financial Breakdown */}
      <View className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {/* Items Subtotal */}
        <View className="flex-row justify-between items-center py-0.5">
          <Text className="text-slate-400 text-xs font-medium">Items Subtotal</Text>
          <Text className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            ₹{subtotal.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Delivery / Shipping Charges - Only shown if configured by admin and > 0 */}
        {shippingFee > 0 && (
          <View className="flex-row justify-between items-center py-0.5">
            <Text className="text-slate-400 text-xs font-medium">Delivery Charges</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                ₹{shippingFee.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        )}

        {/* Admin Configured Fees & Charges (e.g. Extra Fee, Platform Fee, COD Fee, etc.) */}
        {adminCharges.map((charge, idx) => (
          <View key={`${charge.key}-${idx}`} className="flex-row justify-between items-center py-0.5">
            <View className="flex-row items-center">
              <Text className="text-slate-400 text-xs font-medium">
                {charge.displayName || charge.name || formatChargeTitle(charge.key)}
              </Text>
              {charge.category && charge.category !== 'OTHER' && (
                <View className="ml-1.5 px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                  <Text className="text-[9px] text-slate-400 font-semibold uppercase">
                    {charge.category.replace('_', ' ')}
                  </Text>
                </View>
              )}
            </View>
            <Text className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              ₹{Number(charge.amount).toLocaleString('en-IN')}
            </Text>
          </View>
        ))}

        {/* Standalone Taxes & GST */}
        {standaloneTax > 0 && (
          <View className="flex-row justify-between items-center py-0.5">
            <Text className="text-slate-400 text-xs font-medium">Taxes & GST</Text>
            <Text className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              ₹{standaloneTax.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* Reconciled Difference Safeguard */}
        {difference > 0 && (
          <View className="flex-row justify-between items-center py-0.5">
            <Text className="text-slate-400 text-xs font-medium">Applicable Fees</Text>
            <Text className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              ₹{difference.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* Coupon Discount Row */}
        {couponDiscount > 0 && appliedCoupon && (
          <View className="flex-row justify-between items-center py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-800/40 my-0.5">
            <View className="flex-row items-center">
              <Tag size={12} color="#16a34a" />
              <Text className="text-emerald-700 dark:text-emerald-300 text-xs font-bold ml-1.5">
                {appliedCoupon.code} Applied
              </Text>
              {onRemoveCoupon && (
                <Pressable onPress={onRemoveCoupon} hitSlop={8} className="ml-2">
                  <Text className="text-[11px] text-red-500 font-semibold underline">Remove</Text>
                </Pressable>
              )}
            </View>
            <Text className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
              -₹{couponDiscount.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* Total Row */}
        <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
          <View>
            <Text className="font-bold text-sm text-slate-900 dark:text-white">Total Amount</Text>
            <Text className="text-[11px] text-slate-400 mt-0.5">Inclusive of all taxes</Text>
          </View>
          <Text className="font-black text-xl text-indigo-600 dark:text-indigo-400">
            ₹{finalPayable.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );
};
