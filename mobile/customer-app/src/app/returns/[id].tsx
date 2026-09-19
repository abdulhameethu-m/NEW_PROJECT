import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Package,
  Calendar,
  Truck,
  ExternalLink,
  ShieldCheck,
  Camera,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useReturnDetails } from '../../hooks/useReturns';
import { ReturnStatusBadge } from '../../components/returns/ReturnStatusBadge';
import { ReturnTimeline } from '../../components/returns/ReturnTimeline';

export default function ReturnDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: returnDoc, isLoading, error } = useReturnDetails(id);

  if (isLoading) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Return Details
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading return status...
          </Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (error || !returnDoc) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Return Details
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerContainer}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle} allowFontScaling={false}>
            Return Not Found
          </Text>
          <Text style={styles.errorSubtitle} allowFontScaling={false}>
            We could not load details for this return request.
          </Text>
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backHomeBtnText} allowFontScaling={false}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  const orderNum =
    typeof returnDoc.orderId === 'object'
      ? returnDoc.orderId.orderNumber
      : returnDoc.orderId;

  const refundVal =
    returnDoc.refundAmount ?? returnDoc.unitPrice * (returnDoc.quantity || 1);

  const handleOpenTracking = () => {
    if (returnDoc.trackingUrl) {
      Linking.openURL(returnDoc.trackingUrl);
    } else if (returnDoc.trackingId) {
      Linking.openURL(`https://www.google.com/search?q=${returnDoc.courierName || 'courier'}+tracking+${returnDoc.trackingId}`);
    }
  };

  const handleViewOrder = () => {
    const orderIdStr =
      typeof returnDoc.orderId === 'object' ? returnDoc.orderId._id : returnDoc.orderId;
    if (orderIdStr) {
      router.push(`/orders/${orderIdStr}` as any);
    }
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Return Details
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Overview Banner Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewLabel} allowFontScaling={false}>
                RETURN ID
              </Text>
              <Text style={styles.overviewId} allowFontScaling={false}>
                #{returnDoc._id.slice(-8).toUpperCase()}
              </Text>
            </View>
            <ReturnStatusBadge status={returnDoc.status} size="md" />
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Calendar size={13} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.metaText} allowFontScaling={false}>
              Requested on{' '}
              {returnDoc.createdAt
                ? new Date(returnDoc.createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently'}
            </Text>
          </View>
        </View>

        {/* Product Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={16} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              Returning Item
            </Text>
          </View>

          <View style={styles.itemRow}>
            <View style={styles.itemImageWrapper}>
              {returnDoc.productImage ? (
                <Image
                  source={{ uri: returnDoc.productImage }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ) : (
                <Package size={24} color="#94a3b8" />
              )}
            </View>

            <View style={styles.itemDetails}>
              <Text style={styles.itemName} allowFontScaling={false}>
                {returnDoc.productName}
              </Text>
              {returnDoc.variantTitle ? (
                <Text style={styles.itemVariant} allowFontScaling={false}>
                  Variant: {returnDoc.variantTitle}
                </Text>
              ) : null}
              <Text style={styles.itemQuantity} allowFontScaling={false}>
                Qty: {returnDoc.quantity} • ₹{returnDoc.unitPrice.toLocaleString('en-IN')} each
              </Text>
            </View>

            <Text style={styles.itemTotal} allowFontScaling={false}>
              ₹{(returnDoc.unitPrice * returnDoc.quantity).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Reverse Logistics / Pickup Card (if assigned) */}
        {returnDoc.trackingId ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Truck size={16} color="#0284c7" style={{ marginRight: 6 }} />
              <Text style={styles.cardTitle} allowFontScaling={false}>
                Reverse Pickup & Courier
              </Text>
            </View>

            <View style={styles.pickupBody}>
              <View style={styles.pickupDetailRow}>
                <Text style={styles.pickupLabel} allowFontScaling={false}>
                  Courier:
                </Text>
                <Text style={styles.pickupValue} allowFontScaling={false}>
                  {returnDoc.courierName || 'Courier Partner'}
                </Text>
              </View>

              <View style={styles.pickupDetailRow}>
                <Text style={styles.pickupLabel} allowFontScaling={false}>
                  Tracking AWB:
                </Text>
                <Text style={[styles.pickupValue, styles.awbText]} allowFontScaling={false}>
                  {returnDoc.trackingId}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.trackCourierBtn}
                onPress={handleOpenTracking}
                activeOpacity={0.8}
              >
                <Text style={styles.trackCourierBtnText} allowFontScaling={false}>
                  Track Courier Package
                </Text>
                <ExternalLink size={14} color="#0284c7" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Status Timeline */}
        <ReturnTimeline returnRequest={returnDoc} />

        {/* Reason & Description Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={16} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              Reason & Details
            </Text>
          </View>

          <View style={styles.reasonBody}>
            <View style={styles.reasonTag}>
              <Text style={styles.reasonTagText} allowFontScaling={false}>
                {returnDoc.reasonCode.replace(/_/g, ' ')}
              </Text>
            </View>

            {returnDoc.customerDescription ? (
              <Text style={styles.descriptionText} allowFontScaling={false}>
                "{returnDoc.customerDescription}"
              </Text>
            ) : null}
          </View>
        </View>

        {/* Photographic Evidence Gallery */}
        {returnDoc.customerEvidence && returnDoc.customerEvidence.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Camera size={16} color="#4f46e5" style={{ marginRight: 6 }} />
              <Text style={styles.cardTitle} allowFontScaling={false}>
                Photographic Proof ({returnDoc.customerEvidence.length})
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.evidenceRow}
            >
              {returnDoc.customerEvidence.map((photoUrl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.evidenceThumbWrapper}
                  onPress={() => setSelectedPhoto(photoUrl)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: photoUrl }} style={styles.evidenceThumb} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Refund Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              Refund Summary
            </Text>
          </View>

          <View style={styles.refundBody}>
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel} allowFontScaling={false}>
                Estimated Refund Amount
              </Text>
              <Text style={styles.refundValue} allowFontScaling={false}>
                ₹{refundVal.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.refundDivider} />

            <Text style={styles.refundNote} allowFontScaling={false}>
              Refund will be issued automatically to your original payment method once the item passes
              quality verification at the vendor hub.
            </Text>
          </View>
        </View>

        {/* Link to Order */}
        <TouchableOpacity
          style={styles.viewOrderBtn}
          onPress={handleViewOrder}
          activeOpacity={0.8}
        >
          <Text style={styles.viewOrderBtnText} allowFontScaling={false}>
            View Original Order #{orderNum || ''}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Fullscreen Photo Preview Modal */}
      {selectedPhoto ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
          <Pressable style={styles.photoModalBackdrop} onPress={() => setSelectedPhoto(null)}>
            <TouchableOpacity
              style={styles.photoCloseBtn}
              onPress={() => setSelectedPhoto(null)}
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.fullscreenPhoto}
              contentFit="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    padding: 16,
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  overviewId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#94a3b8',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickupBody: {
    gap: 8,
  },
  pickupDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickupLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  pickupValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  awbText: {
    color: '#0284c7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  trackCourierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  trackCourierBtnText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '700',
  },
  reasonBody: {
    gap: 10,
  },
  reasonTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonTagText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  evidenceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  evidenceThumbWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  evidenceThumb: {
    width: '100%',
    height: '100%',
  },
  refundBody: {
    gap: 8,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refundLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  refundValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  refundDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  refundNote: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  viewOrderBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewOrderBtnText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  backHomeBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backHomeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullscreenPhoto: {
    width: '90%',
    height: '70%',
  },
});
