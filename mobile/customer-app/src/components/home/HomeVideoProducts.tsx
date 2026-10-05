import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react-native';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { ProductCard } from '../catalog/ProductCard';
import { Product } from '../../types/catalog';
import { resolveUrl } from '../../utils/resolveUrl';

interface HomeVideoProductsProps {
  title?: string;
  videoUrl?: string;
  products: Product[];
  autoplay?: boolean;
  mute?: boolean;
  videoPosition?: 'TOP' | 'LEFT' | 'RIGHT' | 'BACKGROUND';
  isLoading?: boolean;
}

export const HomeVideoProducts = ({
  title = 'Shop the Look',
  videoUrl,
  products = [],
  autoplay = true,
  mute: defaultMute = true,
  videoPosition = 'TOP',
  isLoading = false,
}: HomeVideoProductsProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [muted, setMuted] = useState(defaultMute);
  const [isPlaying, setIsPlaying] = useState(autoplay);

  const resolvedVideoUrl = resolveUrl(videoUrl);

  const player = useVideoPlayer(resolvedVideoUrl ? { uri: resolvedVideoUrl } : null, (p) => {
    p.loop = true;
    p.muted = defaultMute;
    if (autoplay) p.play();
  });

  const togglePlay = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!player) return;
    player.muted = !muted;
    setMuted(!muted);
  };

  if (isLoading) {
    return (
      <ResponsiveContainer className="py-4">
        <View style={{ height: 220, borderRadius: 16, backgroundColor: '#e2e8f0' }} />
      </ResponsiveContainer>
    );
  }

  if (!resolvedVideoUrl && (!products || products.length === 0)) return null;

  const VideoPlayer = ({ containerStyle }: { containerStyle?: object }) => (
    <View style={[styles.videoContainer, containerStyle]}>
      {resolvedVideoUrl && player ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <View style={[styles.video, { backgroundColor: '#0f172a' }]} />
      )}

      {/* Controls Overlay */}
      <View style={styles.controls} pointerEvents="box-none">
        <Pressable onPress={togglePlay} style={styles.playButton}>
          {!isPlaying ? <Play size={22} color="#fff" fill="#fff" /> : <Pause size={22} color="#fff" fill="#fff" />}
        </Pressable>
        <Pressable onPress={toggleMute} style={styles.muteButton}>
          {muted ? <VolumeX size={14} color="#fff" /> : <Volume2 size={14} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );

  if (videoPosition === 'BACKGROUND') {
    return (
      <View style={[styles.bgContainer, { width: screenWidth }]}>
        {resolvedVideoUrl && player ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        <View style={styles.bgContent}>
          <Text style={styles.bgTitle}>{title}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bgProducts}
          >
            {products.map((product) => (
              <View key={product._id} style={[styles.bgProductItem, { width: screenWidth * 0.38 }]}>
                <ProductCard product={product} />
              </View>
            ))}
          </ScrollView>
        </View>
        <Pressable onPress={toggleMute} style={styles.bgMuteBtn}>
          {muted ? <VolumeX size={14} color="#fff" /> : <Volume2 size={14} color="#fff" />}
        </Pressable>
      </View>
    );
  }

  if (videoPosition === 'LEFT' || videoPosition === 'RIGHT') {
    return (
      <ResponsiveContainer className="py-4 mb-2" withPadding={false}>
        <View className="px-4 mb-3">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
        </View>
        <View
          style={[
            styles.sideLayout,
            videoPosition === 'RIGHT' ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' },
          ]}
        >
          <VideoPlayer containerStyle={styles.sideVideo} />
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {products.slice(0, 3).map((product) => (
              <Pressable
                key={product._id}
                style={styles.sideProduct}
                onPress={() => router.push(`/product/${product.slug}` as any)}
              >
                <Text style={styles.sideProductName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.sideProductPrice}>
                  ₹{(product.discountPrice || product.price || 0).toLocaleString('en-IN')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ResponsiveContainer>
    );
  }

  // Default: TOP
  return (
    <ResponsiveContainer className="py-4 mb-2" withPadding={false}>
      <View className="px-4 mb-3">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
      </View>

      <VideoPlayer containerStyle={styles.topVideo} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsRow}
      >
        {products.map((product) => (
          <View key={product._id} style={[styles.productItem, { width: screenWidth * 0.4 }]}>
            <ProductCard product={product} />
          </View>
        ))}
      </ScrollView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    position: 'relative',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  topVideo: {
    height: 220,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  sideVideo: {
    flex: 1,
    height: 180,
    borderRadius: 12,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  productItem: {
    minWidth: 150,
  },
  sideLayout: {
    paddingHorizontal: 16,
    gap: 12,
    height: 200,
  },
  sideProduct: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
  },
  sideProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
  },
  sideProductPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  bgContainer: {
    minHeight: 280,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  bgContent: {
    padding: 16,
  },
  bgTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  bgProducts: {
    gap: 10,
  },
  bgProductItem: {
    minWidth: 140,
  },
  bgMuteBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
