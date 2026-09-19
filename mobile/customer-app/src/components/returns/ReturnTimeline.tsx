import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReturnRequest, ReturnTimelineEvent } from '../../types/return';
import {
  Check,
  Clock,
  Truck,
  PackageCheck,
  ShieldCheck,
  X,
  AlertCircle,
} from 'lucide-react-native';

interface ReturnTimelineProps {
  returnRequest: ReturnRequest;
}

interface StepItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isFailed?: boolean;
  timestamp?: string;
  note?: string;
}

export const ReturnTimeline: React.FC<ReturnTimelineProps> = ({ returnRequest }) => {
  const status = returnRequest.status || 'REQUESTED';
  const timeline = returnRequest.timeline || [];

  const isRejected = ['ADMIN_REJECTED', 'RETURN_REJECTED'].includes(status);
  const isDisputed = ['VENDOR_DISPUTED', 'ADMIN_DISPUTE_REVIEW'].includes(status);

  // Status index mapping
  const statusLevels: Record<string, number> = {
    REQUESTED: 1,
    ADMIN_REVIEW: 1,
    ADMIN_APPROVED: 2,
    RETURN_PICKUP_PENDING: 3,
    RETURN_IN_TRANSIT: 3,
    VENDOR_RECEIVED: 4,
    VENDOR_INSPECTION: 4,
    ACCEPTED: 5,
    REFUND_PENDING: 5,
    REFUND_INITIATED: 5,
    REFUNDED: 5,
  };

  const currentLevel = statusLevels[status] || 1;

  const findTimestamp = (actionPattern: string) => {
    const event = timeline.find((e) =>
      e.action?.toLowerCase().includes(actionPattern.toLowerCase())
    );
    if (event?.timestamp) {
      return new Date(event.timestamp).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return undefined;
  };

  const steps: StepItem[] = [
    {
      id: 'step_1',
      title: 'Return Requested',
      description: 'Request submitted with photo evidence',
      isCompleted: currentLevel >= 1,
      isCurrent: currentLevel === 1 && !isRejected,
      timestamp:
        findTimestamp('RETURN_REQUESTED') ||
        (returnRequest.createdAt
          ? new Date(returnRequest.createdAt).toLocaleDateString()
          : undefined),
    },
    {
      id: 'step_2',
      title: isRejected ? 'Return Rejected' : 'Approval & Review',
      description: isRejected
        ? 'Return request was not approved'
        : 'Reviewed and approved by team',
      isCompleted: currentLevel >= 2 && !isRejected,
      isCurrent: isRejected || currentLevel === 2,
      isFailed: isRejected,
      timestamp: findTimestamp('APPROVED') || findTimestamp('REJECTED'),
    },
    {
      id: 'step_3',
      title: 'Reverse Pickup',
      description: returnRequest.courierName
        ? `Handover to ${returnRequest.courierName}`
        : 'Pickup agent assigned to collect package',
      isCompleted: currentLevel >= 3 && !isRejected,
      isCurrent: currentLevel === 3 && !isRejected,
      timestamp: findTimestamp('PICKUP') || findTimestamp('TRANSIT'),
    },
    {
      id: 'step_4',
      title: isDisputed ? 'Inspection Dispute' : 'Quality Check',
      description: isDisputed
        ? 'Vendor raised a dispute; admin reviewing'
        : 'Item received and verified at fulfillment center',
      isCompleted: currentLevel >= 4 && !isRejected && !isDisputed,
      isCurrent: isDisputed || (currentLevel === 4 && !isRejected),
      timestamp: findTimestamp('RECEIVED') || findTimestamp('INSPECTION'),
    },
    {
      id: 'step_5',
      title: status === 'REFUNDED' ? 'Refund Completed' : 'Refund Processing',
      description:
        status === 'REFUNDED'
          ? `₹${(returnRequest.refundAmount || returnRequest.unitPrice * returnRequest.quantity).toLocaleString('en-IN')} credited`
          : 'Amount will be credited to original payment source',
      isCompleted: status === 'REFUNDED',
      isCurrent: currentLevel === 5 && status !== 'REFUNDED',
      timestamp: findTimestamp('REFUNDED') || findTimestamp('REFUND'),
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title} allowFontScaling={false}>
        Return & Refund Status
      </Text>

      <View style={styles.timelineContainer}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          let iconBg = '#f1f5f9';
          let iconColor = '#94a3b8';
          let lineBg = '#e2e8f0';

          if (step.isFailed) {
            iconBg = '#fee2e2';
            iconColor = '#ef4444';
          } else if (step.isCompleted) {
            iconBg = '#4f46e5';
            iconColor = '#ffffff';
            lineBg = '#4f46e5';
          } else if (step.isCurrent) {
            iconBg = '#e0e7ff';
            iconColor = '#4f46e5';
          }

          return (
            <View key={step.id} style={styles.stepRow}>
              {/* Left Column: Icon & Vertical Line */}
              <View style={styles.leftCol}>
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                  {step.isFailed ? (
                    <X size={12} color={iconColor} strokeWidth={3} />
                  ) : step.isCompleted ? (
                    <Check size={12} color={iconColor} strokeWidth={3} />
                  ) : (
                    <View style={[styles.dot, { backgroundColor: iconColor }]} />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.verticalLine,
                      { backgroundColor: step.isCompleted ? '#4f46e5' : lineBg },
                    ]}
                  />
                )}
              </View>

              {/* Right Column: Title, Description, Timestamp */}
              <View style={styles.rightCol}>
                <View style={styles.headerRow}>
                  <Text
                    style={[
                      styles.stepTitle,
                      step.isCurrent && styles.activeTitle,
                      step.isFailed && styles.failedTitle,
                    ]}
                    allowFontScaling={false}
                  >
                    {step.title}
                  </Text>
                  {step.timestamp && (
                    <Text style={styles.timestampText} allowFontScaling={false}>
                      {step.timestamp}
                    </Text>
                  )}
                </View>

                <Text style={styles.stepDesc} allowFontScaling={false}>
                  {step.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  leftCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  rightCol: {
    flex: 1,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  activeTitle: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  failedTitle: {
    color: '#ef4444',
  },
  timestampText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
});
