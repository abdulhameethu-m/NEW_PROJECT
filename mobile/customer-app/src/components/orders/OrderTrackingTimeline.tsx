import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Check,
  Clock,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Copy,
  Calendar,
  Phone,
} from 'lucide-react-native';
import { Order } from '../../types/order';
import { resolveCourierTracking, openCourierTrackingUrl } from '../../utils/courierTracking';
import { copyToClipboard } from '../../utils/clipboardHelper';
import { formatDeliveryWindow } from '../../utils/deliveryEstimator';

interface OrderTrackingTimelineProps {
  order: Order;
}

const STEPS = [
  {
    key: 'PLACED',
    title: 'Order Placed',
    subtitle: 'Order received and confirmed',
    icon: Clock,
  },
  {
    key: 'PACKED',
    title: 'Packed & Ready',
    subtitle: 'Seller has packed your items',
    icon: Package,
  },
  {
    key: 'SHIPPED',
    title: 'Shipped & In Transit',
    subtitle: 'Package handed to courier partner',
    icon: Truck,
  },
  {
    key: 'OUT_FOR_DELIVERY',
    title: 'Out for Delivery',
    subtitle: 'Courier executive is delivering today',
    icon: MapPin,
  },
  {
    key: 'DELIVERED',
    title: 'Delivered',
    subtitle: 'Package successfully received',
    icon: CheckCircle2,
  },
];

const getActiveStepIndex = (status: string): number => {
  const norm = (status || '').trim().toLowerCase();
  if (norm === 'cancelled' || norm.includes('return')) return -1;
  if (norm === 'pending' || norm === 'placed') return 0;
  if (norm === 'packed') return 1;
  if (norm === 'shipped' || norm === 'in_transit') return 2;
  if (norm === 'out for delivery' || norm === 'out_for_delivery') return 3;
  if (norm === 'delivered') return 4;
  return 0;
};

