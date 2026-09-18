import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, RefreshCw, Film } from 'lucide-react-native';
import { useReelFeed } from '../../hooks/useReels';
import { ReelItem } from '../../components/reels/ReelItem';
import { ReelCommentsModal } from '../../components/reels/ReelCommentsModal';
import { ReelProductModal } from '../../components/reels/ReelProductModal';
import { ReelProduct, ReelItem as ReelItemType } from '../../types/reel';

export default function ReelsScreen() {
  const windowDims = useWindowDimensions();
  const [containerDims, setContainerDims] = useState<{ width: number; height: number }>({
    width: windowDims.width,
    height: windowDims.height - (Platform.OS === 'android' ? 66 : 62),
  });

  const [activeIndex, setActiveIndex] = useState(0);

  // Modals state
  const [commentsState, setCommentsState] = useState<{
    visible: boolean;
    reelId?: string;
    total: number;
  }>({
    visible: false,
    reelId: undefined,
    total: 0,
  });

  const [productState, setProductState] = useState<{
    visible: boolean;
    product: ReelProduct | null;
    reelId?: string;
  }>({
    visible: false,
    product: null,
    reelId: undefined,
  });

  // Query Reel Feed
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useReelFeed({ sort: 'newest' });

  const reels = data?.pages?.flatMap((page) => page.items) || [];

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerDims({ width, height });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (typeof idx === 'number') {
        setActiveIndex(idx);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 65,
  }).current;

  const handleOpenComments = useCallback((reelId: string, total: number) => {
    setCommentsState({ visible: true, reelId, total });
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentsState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleOpenProduct = useCallback((product: ReelProduct, reelId: string) => {
    setProductState({ visible: true, product, reelId });
  }, []);

  const handleCloseProduct = useCallback(() => {
    setProductState((prev) => ({ ...prev, visible: false }));
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ReelItemType; index: number }) => {
      return (
        <ReelItem
          item={item}
          isActive={index === activeIndex}
          height={containerDims.height}
          width={containerDims.width}
          onOpenComments={handleOpenComments}
          onOpenProduct={handleOpenProduct}
        />
      );
    },
    [activeIndex, containerDims.height, containerDims.width, handleOpenComments, handleOpenProduct]
  );

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: containerDims.height,
      offset: containerDims.height * index,
      index,
    }),
    [containerDims.height]
  );

  return (
    <View style={styles.screenContainer} onLayout={onContainerLayout}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* Transparent Top Header */}
      <SafeAreaView edges={['top']} style={styles.topHeader}>
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <Film size={20} color="#ffffff" />
            <Text style={styles.headerTitle}>Reels</Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SHOPPING</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading latest reels...</Text>
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBg}>
            <Film size={36} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Reels Available</Text>
          <Text style={styles.emptySubtitle}>
            Check back soon for new creator videos and shoppable products!
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <RefreshCw size={16} color="#ffffff" />
            <Text style={styles.refreshBtnText}>Refresh Feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={containerDims.height}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#ffffff"
              colors={['#6366f1']}
            />
          }
        />
      )}

      {/* Modals */}
      <ReelCommentsModal
        visible={commentsState.visible}
        reelId={commentsState.reelId}
        totalComments={commentsState.total}
        onClose={handleCloseComments}
      />

      <ReelProductModal
        visible={productState.visible}
        product={productState.product}
        reelId={productState.reelId}
        onClose={handleCloseProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
