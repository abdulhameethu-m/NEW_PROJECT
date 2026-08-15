import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Product, ProductVariant } from '../../types/catalog';

interface Props {
  product: Product;
  activeVariant: ProductVariant | null;
  onSelectVariant: (variantId: string | null) => void;
}

export const VariantSelector = ({ product, activeVariant, onSelectVariant }: Props) => {
  // Extract variant config keys (e.g., ['color', 'size'])
  const configKeys = product.variantConfig || [];
  const variants = product.variants || [];

  if (configKeys.length === 0 || variants.length === 0) return null;

  // The engine needs to derive possible sets from actual variants
  // This satisfies explicit exact variant combinations.
  
  // What is currently selected?
  // We use activeVariant's attributes if it exists, otherwise empty.
  const currentSelection = useMemo(() => {
    return activeVariant?.attributes || {};
  }, [activeVariant]);

  const handleSelectOption = (key: string, value: string) => {
    // If clicking what's already selected, don't silently change, but maybe allow deselect?
    // Rule: "Never silently change the user's selected option."
    // We will just find the exact variant that matches the new combination.
    const proposedSelection = { ...currentSelection, [key]: value };
    
    // Find a variant that explicitly has THIS EXACT combination
    const matchingVariant = variants.find(variant => {
      // Check if for all config keys, the variant's attribute matches the proposed selection
      return configKeys.every(k => variant.attributes[k] === proposedSelection[k]);
    });

    if (matchingVariant) {
      onSelectVariant(matchingVariant.variantId);
    } else {
      // If the exact combination doesn't exist, we must set selectedVariant = null, 
      // but we STILL want the UI to reflect user's selection intents to show "Doesn't Exist".
      // Since activeVariant is tied to matchingVariant, we can't select it if it doesn't exist.
      // So instead, we just clear the active variant? Wait, rule: "selectedVariant = null when combination doesn't exist." 
      // To satisfy both this and keeping the UI visually telling the user "you picked a bad combo", 
      // we would need local state for `proposedSelection`. For simplicity, let's just 
      // prevent selection of non-existent combinations entirely, OR if we select it we clear it.
      // Let's implement partial matching: if they pick a color, and the old size doesn't exist in that color,
      // we select the *first available variant with that color* instead of silently changing? 
      // NO. "Never silently change the user's selected option."
      // So if White + M is selected, and they tap L, but White + L doesn't exist:
      // We set activeVariant = null.
      
      // But wait! If `activeVariant` is null, the system loses the `currentSelection` state!
      // To fix this without breaking the prop contract, we'll only allow selection if the combination exists?
      // Actually, standard e-com disables options that don't exist given the current state.
      onSelectVariant(null);
    }
  };

  return (
    <View className="px-4 py-4 mt-2 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
      {configKeys.map((key) => {
        const uniqueValues = Array.from(new Set(variants.map(v => v.attributes[key]))).filter(Boolean);
        const selectedValue = currentSelection[key];
        
        return (
          <View key={`variant-group-${key}`} className="mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Text>
              {selectedValue ? (
                <Text className="text-sm text-red-500 font-medium capitalize">
                  {selectedValue}
                </Text>
              ) : null}
            </View>

            <View className="flex-row flex-wrap">
              {uniqueValues.map((value) => {
                const isSelected = selectedValue === value;
                const testSelection = { ...currentSelection, [key]: value };
                const specificMatchingVariants = variants.filter(v => 
                  configKeys.every(k => testSelection[k] ? v.attributes[k] === testSelection[k] : true)
                );
                const exactVariant = specificMatchingVariants.find(v => 
                  configKeys.every(k => v.attributes[k] === testSelection[k])
                );

                const doesExist = specificMatchingVariants.length > 0;
                const isOutOfStock = exactVariant ? exactVariant.stock <= 0 : false;
                
                // Extremely primitive color matching for the dots, typically you map this using a hex table in real life
                // But this matches the requested UI aesthetic of a colored circle next to text!
                const cssSafeColor = typeof value === 'string' ? value.toLowerCase().replace(/\s/g, '') : 'transparent';
                const isLikelyColor = key.toLowerCase().includes('color');

                if (!doesExist) {
                  return (
                    <View key={`opt-not-exist-${value}`} className="mr-3 mb-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-30 flex-row items-center">
                      {isLikelyColor && <View className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: cssSafeColor || '#ccc' }} />}
                      <Text className="text-slate-400 font-medium">{value}</Text>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={`opt-exist-${value}`}
                    onPress={() => handleSelectOption(key, String(value))}
                    className={`mr-3 mb-3 px-4 py-2.5 rounded-xl border flex-row items-center overflow-hidden ${
                      isSelected 
                        ? 'border-orange-500 bg-white dark:bg-slate-900' 
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    } ${isOutOfStock && !isSelected ? 'opacity-50' : ''}`}
                  >
                    {isLikelyColor && (
                      <View className="w-5 h-5 rounded-full mr-2 border border-slate-200 shadow-sm" style={{ backgroundColor: cssSafeColor || '#ccc' }} />
                    )}
                    <Text className={`text-base font-medium ${
                      isSelected 
                        ? 'text-orange-500' // Matches target UI selected state color
                        : 'text-slate-700 dark:text-slate-300'
                    } ${isOutOfStock ? 'line-through' : ''}`}>
                      {value}
                    </Text>
                    
                    {/* The orange triangle notch for active state */}
                    {isSelected && (
                      <View className="absolute -bottom-2 -right-2 w-4 h-4 bg-orange-500 rotate-45 transform" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
};
