import React, { useRef, useState, useEffect } from 'react';
import { View, FlatList, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ProductImage } from '../../types/catalog';

export const ProductGallery = ({ images }: { images: ProductImage[] }) => {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    setActiveIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [images]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveIndex(Math.round(index));
  };

  if (!images || images.length === 0) {
    return (
      <View 
        style={{ width, height: width }} 
        className="bg-slate-100 dark:bg-slate-900 items-center justify-center p-4"
      >
        <Image 
          source={require('../../../assets/images/icon.png')} 
          style={{ width: '50%', height: '50%', opacity: 0.1 }}
          contentFit="contain" 
        />
      </View>
    );
  }

  const imageHeight = width * 1.25; // 4:5 Aspect Ratio for Apparel

  return (
    <View className="bg-slate-50 dark:bg-slate-950 pb-4">
      <View style={{ width, height: imageHeight }} className="relative bg-white dark:bg-slate-950">
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(item, index) => item.url + index}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={{ width, height: imageHeight }} className="items-center justify-center">
              <Image
                source={item.url}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={300}
              />
            </View>
          )}
        />
        
        {/* Simple dots for mobile standard indicator directly under image inside the container */}
        {images.length > 1 && (
          <View className="absolute bottom-4 flex-row justify-center w-full">
            {images.map((_, index) => (
              <View
                key={`dot-${index}`}
                className={`h-2 rounded-full mx-1 ${
                  index === activeIndex 
                    ? 'bg-slate-800 dark:bg-slate-200 w-5' 
                    : 'bg-slate-300 dark:bg-slate-600 w-2'
                }`}
              />
            ))}
          </View>
        )}
      </View>
      
      {/* Thumbnails below the main image area */}
      {images.length > 1 && (
        <View className="flex-row px-4 mt-4 mb-2">
          {images.map((img, index) => {
            const isActive = index === activeIndex;
            return (
              <Pressable
                key={`thumb-${index}`}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                }}
                className={`w-[72px] h-[72px] mr-3 rounded-xl overflow-hidden border-2 bg-slate-100 dark:bg-slate-800 ${
                  isActive ? 'border-slate-800 dark:border-slate-200' : 'border-transparent'
                }`}
              >
                <Image
                  source={img.url}
                  style={{ width: '100%', height: '100%', opacity: isActive ? 1 : 0.6 }}
                  contentFit="cover"
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};
