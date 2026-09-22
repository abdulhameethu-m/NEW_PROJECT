import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Package, Send, AlertTriangle, ShieldCheck, Tag, X } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { safeGoBack } from '../../utils/safeNavigation';
import { SUPPORT_CATEGORIES, SupportPriority } from '../../types/support';
import { useCreateSupportTicket } from '../../hooks/useSupport';

export default function NewSupportTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string; orderNumber?: string; category?: string }>();

  // Attached order state
  const [attachedOrderNumber, setAttachedOrderNumber] = useState<string | undefined>(params.orderNumber);

  // Form states
  const [subject, setSubject] = useState(
    params.orderNumber ? `Assistance with Order #${params.orderNumber}` : ''
  );
  const [category, setCategory] = useState<string>(
    params.category || (params.orderNumber ? 'Orders & Delivery' : 'General Inquiries')
  );
  const [priority, setPriority] = useState<SupportPriority>('medium');
  const [message, setMessage] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useCreateSupportTicket();
  const isSubmitting = createMutation.isPending;

  const handleSubmit = async () => {
    setValidationError(null);

    const cleanSubject = subject.trim();
    if (cleanSubject.length < 3) {
      setValidationError('Subject must be at least 3 characters long.');
      return;
    }
    if (cleanSubject.length > 160) {
      setValidationError('Subject must not exceed 160 characters.');
      return;
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length < 5) {
      setValidationError('Please provide a message with at least 5 characters detailing your issue.');
      return;
    }
    if (cleanMessage.length > 2000) {
      setValidationError('Message must not exceed 2000 characters.');
      return;
    }

    // Prepend order reference if attached
    const finalMessage = attachedOrderNumber && !cleanMessage.includes(attachedOrderNumber)
      ? `[Referencing Order: #${attachedOrderNumber}]\n\n${cleanMessage}`
      : cleanMessage;

    try {
      const newTicket = await createMutation.mutateAsync({
        subject: cleanSubject,
        category,
        priority,
        message: finalMessage,
      });

      Alert.alert(
        'Ticket Created',
        'Your support ticket has been submitted. Our team will review and reply shortly.',
        [
          {
            text: 'View Ticket',
            onPress: () => {
              router.replace({
                pathname: '/support/[id]',
                params: { id: newTicket._id },
              } as any);
            },
          },
        ]
      );
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to submit support ticket.';
      setValidationError(errMsg);
    }
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/support')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Raise Support Ticket
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Validation Error Banner */}
          {validationError && (
            <View style={styles.errorBanner}>
              <AlertTriangle size={16} color="#dc2626" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorBannerText} allowFontScaling={false}>
                {validationError}
              </Text>
            </View>
          )}

          {/* Attached Order Pill (if applicable) */}
          {attachedOrderNumber && (
            <View style={styles.attachedOrderBox}>
              <View style={styles.attachedOrderIconBg}>
                <Package size={16} color="#4f46e5" />
              </View>
              <View style={styles.attachedOrderInfo}>
                <Text style={styles.attachedOrderLabel} allowFontScaling={false}>
                  Referenced Order
                </Text>
                <Text style={styles.attachedOrderNumber} allowFontScaling={false}>
                  #{attachedOrderNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAttachedOrderNumber(undefined)}
                style={styles.removeOrderBtn}
              >
                <X size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Subject Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Subject <Text style={styles.requiredStar}>*</Text>
              </Text>
              <Text style={styles.charCount} allowFontScaling={false}>
                {subject.length}/160
              </Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Delayed package delivery, Return request status"
              placeholderTextColor="#94a3b8"
              value={subject}
              onChangeText={setSubject}
              maxLength={160}
            />
          </View>

          {/* Category Selection */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel} allowFontScaling={false}>
              Inquiry Category
            </Text>
            <View style={styles.categoryChipsGrid}>
              {SUPPORT_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => setCategory(cat.id)}
                    activeOpacity={0.75}
                  >
                    <Tag
                      size={12}
                      color={isSelected ? '#ffffff' : '#6366f1'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}
                      allowFontScaling={false}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Priority Level */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel} allowFontScaling={false}>
              Priority Level
            </Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as SupportPriority[]).map((p) => {
                const isSelected = priority === p;
                const label = p.charAt(0).toUpperCase() + p.slice(1);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, isSelected && styles.priorityBtnActive]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        {
                          backgroundColor:
                            p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#10b981',
                        },
                      ]}
                    />
                    <Text
                      style={[styles.priorityBtnText, isSelected && styles.priorityBtnTextActive]}
                      allowFontScaling={false}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Detailed Message */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Detailed Description <Text style={styles.requiredStar}>*</Text>
              </Text>
              <Text style={styles.charCount} allowFontScaling={false}>
                {message.length}/2000
              </Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your issue in detail. If this relates to a specific item, mention any tracking or product details to help our team resolve it quickly."
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>

          {/* Policy reassurance note */}
          <View style={styles.reassuranceBox}>
            <ShieldCheck size={16} color="#059669" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.reassuranceText} allowFontScaling={false}>
              Your inquiry will be logged directly into our support operations dashboard. Typical response time is under 2 hours.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Send size={16} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  Submit Support Ticket
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#b91c1c',
    lineHeight: 18,
    fontWeight: '600',
  },
  attachedOrderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    padding: 12,
    marginBottom: 16,
  },
  attachedOrderIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attachedOrderInfo: {
    flex: 1,
  },
  attachedOrderLabel: {
    fontSize: 10,
    color: '#4338ca',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  attachedOrderNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e1b4b',
    marginTop: 1,
  },
  removeOrderBtn: {
    padding: 6,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#ef4444',
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  categoryChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 12,
  },
  priorityBtnActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f3ff',
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  priorityBtnTextActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 130,
  },
  reassuranceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 12,
    marginBottom: 24,
  },
  reassuranceText: {
    flex: 1,
    fontSize: 11,
    color: '#065f46',
    lineHeight: 16,
    fontWeight: '500',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
