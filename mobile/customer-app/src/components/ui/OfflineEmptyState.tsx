import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

interface OfflineEmptyStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const OfflineEmptyState: React.FC<OfflineEmptyStateProps> = ({
  title = "You're currently offline",
  description = "Connect to the internet to load more products, or browse previously viewed items from your offline catalog.",
  onRetry,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const queryClient = useQueryClient();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const state = await NetInfo.refresh();
      if (state.isConnected) {
        queryClient.invalidateQueries();
      }
      onRetry?.();
    } finally {
      setTimeout(() => setIsRetrying(false), 800);
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-8 mt-12">
      <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
        <WifiOff size={32} color="#64748b" />
      </View>
      <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6 leading-5">
        {description}
      </Text>
      <TouchableOpacity
        onPress={handleRetry}
        disabled={isRetrying}
        className="flex-row items-center bg-indigo-600 px-5 py-3 rounded-xl active:bg-indigo-700"
      >
        {isRetrying ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <RefreshCw size={16} color="#ffffff" />
        )}
        <Text className="text-white font-bold text-sm ml-2">Retry Connection</Text>
      </TouchableOpacity>
    </View>
  );
};

