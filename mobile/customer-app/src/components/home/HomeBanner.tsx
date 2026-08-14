import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';

interface HomeBannerProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  isLoading?: boolean;
}

export const HomeBanner = ({ title, subtitle, imageUrl, ctaText, ctaUrl, isLoading }: HomeBannerProps) => {
  const router = useRouter();
  if (isLoading) {
    return (
      <ResponsiveContainer className="my-2">
        <View className="w-full aspect-[16/7] rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className="my-2">
      <View className="w-full aspect-[16/7] rounded-2xl overflow-hidden bg-slate-900 relative justify-center px-6">
        {imageUrl && (
          <>
            <Image
              source={imageUrl}
              className="absolute top-0 left-0 right-0 bottom-0"
              contentFit="cover"
            />
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/40" />
          </>
        )}
        
        <View className="relative z-10 w-3/4">
          {title ? (
            <Text className="text-white text-2xl font-bold mb-2">
              {title}
            </Text>
          ) : null}
          
          {subtitle ? (
            <Text className="text-white/90 text-sm mb-4">
              {subtitle}
            </Text>
          ) : null}
          
          {ctaText ? (
            <Pressable 
              className="bg-white px-5 py-2.5 rounded-xl self-start mt-2"
              onPress={() => {
                if (ctaUrl) {
                  // Safely navigate based on ctaUrl format
                  if (ctaUrl.startsWith('/')) {
                    router.push(ctaUrl as any);
                  } else {
                    console.log("External or unhandled CTA URL:", ctaUrl);
                  }
                }
              }}
            >
              <Text className="text-slate-900 font-bold text-sm">{ctaText}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ResponsiveContainer>
  );
};
