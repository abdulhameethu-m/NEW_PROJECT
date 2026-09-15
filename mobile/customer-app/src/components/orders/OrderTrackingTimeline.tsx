import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import {
  Check,
  Clock,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react-native';
import { Order } from '../../types/order';

interface OrderTrackingTimelineProps {
  order: Order;
}

const STEPS = [
  {
    key: 'PLACED',
    title: 'Placed',
    subtitle: 'Order received and confirmed',
    icon: Clock,
  },
  {
    key: 'PACKED',
    title: 'Packed',
    subtitle: 'Seller has packed your items',
    icon: Package,
  },
  {
    key: 'SHIPPED',
    title: 'Shipped',
    subtitle: 'Handed over to delivery partner',
    icon: Truck,
  },
  {
    key: 'OUT_FOR_DELIVERY',
    title: 'Out for Delivery',
    subtitle: 'Package is out with delivery agent',
    icon: MapPin,
  },
  {
    key: 'DELIVERED',
    title: 'Delivered',
    subtitle: 'Package successfully delivered',
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
  const isCancelled = (order.status || '').toLowerCase() === 'cancelled';
  const isReturned = (order.status || '').toLowerCase().includes('return');
  const activeIndex = getActiveStepIndex(order.status);

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

  const handleOpenCourierTracking = () => {
    if (order.trackingUrl) {
      Linking.openURL(order.trackingUrl).catch(() => {});
    }
  };

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
      <Text style={styles.heading} allowFontScaling={false}>
        Delivery Status
      </Text>

      {/* Steps Stepper */}
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
                    isPending && { color: '#cbd5e1' },
                  ]}
                  allowFontScaling={false}
                >
                  {step.subtitle}
                </Text>

                {/* Event timestamp from admin update */}
                {timestamp && (isCompleted || isCurrent) ? (
                  <Text style={styles.timestampText} allowFontScaling={false}>
                    {timestamp}
                  </Text>
                ) : null}

                {/* Additional tracking info on Shipped step */}
                {step.key === 'SHIPPED' && (isCompleted || isCurrent) && (
                  <View style={styles.trackingMetaCard}>
                    {order.courierName ? (
                      <Text style={styles.trackingMetaText} allowFontScaling={false}>
                        Courier:{' '}
                        <Text style={styles.trackingMetaBold}>{order.courierName}</Text>
                      </Text>
                    ) : null}

                    {order.trackingId ? (
                      <Text style={styles.trackingMetaText} allowFontScaling={false}>
                        AWB / Tracking:{' '}
                        <Text style={styles.trackingMetaBold}>{order.trackingId}</Text>
                      </Text>
                    ) : null}

                    {order.trackingUrl ? (
                      <TouchableOpacity
                        style={styles.trackingLinkBtn}
                        onPress={handleOpenCourierTracking}
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={13} color="#4f46e5" style={{ marginRight: 4 }} />
                        <Text style={styles.trackingLinkText} allowFontScaling={false}>
                          Live Courier Tracking
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
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
    padding: 18,
    marginBottom: 16,
  },
  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  timelineWrapper: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
    marginRight: 12,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleCompleted: {
    backgroundColor: '#10b981',
  },
  circleCurrent: {
    backgroundColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  circlePending: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  connectorCompleted: {
    backgroundColor: '#10b981',
  },
  connectorPending: {
    backgroundColor: '#e2e8f0',
  },
  stepInfoCol: {
    flex: 1,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 6,
  },
  stepTitleCurrent: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  stepTitleCompleted: {
    color: '#0f172a',
  },
  stepTitlePending: {
    color: '#94a3b8',
  },
  currentBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4f46e5',
  },
  stepSubtitle: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  timestampText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    marginTop: 3,
  },
  trackingMetaCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginTop: 8,
  },
  trackingMetaText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 3,
  },
  trackingMetaBold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  trackingLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  trackingLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  cancelledContainer: {
    backgroundColor: '#fff1f2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
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
    color: '#be123c',
  },
  cancelledText: {
    fontSize: 12,
    color: '#9f1239',
    lineHeight: 18,
  },
  refundNote: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ffe4e6',
  },
  refundNoteText: {
    fontSize: 11,
    color: '#be123c',
    lineHeight: 16,
  },
});