const formatTimelineTimestamp = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order }) => {
  const [copiedAwb, setCopiedAwb] = useState(false);

  const isCancelled = (order.status || '').toLowerCase() === 'cancelled';
  const isReturned = (order.status || '').toLowerCase().includes('return');
  const activeIndex = getActiveStepIndex(order.status);
  const isDelivered = (order.status || '').toLowerCase() === 'delivered';

  const courierInfo = resolveCourierTracking(
    order.courierName || order.deliveryPartner,
    order.trackingId,
    order.trackingUrl
  );

  const deliveryWindow = formatDeliveryWindow(order.estimatedDeliveryDate);

  const handleCopyAwb = async () => {
    if (!courierInfo.trackingNumber) return;
    const success = await copyToClipboard(courierInfo.trackingNumber);
    if (success) {
      setCopiedAwb(true);
      setTimeout(() => setCopiedAwb(false), 2500);
    }
  };

  const handleOpenCourierTracking = () => {
    if (courierInfo.trackingUrl) {
      openCourierTrackingUrl(courierInfo.trackingUrl);
    }
  };

  if (isCancelled) {
    return (
      <View style={styles.cancelledContainer}>
        <View style={styles.cancelledHeader}>
          <AlertTriangle size={20} color="#e11d48" style={{ marginRight: 8 }} />
          <Text style={styles.cancelledTitle} allowFontScaling={false}>
            Order Cancelled
          </Text>
        </View>
        <Text style={styles.cancelledText} allowFontScaling={false}>
          {order.cancelReason || order.cancellation?.reason || 'This order was cancelled.'}
        </Text>
        {order.paymentMethod === 'ONLINE' && (
          <View style={styles.refundNote}>
            <Text style={styles.refundNoteText} allowFontScaling={false}>
              💳 Refund Status:{' '}
              <Text style={{ fontWeight: '700' }}>
                {order.refundSummary?.status || order.paymentStatus || 'Initiated'}
              </Text>
              . Amount will reflect in your source account within 5-7 working days.
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (isReturned) {
    return (
      <View style={[styles.cancelledContainer, { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }]}>
        <View style={styles.cancelledHeader}>
          <AlertTriangle size={20} color="#475569" style={{ marginRight: 8 }} />
          <Text style={[styles.cancelledTitle, { color: '#334155' }]} allowFontScaling={false}>
            Order Returned
          </Text>
        </View>
        <Text style={[styles.cancelledText, { color: '#475569' }]} allowFontScaling={false}>
          {order.status === 'Return Requested' ? 'Return request has been submitted.' : 'This order was returned.'}
        </Text>
      </View>
    );
  }

  const getStepTimestamp = (stepKey: string) => {
    const entry = (order.timeline || []).find((t) => {
      const s = (t.status || '').toLowerCase();
      if (stepKey === 'PLACED') return s === 'placed' || s === 'pending';
      if (stepKey === 'PACKED') return s === 'packed';
      if (stepKey === 'SHIPPED') return s === 'shipped' || s === 'in_transit';
      if (stepKey === 'OUT_FOR_DELIVERY') return s === 'out for delivery' || s === 'out_for_delivery';
      if (stepKey === 'DELIVERED') return s === 'delivered';
      return false;
    });
    if (entry?.timestamp) return formatTimelineTimestamp(entry.timestamp);
    if (stepKey === 'PLACED' && order.createdAt) return formatTimelineTimestamp(order.createdAt);
    if (stepKey === 'DELIVERED' && order.deliveredAt) return formatTimelineTimestamp(order.deliveredAt);
    return '';
  };

  return (
    <View style={styles.container}>
      {/* Estimated Delivery Header Banner */}
      <View style={[styles.estimateBanner, isDelivered && styles.deliveredBanner]}>
        <View style={styles.estimateBannerIconBg}>
          {isDelivered ? (
            <CheckCircle2 size={18} color="#059669" />
          ) : (
            <Calendar size={18} color="#4f46e5" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.estimateBannerLabel} allowFontScaling={false}>
            {isDelivered ? 'DELIVERY COMPLETED' : 'ESTIMATED DELIVERY'}
          </Text>
          <Text style={styles.estimateBannerDate} allowFontScaling={false}>
            {isDelivered ? `Delivered on ${formatTimelineTimestamp(order.deliveredAt || order.updatedAt)}` : deliveryWindow}
          </Text>
        </View>
      </View>

      {/* Courier & AWB Integration Card (Visible when shipped or AWB is present) */}
      {(courierInfo.trackingNumber || activeIndex >= 2) && (
        <View style={styles.courierCard}>
          <View style={styles.courierTopRow}>
            <View style={styles.courierBadgeContainer}>
              <View style={[styles.courierBadge, { backgroundColor: courierInfo.badgeBg }]}>
                <Truck size={13} color={courierInfo.badgeColor} style={{ marginRight: 5 }} />
                <Text style={[styles.courierBadgeText, { color: courierInfo.badgeColor }]} allowFontScaling={false}>
                  {courierInfo.name}
                </Text>
              </View>
            </View>

            {courierInfo.trackingUrl ? (
              <TouchableOpacity
                style={styles.trackWebsiteBtn}
                onPress={handleOpenCourierTracking}
                activeOpacity={0.8}
              >
                <Text style={styles.trackWebsiteBtnText} allowFontScaling={false}>
                  Track on Website
                </Text>
                <ExternalLink size={12} color="#4f46e5" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : null}
          </View>

          {courierInfo.trackingNumber ? (
            <View style={styles.awbRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.awbLabel} allowFontScaling={false}>
                  AWB TRACKING NUMBER
                </Text>
                <Text style={styles.awbValue} allowFontScaling={false}>
                  {courierInfo.trackingNumber}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.copyAwbBtn, copiedAwb && styles.copyAwbBtnActive]}
                onPress={handleCopyAwb}
                activeOpacity={0.75}
              >
                {copiedAwb ? (
                  <>
                    <Check size={13} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.copyAwbTextSuccess} allowFontScaling={false}>
                      Copied!
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={13} color="#4f46e5" style={{ marginRight: 4 }} />
                    <Text style={styles.copyAwbText} allowFontScaling={false}>
                      Copy AWB
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.awbPendingText} allowFontScaling={false}>
              AWB number will be assigned once pickup is verified by {courierInfo.name}.
            </Text>
          )}

          {courierInfo.customerCarePhone && (
            <View style={styles.courierSupportRow}>
              <Phone size={11} color="#64748b" style={{ marginRight: 5 }} />
              <Text style={styles.courierSupportText} allowFontScaling={false}>
                Courier Helpdesk: {courierInfo.customerCarePhone}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Progress Timeline Stepper */}
      <View style={styles.timelineWrapper}>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;
          const timestamp = getStepTimestamp(step.key);

          const StepIcon = step.icon;

          return (
            <View key={step.key} style={styles.stepRow}>
              {/* Left Column: Icon + Connecting Line */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && styles.circleCurrent,
                    isPending && styles.circlePending,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={13} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <StepIcon
                      size={13}
                      color={isCurrent ? '#ffffff' : '#94a3b8'}
                      strokeWidth={isCurrent ? 2.5 : 2}
                    />
                  )}
                </View>

                {idx < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted ? styles.connectorCompleted : styles.connectorPending,
                    ]}
                  />
                )}
              </View>

              {/* Right Column: Step Info */}
              <View style={styles.stepInfoCol}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.stepTitle,
                      isCurrent && styles.stepTitleCurrent,
                      isCompleted && styles.stepTitleCompleted,
                      isPending && styles.stepTitlePending,
                    ]}
                    allowFontScaling={false}
                  >
                    {step.title}
                  </Text>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText} allowFontScaling={false}>
                        In Progress
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.stepSubtitle,
                    isPending && { color: '#94a3b8' },
                  ]}
                  allowFontScaling={false}
                >
                  {step.subtitle}
                </Text>

                {timestamp && (isCompleted || isCurrent) ? (
                  <Text style={styles.timestampText} allowFontScaling={false}>
                    {timestamp}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 16,
  },
  estimateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  deliveredBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  estimateBannerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  estimateBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  estimateBannerDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  courierCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  courierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  courierBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackWebsiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
  },
  trackWebsiteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  awbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  awbLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  awbValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  copyAwbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyAwbBtnActive: {
    backgroundColor: '#ecfdf5',
  },
  copyAwbText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  copyAwbTextSuccess: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  awbPendingText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  courierSupportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  courierSupportText: {
    fontSize: 11,
    color: '#64748b',
  },
  timelineWrapper: {
    paddingLeft: 4,
    paddingTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  indicatorCol: {
    alignItems: 'center',
    marginRight: 14,
    width: 28,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleCompleted: {
    backgroundColor: '#059669',
  },
  circleCurrent: {
    backgroundColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  circlePending: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  connectorCompleted: {
    backgroundColor: '#059669',
  },
  connectorPending: {
    backgroundColor: '#e2e8f0',
  },
  stepInfoCol: {
    flex: 1,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginRight: 8,
  },
  stepTitleCompleted: {
    color: '#0f172a',
    fontWeight: '700',
  },
  stepTitleCurrent: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  stepTitlePending: {
    color: '#94a3b8',
  },
  currentBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4f46e5',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  timestampText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  cancelledContainer: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cancelledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cancelledTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e11d48',
  },
  cancelledText: {
    fontSize: 13,
    color: '#be123c',
    lineHeight: 18,
  },
  refundNote: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#fecdd3',
  },
  refundNoteText: {
    fontSize: 12,
    color: '#be123c',
    lineHeight: 18,
  },
});
