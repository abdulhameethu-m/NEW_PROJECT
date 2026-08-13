import React from 'react';
import { View, Text } from 'react-native';
import { Truck, ShieldCheck } from 'lucide-react-native';

export function TrustBadges() {
  return (
    <View className="flex-row items-center justify-between px-4 py-6 bg-slate-50 dark:bg-slate-900/50 my-2">
      <View className="flex-1 flex-row items-center justify-center gap-3 border-r border-slate-200 dark:border-slate-800">
        <View className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center">
          <Truck size={20} className="text-indigo-600 dark:text-indigo-400" />
        </View>
        <View>
          <Text className="text-sm font-bold text-slate-900 dark:text-white">Fast Delivery</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">Reliable shipping</Text>
        </View>
      </View>
      
      <View className="flex-1 flex-row items-center justify-center gap-3">
        <View className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 items-center justify-center">
          <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
        </View>
        <View>
          <Text className="text-sm font-bold text-slate-900 dark:text-white">Secure Payment</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">100% protected</Text>
        </View>
      </View>
    </View>
  );
}
